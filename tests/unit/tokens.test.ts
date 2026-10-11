import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

describe('Design Tokens Integration', () => {
  const colors = tailwindConfig.theme?.extend?.colors as Record<string, string>;

  it('contains expected OLED-tuned background & surface palette', () => {
    expect(colors['surface']).toBe('#0b1326');
    expect(colors['surface-container']).toBe('#171f33');
    expect(colors['on-surface']).toBe('#dae2fd');
  });

  it('contains emerald primary CTA and functional tokens', () => {
    expect(colors['primary']).toBe('#4be277');
    expect(colors['primary-container']).toBe('#22c55e');
    expect(colors['secondary']).toBe('#7bd0ff');
    expect(colors['tertiary']).toBe('#ffba61');
    expect(colors['error']).toBe('#ffb4ab');
  });

  it('configures JetBrains Mono and IBM Plex Sans font families', () => {
    const fonts = tailwindConfig.theme?.extend?.fontFamily as Record<string, string[]>;
    expect(fonts['mono']).toContain('"JetBrains Mono"');
    expect(fonts['sans']).toContain('"IBM Plex Sans"');
  });
});
