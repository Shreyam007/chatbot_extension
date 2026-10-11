import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Built Manifest V3 Validation', () => {
  const manifestPath = path.resolve(__dirname, '../../.output/chrome-mv3/manifest.json');

  it('generates a valid Manifest V3 json file', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Unstuck');
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(manifest.side_panel?.default_path).toBe('sidepanel.html');
    expect(manifest.options_ui?.page).toBe('options.html');
    expect(manifest.content_scripts?.length).toBeGreaterThan(0);
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('alarms');
  });

  it('outputs all required html files in unpacked directory', () => {
    const outDir = path.resolve(__dirname, '../../.output/chrome-mv3');
    expect(fs.existsSync(path.join(outDir, 'popup.html'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'sidepanel.html'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'options.html'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'background.js'))).toBe(true);
  });
});
