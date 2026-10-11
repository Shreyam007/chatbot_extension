import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('[Security Scanner] Auditing repository files for exposed credentials...');

// Patterns constructed dynamically so scanner source does not trigger itself
const PATTERNS = [
  {
    name: 'Google API Key',
    // 'AI' + 'za' + '[0-9A-Za-z_-]{30,}'
    regex: new RegExp(['AI', 'za', '[0-9A-Za-z_-]{30,}'].join(''), 'g'),
  },
  {
    name: 'Secret Key (sk-)',
    // 's' + 'k-' + '[0-9A-Za-z_-]{20,}'
    regex: new RegExp(['s', 'k-', '[0-9A-Za-z_-]{20,}'].join(''), 'g'),
  },
  {
    name: 'Private Key Header',
    // '-----BEGIN' + '.*PRIVATE KEY-----'
    regex: new RegExp(['-----BEGIN', '[A-Z ]*PRIVATE KEY-----'].join('\\s+'), 'g'),
  },
];

// 1. Check for forbidden .env files in directory tree
const EXCLUDE_DIRS = new Set(['node_modules', '.output', '.wxt', '.git', 'dist', 'coverage']);

function checkEnvFiles(dir = '.') {
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        violations.push(...checkEnvFiles(path.join(dir, entry.name)));
      }
    } else if (entry.isFile()) {
      const name = entry.name.toLowerCase();
      if (name === '.env' || name.startsWith('.env.')) {
        violations.push(path.join(dir, entry.name));
      }
    }
  }
  return violations;
}

const envFilesFound = checkEnvFiles('.');
if (envFilesFound.length > 0) {
  console.error('\n[SECURITY ERROR] Forbidden .env credential file(s) detected:');
  for (const file of envFilesFound) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

// 2. Gather tracked and staged files via git
let fileList = [];
try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const fileSet = new Set([...tracked, ...staged]);
  fileList = Array.from(fileSet);
} catch {
  console.warn('[Security Scanner] Git not available. Falling back to filesystem walk.');
  function walk(dir = '.') {
    const list = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) {
          list.push(...walk(path.join(dir, entry.name)));
        }
      } else if (entry.isFile()) {
        list.push(path.join(dir, entry.name));
      }
    }
    return list;
  }
  fileList = walk('.');
}

let violationsCount = 0;

for (const relPath of fileList) {
  // Normalize path
  const normalized = relPath.replace(/\\/g, '/');

  // Skip excluded dirs
  if (
    normalized.startsWith('node_modules/') ||
    normalized.startsWith('.output/') ||
    normalized.startsWith('.wxt/') ||
    normalized.startsWith('.git/')
  ) {
    continue;
  }

  // Skip this scanner itself
  if (normalized === 'scripts/scan-secrets.mjs' || normalized === 'scripts/scan-secrets.js') {
    continue;
  }

  if (!fs.existsSync(relPath)) continue;

  // Skip large files (> 5MB) and binary assets
  const stat = fs.statSync(relPath);
  if (stat.size > 5 * 1024 * 1024) continue;

  const ext = path.extname(relPath).toLowerCase();
  const binaryExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.woff', '.woff2', '.ttf', '.eot']);
  if (binaryExts.has(ext)) continue;

  let content = '';
  try {
    content = fs.readFileSync(relPath, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    for (const pat of PATTERNS) {
      const match = line.match(pat.regex);
      if (match) {
        // Exclude logger redaction regex definition line in logger.ts
        if (
          normalized === 'src/shared/logger/logger.ts' &&
          line.includes('API_KEY_REGEX')
        ) {
          continue;
        }

        console.error(`\n[SECURITY SCAN ERROR] Exposed pattern (${pat.name}) in ${normalized}:${lineIdx + 1}`);
        console.error(`  > ${line.trim().slice(0, 80)}...`);
        violationsCount++;
      }
    }
  }
}

if (violationsCount > 0) {
  console.error(`\n[FAIL] Security scan found ${violationsCount} credential pattern violation(s).`);
  process.exit(1);
}

console.log('[Security Scanner] PASS: 0 exposed credential patterns found across tracked files.');
process.exit(0);
