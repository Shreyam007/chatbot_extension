import fs from 'fs';
import path from 'path';

const hookPath = path.join('.git', 'hooks', 'pre-commit');
const hookDir = path.dirname(hookPath);

if (fs.existsSync('.git')) {
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }
  const hookScript = `#!/bin/sh\nnode scripts/scan-secrets.mjs\n`;
  try {
    fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
    console.log('[Setup] Installed git pre-commit hook for secret scanning.');
  } catch (err) {
    console.warn('[Setup] Could not write pre-commit hook:', err instanceof Error ? err.message : String(err));
  }
}
