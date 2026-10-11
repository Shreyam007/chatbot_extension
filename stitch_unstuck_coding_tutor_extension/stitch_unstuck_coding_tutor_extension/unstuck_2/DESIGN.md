---
name: Unstuck
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
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.375rem
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '600'
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
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-focus, precision-engineered companion for developers and technical learners. Engineered specifically for the Chrome extension side-panel environment, the visual language balances the ruthless utility of terminal-grade developer tools with the clarity and patience of an expert mentor.

The aesthetic blends **Dark-Mode Developer Minimalism** with refined **Tactile Structuralism**. The interface rejects superfluous ornamental gradients and loud glow effects in favor of crisp typography, subtle tonal depth, low-contrast structural dividers, and purposeful status accents. 

Every pixel targets a state of cognitive flow:
- **Calm Authority:** A muted, deep slate canvas that recedes into the periphery while developers inspect code, read documentation, or write scripts in their primary workspace.
- **Instant Triage:** Status-driven color feedback (green for working solutions, amber for stumbling blocks, red for compiler breaks) provides instant semantic clarity without visual fatigue.
- **Compact Precision:** Dense horizontal space efficiency, zero loose air, and razor-sharp typographic hierarchy designed for standard 380px to 420px viewport constraints.

## Colors

The palette is anchored by deep blue-slate values, calibrated specifically for prolonged visual stamina and high contrast readability on OLED and standard displays.

### Foundation & Surfaces
- **Background (`#0F172A`):** The foundational canvas. Deep, calm slate providing maximum contrast for syntax tokens.
- **Surface / Card (`#1B2336`):** The primary container level for code blocks, message responses, and learning modules.
- **Muted Surface / Interactive Low (`#272F42`):** Used for hover states, nested code callouts, auxiliary controls, and tab rails.
- **Border & Dividers (`#475569` with 20%–30% alpha):** Structural containment lines that maintain structural grid integrity without breaking scan-path focus.

### Typography & Content
- **Primary Text (`#F8FAFC`):** Pure readability for headlines, user inputs, and prominent code identifiers.
- **Secondary Text (`#94A3B8`):** Subdued contrast for metadata, explanations, line numbers, and helper hints.

### Accents & Status
- **Accent / Primary CTA (`#22C55E`):** Bright emerald action signal. High-energy resolution indicator. Any text on top of this accent strictly uses `#0F172A` for absolute legibility.
- **Destructive / Error (`#EF4444`):** Strict syntax errors, failed test triggers, and clear/reset actions.
- **Warning / Stuck State (`#F59E0B`):** Pedagogical friction indicator—used when the AI detects logic bottlenecks, algorithmic pitfalls, or incomplete assumptions.
- **Info / Hint (`#38BDF8`):** Documentation cross-references, deep-dive tooltips, and informational tags.

### Focus Accessibility
- **Focus Ring:** `#FFFFFF` 2px solid with a 2px offset applied globally across keyboard-navigable elements.

## Typography

The dual-typographic pairing serves strict functional delineation:

1. **JetBrains Mono (Technical / Structured):** Used for headlines, code snippets, tokens, metadata badges, step indices, and telemetry figures. It gives the product an authentic terminal rhythm while maintaining readability at micro sizes.
2. **IBM Plex Sans (Prose / Utility):** Used for explanatory explanations, interactive form labels, conversational chat bubbles, and interactive controls. Its grotesque humanist construction prevents mechanical fatigue over longer reading sessions.

Scale adjustments account for the persistent narrow layout (380px–420px) of side-panels: headings stay tight (`1.25rem` maximum) to avoid awkward word wraps and preserve vertical line real estate for code inspection.

## Layout & Spacing

The layout philosophy is built around a single-column **Constrained Fluid Stack** optimized for the standard Chrome Side Panel width (defaulting to 400px, responsive between 320px and 560px), as well as a full-page developer showcase canvas.

- **Base Rhythm:** A strict 4px/8px incremental scale governs all elements.
- **Vertical Density:** Dense vertical stacking is prioritized over excessive white space. Content gutters are set to `0.75rem` (12px) and side canvas margins are locked to `1rem` (16px) to maximize real-estate for horizontal code expressions without triggering horizontal overflow bars.
- **Scroll Enclosure:** Layout regions employ pinned header/footer toolbars with isolated interior scroll areas for chat threads and reference walkthroughs.
- **Docked Controls:** The primary query input and tutor prompt bar remain anchored at the bottom edge with a fixed internal inset of `0.75rem`.

## Elevation & Depth

Visual hierarchy does not use soft drop shadows or artificial skeuomorphic lighting. Instead, elevation is communicated exclusively through **Tonal Stacking** paired with **Low-Opacity Hairline Borders**.

- **Canvas (Level 0):** `#0F172A` — Default side-panel shell.
- **Surface (Level 1):** `#1B2336` bounded by 1px solid `rgba(71, 85, 105, 0.25)` — Message cards, code containers, diagnostic summaries.
- **Raised Interactive (Level 2):** `#272F42` bounded by 1px solid `rgba(71, 85, 105, 0.4)` — Active hover triggers, dropdown menus, focused input zones, and floating action prompts.
- **Overlay & Popovers:** `#1B2336` surface overlay paired with a precise ambient perimeter blur (`0 10px 25px -5px rgba(0, 0, 0, 0.5)`), bordered by 1px solid `rgba(71, 85, 105, 0.45)` for separation over dense code content.

## Shapes

The geometric taxonomy reflects deliberate ergonomic scaling:

- **Large Structural Containers & Cards (`12px` / `rounded-lg`):** Chat response containers, code view frames, and diagnostic panels. Soft enough to humanize learning interactions, yet structured enough to align with dense IDE layouts.
- **Interactive Controls (`8px` / default radius):** Primary buttons, input boxes, drop targets, and segmented code toggles.
- **Badges, Status Indicators, & Chips (`999px` / pill):** Syntax category badges, execution time tokens, and active tutor state pills (e.g., "Stuck at Step 3").
- **Icon Enclosures (`6px`):** Inline action icon buttons (copy code, replay execution, explain line).

## Components

### Buttons
- **Primary CTA:** Background `#22C55E`, text `#0F172A` (weight: 600, IBM Plex Sans), 8px border radius, padding `8px 16px`. Hover state lightens background to `#4ADE80`. Active state scales subtly (98%).
- **Secondary / Surface Action:** Background `#272F42`, text `#F8FAFC`, border 1px solid `rgba(71, 85, 105, 0.3)`. Hover state triggers border `rgba(71, 85, 105, 0.6)`.
- **Ghost Utility:** Transparent background, text `#94A3B8`. Hover background `rgba(39, 47, 66, 0.5)`, text `#F8FAFC`.
- **Keyboard Shortcut Affordance:** Small monospaced kbd badge (`JetBrains Mono`, 10px, background `#0F172A`, border 1px solid `#475569`, padding `2px 4px`).

### Cards & Code Blocks
- **Card Shell:** Background `#1B2336`, 12px corner radius, 1px perimeter border of `rgba(71, 85, 105, 0.25)`, padding `12px 14px`.
- **Code Wrapper:** Embedded inside card with background `#0F172A`, 8px corner radius, 1px border `rgba(71, 85, 105, 0.2)`. Features a sticky header bar displaying the language tag, file name, and an instant copy button using Lucide line icons (`Copy`, `Check`).

### Chips & Badges
- **Status Pills:** Height 22px, border radius 999px, padding `2px 8px`, typography `label-sm`.
  - *Stuck / Warning:* Background `rgba(245, 158, 11, 0.15)`, text `#F59E0B`, border 1px solid `rgba(245, 158, 11, 0.3)`.
  - *Resolved:* Background `rgba(34, 197, 94, 0.15)`, text `#22C55E`, border 1px solid `rgba(34, 197, 94, 0.3)`.
  - *Debug / Info:* Background `rgba(56, 189, 248, 0.15)`, text `#38BDF8`, border 1px solid `rgba(56, 189, 248, 0.3)`.

### Input Fields & Prompt Bar
- **Side-Panel Prompt Input:** Container background `#1B2336`, 8px border radius, 1px border `rgba(71, 85, 105, 0.3)`, text `#F8FAFC`, placeholder `#94A3B8`. 
- **Active State:** On focus, activates the global focus ring: `outline: 2px solid #FFFFFF; outline-offset: 2px;`.
- **Actions Inset:** Right-aligned inline quick-submit button and speech/code attachment trigger icons.

### Lists & Step Walkthroughs
- **Interactive Checklists:** 16px circular or rounded-checkbox (`#272F42` base, checked `#22C55E` with checkmark icon in `#0F172A`).
- **Tutor Trace Lines:** Connected step indicator lists with a 1px vertical trace line (`rgba(71, 85, 105, 0.3)`) connecting step nodes.

### Iconography
- Handled strictly via Lucide line icons with a uniform stroke width of `1.75px` and sizing locked to 14px (compact indicators) or 16px (standard navigation actions).