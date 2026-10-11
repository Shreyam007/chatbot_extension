---
name: Unstuck Side Panel
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
    fontSize: 1rem
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
    lineHeight: 1.375rem
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
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

This design system delivers a high-density, low-glare companion interface specifically optimized for the Chrome Side Panel environment. Operating beside active code editors, documentation, and browser developer tools, the system avoids visual competition and cognitive strain during deep-work debugging sessions.

### Aesthetic Foundation
- **Developer-Tool Precision:** High-information density with deterministic spacing, clear state differentiation, and zero ornamental distraction.
- **Low-Glare Dark Ergonomics:** Designed for OLED and low-light environments, using deep slate-navy tones rather than harsh absolute black to maintain edge perception without ocular fatigue.
- **Intentional Contrast Hierarchy:** Structural frames remain muted, reserving vivid spectral color exclusively for status, code tokens, and affirmative execution triggers.

## Colors

The palette relies on a tonal hierarchy built from slate-navy values to ensure high readability and minimal ambient glow.

### Surfaces & Foundations
- **Canvas / Background (`#0F172A`):** The primary view container for the side panel shell.
- **Surface Level 1 (`#1B2336`):** Applied to cards, list items, and collapsible containers.
- **Surface Level 2 / Muted Surface (`#272F42`):** Applied to nested panels, code blocks, input fills, and hover overlays.
- **Structural Border (`rgba(71, 85, 105, 0.4)`):** Muted structural separator derived from `#475569` with reduced opacity to prevent hard gridlines.

### Typography & Content
- **Text Primary (`#F8FAFC`):** Primary headings, active values, and primary UI copy.
- **Text Secondary (`#94A3B8`):** Meta properties, descriptive labels, and inactive states.
- **Text on Accent (`#0F172A`):** High-contrast dark typography strictly paired with `#22C55E`.

### System & State Roles
- **Primary / Accent (`#22C55E`):** Action items, terminal success output, and affirmative actions.
- **Info (`#38BDF8`):** External documentation links, diagnostic tooltips, and inspection states.
- **Warning / Stuck (`#F59E0B`):** Blocked tasks, warning diagnostics, and attention-required states.
- **Destructive (`#EF4444`):** Terminations, cache resets, and critical errors.

### Accessibility & Interaction
- **Focus Ring:** `2px solid #FFFFFF` with a `2px` offset (`outline-offset: 2px`) on all focusable interactive controls.

## Typography

The typography implements a dual-typeface strategy to enforce clarity between system copy and technical telemetry:

- **JetBrains Mono:** Reserved for panel headers, code snippets, stack traces, counters, keyboard shortcut combinations, and metadata tags.
- **IBM Plex Sans:** Utilized across UI prose, form inputs, tooltips, and guidance explanations to ensure fast horizontal scanning.
- **Scale Compactness:** Designed for high density within constrained horizontal widths (typically 320px–420px in Chrome's Side Panel). Font sizes cap at 20px (`1.25rem`) to preserve screen real estate.

## Layout & Spacing

The Chrome Side Panel operates in narrow, horizontally constrained viewports. The layout system optimizes space through a vertical stack model with single-column layouts and fluid flexbox grids.

### Base Rhythm
- **8px Grid Standard:** All vertical padding, row gaps, and container heights scale in multiples of `8px` (`0.5rem`), with a half-step `4px` (`0.25rem`) token reserved for tight chip padding and inline badge gaps.
- **Side Panel Canvas Constraints:** Side margins are locked to `0.75rem` (`12px`) to maximize horizontal content room while maintaining separation from native browser scrollbars and panel edges.
- **Reflow & Scrolling:** Content is restricted to single-column stacking with vertical scrolling only. Horizontal overflowing within code segments is resolved via contained horizontal scrolling panes.

## Elevation & Depth

To eliminate muddy gradients and preserve panel performance within the browser process, elevation relies strictly on **tonal stepping** and **crisp translucent borders** rather than diffuse drop shadows.

### Tonal Hierarchy
1. **Level 0 (Canvas):** `#0F172A` (Base panel background).
2. **Level 1 (Card / Container):** `#1B2336` bounded by `1px solid rgba(71, 85, 105, 0.4)`.
3. **Level 2 (Active / Raised Item):** `#272F42` bounded by `1px solid rgba(71, 85, 105, 0.6)`.

### Overlays & Menus
Floating menus, tooltips, and context overlays utilize `#1B2336` with a crisp `1px solid #475569` border and a directional shadow: `0 4px 12px rgba(0, 0, 0, 0.45)`.

## Shapes

The interface balances modern rounded conventions with the structural geometry of code environments.

### Radius Assignments
- **Cards & Primary Blocks:** `12px` border radius (`rounded-lg` level) to clearly isolate grouped content.
- **Buttons, Form Inputs & Selectors:** `8px` border radius for tactile touch and pointer targets.
- **Pills, Badges & Status Chips:** `999px` fully rounded radius to differentiate operational metadata from interactive buttons.
- **Code Panes & Inset Terminals:** `8px` radius to nest cleanly inside `12px` parent cards with uniform padding.

## Components

### Buttons
- **Primary / Action:** Solid `#22C55E` fill with `#0F172A` text (Font: JetBrains Mono Medium, 12px). Border-radius: `8px`. Hover: `#16A34A`. Active: `#15803D`.
- **Secondary:** Surface fill `#1B2336`, border `1px solid rgba(71, 85, 105, 0.4)`, text `#F8FAFC`. Hover: Surface fill `#272F42`, border `rgba(71, 85, 105, 0.7)`.
- **Destructive:** Border `1px solid rgba(239, 68, 68, 0.4)`, text `#EF4444`, background transparent. Hover: Background `rgba(239, 68, 68, 0.1)`.
- **Focus State:** Universal `outline: 2px solid #FFFFFF; outline-offset: 2px;` triggered on keyboard navigation.

### Chips & Badges
- **Shape:** Height 20px, border-radius `999px`, padding `2px 8px`. Typography: JetBrains Mono 11px (`label-sm`).
- **Warning ("Stuck"):** Background `rgba(245, 158, 11, 0.15)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.3)`.
- **Info:** Background `rgba(56, 189, 248, 0.15)`, text `#38BDF8`, border `1px solid rgba(56, 189, 248, 0.3)`.
- **Neutral:** Background `#272F42`, text `#94A3B8`, border `1px solid rgba(71, 85, 105, 0.3)`.

### Input Fields
- **Background:** `#1B2336`, text `#F8FAFC`, placeholder `#94A3B8`.
- **Border:** `1px solid rgba(71, 85, 105, 0.4)`, border-radius `8px`.
- **State:** Focus applies background `#0F172A`, border `1px solid #38BDF8`, and the system `2px #FFFFFF` focus outline.

### Cards
- **Structure:** Background `#1B2336`, border `1px solid rgba(71, 85, 105, 0.4)`, border-radius `12px`, padding `12px`.
- **Interactive Variant:** Transition border color to `#94A3B8` and background to `#272F42` on hover.

### Lists & Row Items
- **Divider:** Divided via `1px solid rgba(71, 85, 105, 0.2)`. Padding `8px 0`.
- **Row Hover:** Transitions row background to `rgba(39, 47, 66, 0.5)` with `4px` corner rounding for rapid scanning.

### Checkboxes & Radios
- **Unchecked:** Background `#0F172A`, border `1.5px solid #475569`, dimensions `16x16px`. Radius: Checkbox `4px`, Radio `50%`.
- **Checked:** Background `#22C55E`, border `1.5px solid #22C55E`, checkmark glyph in `#0F172A`.

### Code Blocks & Telemetry Snippets
- **Container:** Background `#0F172A`, border `1px solid rgba(71, 85, 105, 0.3)`, border-radius `8px`, padding `8px 12px`.
- **Type:** JetBrains Mono 12px, line-height 16px, text `#F8FAFC`, scrollbar hidden until hovered.