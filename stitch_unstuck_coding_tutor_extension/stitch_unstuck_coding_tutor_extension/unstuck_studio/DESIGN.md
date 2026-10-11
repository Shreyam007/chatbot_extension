---
name: Unstuck Studio
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae176'
  primary: '#4be277'
  on-primary: '#003915'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#006e2f'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffba61'
  on-tertiary: '#472a00'
  tertiary-container: '#ef9900'
  on-tertiary-container: '#5c3800'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.01em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for developers caught in the friction of debugging, syntax roadblocks, and architectural stalls. Operating within the compact, high-density real estate of a browser side panel, the interface embodies the demeanor of an unflappable, hyper-competent senior engineer sitting quietly in the adjacent seat. It projects calm authority, extreme technical precision, and surgical directness.

The design philosophy blends **Developer-Tool Utilitarianism** with **Modern Linear/IDE Aesthetics**:
- **Low Glare, Zero Fatigue**: Pure night-shift ergonomics built on navy-tinted OLED foundations. Rather than using harsh, pitch-black voids, the slate-infused base softens the contrast while preserving an intense sense of depth.
- **Instrument Precision**: Information density is prized over decorative whitespace. Every visual element has a functional utility—divider rules anchor logical context switches, while monospaced labels eliminate ambiguity.
- **Proactive Empathy**: The companion communicates through unambiguous diagnostic signals—soothing success mints, alerting ambers, and clear analytical blues—cutting through cognitive overload without panicking the engineer.

## Colors

The palette is tuned specifically for low-light environments, preventing eye fatigue during late-night debugging sessions while maintaining WCAG AAA legibility for code blocks and analytical copy.

### Palette Architecture
- **Base Canvas (`#0F172A`)**: Deep navy-black void. Non-reflective, quiet, and recessionary.
- **Card / Primary Surface (`#1B2336`)**: Elevated panels, code containers, and message groupings.
- **Muted Surface (`#272F42`)**: Inset code block backgrounds, pill badges, and nested response modules.
- **Structural Borders (`#475569`)**: Crisp 1px structural outlines that define panel boundaries against diverse web page backgrounds.
- **Primary Text (`#F8FAFC`)**: High-contrast, sharp slate white for immediate scanning.
- **Secondary / Supporting Text (`#94A3B8`)**: Subdued metadata, line numbers, and timestamps.

### Functional & State Semantics
- **Accent / CTA (`#22C55E`)**: The terminal emerald. Reserved strictly for forward-progress actions, resolutions, and successful code diffs. Text overlaid on top of this color must be `#0F172A`.
- **Destructive / Error (`#EF4444`)**: Uncaught exceptions, failing test states, and terminal rollbacks.
- **Warning / Stuck (`#F59E0B`)**: Bottlenecks, infinite loops, and flagged cognitive blockers.
- **Info / Diagnostics (`#38BDF8`)**: Type signatures, runtime insights, and documentation citations.
- **Accessibility / Focus (`#FFFFFF`)**: Uncompromising 2px solid ring with a 2px offset for rapid keyboard navigation.

## Typography

Typography establishes an instant contextual separation between conversational prose and actionable execution:
- **JetBrains Mono** serves headlines, technical tokens, diagnostic status markers, keyboard shortcuts, and code payloads. It roots the tool firmly in developer culture, lending structure, clear zero-versus-O differentiation, and monospaced visual alignment.
- **IBM Plex Sans** carries instructional narrative and diagnostic explanation. Its humanist sans-serif construction is legible at small point sizes, softening dense technical explanations so the engineer can absorb context rapidly.

### Hierarchy & Rules
- All section indicators, meta tags, and diagnostic outputs must be rendered in `label-sm` with uppercase transformation and explicit tracking.
- Code blocks must use `code-md` with ligature support enabled and tab sizing locked to 2 spaces.
- Body text maintains a relaxed 1.5 line height ratio relative to its compact size to prevent tracking fatigue when the panel is constrained to narrower viewport widths.

## Layout & Spacing

Because the Chrome Extension side panel operates under tight dimensional bounds (typically 320px to 480px width), the layout uses a single-column, fluid vertical stack structured around a rigid **8px layout grid** (with a 4px sub-grid for fine internal alignment).

### Layout Model
- **Panel Boundaries**: The base canvas is pinned edge-to-edge. Outer content margins default to `0.75rem` (12px) on widths under 360px, stepping up to `1rem` (16px) when the developer widens the panel.
- **Vertical Stream**: Components follow a top-down stream. Gaps between related controls are maintained at `space-sm` (8px), while distinct contextual blocks (e.g., query input vs. AI response) separate at `space-lg` (16px).
- **Sticky Utilities**: Top-level filter bars, status breadcrumbs, and bottom input bars stick within their horizontal containers, reserving maximum viewport height for code and explanation scrolling.

## Elevation & Depth

This system avoids blurred drop shadows and physical simulation. In an OLED-optimized IDE tool, blur-based elevation creates fuzzy glare that conflicts with line-based code views. Instead, depth is achieved purely through **tonal stratification** and **crisp 1px boundary rules**.

### Tiers of Elevation
- **Level 0 (Canvas Base - `#0F172A`)**: The infinite root backdrop.
- **Level 1 (Card Container - `#1B2336`)**: Primary actionable cards, thread containers, and modal sheets. Outlined with a continuous `1px solid #475569`.
- **Level 2 (Recessed/Nested Surface - `#272F42`)**: Inline code snippets, diff inspectors, input field backgrounds, and chip surfaces. Recessed using a `1px solid rgba(71, 85, 105, 0.5)` interior stroke.
- **Level 3 (Floating Overlays & Popovers)**: Context menus, autocomplete popovers, and tooltip anchors. Styled with `#1B2336`, a crisp `1px solid #475569` outline, and an ambient, compact drop shadow: `0 4px 12px rgba(0, 0, 0, 0.45)`.

## Shapes

The geometric structure balances precision engineering with modern developer UX standards:
- **Cards & Primary Modules**: Enclosed in an exact `12px` (`0.75rem`) border radius, balancing hard screen angles with approachable grouping.
- **Interactive Buttons & Form Fields**: Styled with an exact `8px` (`0.5rem`) radius, providing a tactile, keyboard-ready look.
- **Status Chips & Filter Badges**: Completely pill-shaped (`9999px`) to immediately signal high-level categorical status and filter toggling.
- **Dividers & Strokes**: Strictly `1px` uniform thickness using `#475569`.

## Components

### Buttons
- **Primary Action (CTA)**: Surface `#22C55E`, text `#0F172A`, font `JetBrains Mono` weight 600, border-radius `8px`. Hover: `#16A34A`. Focus-visible: 2px solid `#FFFFFF` with 2px offset.
- **Secondary Action**: Surface `#1B2336`, text `#F8FAFC`, border `1px solid #475569`, border-radius `8px`. Hover: `#272F42`.
- **Ghost / Icon Button**: Surface transparent, text `#94A3B8`, border none. Hover: `#272F42`, text `#F8FAFC`.

### Chips & Badges
- **Status Chip**: Fully pill-shaped (`9999px`), padding `2px 8px`, font `JetBrains Mono` 11px uppercase.
  - *Stuck / Warning*: Background `rgba(245, 158, 11, 0.15)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.3)`.
  - *Solved / Success*: Background `rgba(34, 197, 94, 0.15)`, text `#22C55E`, border `1px solid rgba(34, 197, 94, 0.3)`.
  - *Diagnostic*: Background `rgba(56, 189, 248, 0.15)`, text `#38BDF8`, border `1px solid rgba(56, 189, 248, 0.3)`.

### Input Fields & Terminal Prompts
- Background `#272F42`, border `1px solid #475569`, border-radius `8px`, text `#F8FAFC`, placeholder `#94A3B8`.
- Monospaced indicator prompt `>` rendered in `#22C55E` on the left.
- Active focus state: border `#38BDF8` with a 2px offset outline `#FFFFFF`.

### Cards & Solution Blocks
- Background `#1B2336`, border `1px solid #475569`, border-radius `12px`, internal padding `12px`.
- Card Header: Uses `JetBrains Mono` 14px bold with secondary text right-aligned for execution timestamps.
- Separators within cards use a crisp `1px solid #475569` rule.

### Lists & Diagnostic Trees
- Dense, zero-margin vertical lists. Every row is separated by a 1px border (`#475569` at 50% opacity).
- Leading elements employ 16px geometric line icons (1.5px stroke width) aligned to the baseline of `IBM Plex Sans`.

### Form Controls (Checkboxes & Radios)
- Checkbox: `16px x 16px`, border-radius `4px`, border `1px solid #475569`, background `#0F172A`. Checked state: background `#22C55E`, stroke checkmark `#0F172A`.
- Radio: `16px x 16px`, border-radius `50%`, border `1px solid #475569`, background `#0F172A`. Selected: filled center dot `#22C55E`.

### Code Inspector & Diff Dials
- Code blocks nest within `#272F42` with an explicit top toolbar showing language syntax tag (`JetBrains Mono`, 11px) and a one-click copy button.
- Added diff lines highlight with `rgba(34, 197, 94, 0.15)` and leading `+` marker in `#22C55E`.
- Removed diff lines highlight with `rgba(239, 68, 68, 0.15)` and leading `-` marker in `#EF4444`.