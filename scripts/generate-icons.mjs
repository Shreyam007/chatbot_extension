import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.join(rootDir, 'assets', 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

const publicDir = path.join(rootDir, 'public');
const assetsIconsDir = path.join(rootDir, 'assets', 'icons');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(assetsIconsDir)) fs.mkdirSync(assetsIconsDir, { recursive: true });

// Also copy icon.svg to public/
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

const sizes = [16, 32, 48, 128];

async function generate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const size of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: ${size}px;
              height: ${size}px;
              overflow: hidden;
              background: transparent;
            }
            svg {
              width: ${size}px;
              height: ${size}px;
              display: block;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);

    const publicOut = path.join(publicDir, `icon-${size}.png`);
    const assetsOut = path.join(assetsIconsDir, `icon-${size}.png`);

    await page.screenshot({ path: publicOut, omitBackground: true });
    await page.screenshot({ path: assetsOut, omitBackground: true });

    console.log(`Generated ${size}x${size} PNG: ${publicOut}`);
  }

  await browser.close();
  console.log('All icons generated successfully.');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
