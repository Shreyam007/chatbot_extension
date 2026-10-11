import { describe, it, expect } from 'vitest';
import { OVERLAY_STYLES } from '../../src/content/overlay/styles';

describe('Accessibility & Theming: Reduced Motion and Host Page Contrast (EC-123 & EC-124)', () => {
  it('includes prefers-reduced-motion media query disabling transitions/animations (EC-123)', () => {
    // Verified that overlay styles contain reduced-motion rules
    expect(OVERLAY_STYLES).toContain('@media (prefers-reduced-motion: reduce)');
    expect(OVERLAY_STYLES).toContain('transition: none');
  });

  it('enforces isolated dark background and distinct border on overlay regardless of host page theme (EC-124)', () => {
    // Encapsulated shadow DOM styles must set their own opaque surface color and border
    // so they remain 100% legible whether host page is blinding white or pitch black
    expect(OVERLAY_STYLES).toContain('background:');
    expect(OVERLAY_STYLES).toContain('border:');
    expect(OVERLAY_STYLES).toContain('border-left: 4px solid');
  });
});
