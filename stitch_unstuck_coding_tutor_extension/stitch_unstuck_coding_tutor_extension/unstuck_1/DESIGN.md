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
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 19px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system powers a calm, focused, and proactive browser side-panel tutor engineered for developers and technical learners. It departs sharply from generic AI assistants that lean on decorative gradients, blurred glass overlays, and intrusive popups. Instead, it embodies the utility, poise, and density of a professional IDE toolchain combined with the quiet reassurance of an experienced peer engineer sitting nearby.

### Brand Personality & Voice
- **Calm & Low-Glare:** Designed for extended late-night debugging and deep work sessions without causing visual fatigue.
- **Pragmatic & Peer-Level:** Speaks developer-to-developer. The tone is encouraging, brief, and unpretentious, incorporating contextual, natural Hinglish idioms (e.g., *"Arre koi na, let's break it down"*, *"Still stuck? L2 unlocked"*) without sliding into slang overload or performative enthusiasm.
- **Structured Scaffolding:** Promotes self-discovery through tiered intervention levels (L1 Direction → L2 Approach → L3 Pseudocode → L4 Solution) rather than immediately dumping answers into the context.

### Visual Style
The aesthetic sits at the intersection of **Technical Minimalism** and **Terminal Precision**:
- Solid, opaque, low-reflectance surfaces with razor-sharp structural delineation.
- Zero decorative blurred blobs, glow effects, or faux-acrylic materials.
- High-contrast, deliberate typographic signaling that separates executable syntax and system telemetry from conversational guidance.

## Colors

The palette is tuned specifically for OLED-adjacent dark mode utility, balancing deep slate backgrounds with calibrated signal colors that maintain WCAG AAA/AA legibility across code blocks and telemetry feeds.

### Core Surface & Neutral Tokens
- **Background (`#0F172A`):** Deep navy-black canvas base for the browser side panel extension shell.
- **Surface / Card (`#1B2336`):** Primary elevated surface for interactive panels, hint containers, and inspection blocks.
- **Muted Surface (`#272F42`):** Embedded sub-containers, active tab strips, code background chips, and secondary hover states.
- **Border / Dividers (`#475569` with alpha rules):** Low-contrast structural borders applied as `rgba(71, 85, 105, 0.4)` on default state, scaling to `rgba(71, 85, 105, 0.8)` on hover. Never use pure white or saturated borders.
- **Text Primary (`#F8FAFC`):** Maximum readability for code, headers, and primary inputs.
- **Text Secondary (`#94A3B8`):** Muted metadata, timestamps, line numbers, and non-blocking guidance.

### Functional & Semantic Tokens
- **Accent / CTA (`#22C55E`):** Pure functional emerald. Used for active flow confirmations, hint advancement, and actionable buttons. High-contrast text on accent elements must strictly render `#0F172A` at medium/bold weight.
- **Warning / Stuck State (`#F59E0B`):** Amber signal indicating cognitive friction, compilation bottlenecks, or trigger states for hint tier elevation.
- **Destructive / Error (`#EF4444`):** Signal red for failed test runs, session resets, or critical syntax breaks.
- **Info (`#38BDF8`):** Sky blue indicator for language specs, external documentation links, and non-critical runtime context.
- **Focus Ring (`#FFFFFF`):** Unambiguous accessibility marker; renders as `2px solid #FFFFFF` with a `2px` offset (`offset-color: #0F172A`).

## Typography

The typographic system bifurcates along clear functional lines:

1. **System & Telemetry Layer (`JetBrains Mono`):** Applied to structural headers, step indicators, micro-metrics, tags, status pills, and code samples. Its tabular alignment and open counters offer unyielding clarity within constrained panel dimensions.
2. **Conversational & Editorial Layer (`IBM Plex Sans`):** Applied to explanations, hint instructions, error diagnostics, and general interactive copy. Provides comfortable long-form reading without the visual fatigue common to monospaced paragraphs.

### Execution Standards
- Side panel constraints enforce compact typographic scaling. Headings never exceed `18px`.
- Use tabular figures (`font-variant-numeric: tabular-nums`) across all timestamps, line numbers, and token counters.
- Sub-labels and meta tags use `label-sm` or `label-md` with subtle uppercase tracking for immediate at-a-glance parsing.

## Layout & Spacing

Because this system lives in a fixed-width or user-resizable browser side panel (typically 320px to 480px wide), layout rules prioritize vertical fluidity and density preservation over multi-column grids.

### Spatial Architecture
- **8px Base Metric Grid:** All padding, margins, and component heights resolve to multiples of 4px or 8px.
- **Side Panel Canvas:** Outer frame margins are locked to `margin` (`16px / 1rem`), guaranteeing sufficient breathing room from Chrome browser frames.
- **Card Enclosures:** Hint modules and interactive playgrounds maintain `space-md` (`16px`) internal padding to prevent claustrophobic code wrapping.
- **Item Rhythm:** Vertical stacking distances adhere to tight `space-sm` (`8px`) separation between consecutive items (e.g., list entries, consecutive chat turns, state steps) to maximize visible context above the fold.

## Elevation & Depth

This design system avoids drop shadows and blurred backdrops. Depth is built entirely through **tonal stratification** and **crisp 1px borders**.

### Structural Tiers
- **Tier 0 (Root Panel):** Solid `#0F172A`. Serves as the backdrop for all scroll areas.
- **Tier 1 (Surface Modules):** Solid `#1B2336` enclosed with a `1px solid rgba(71, 85, 105, 0.4)` border. Represents cards, guidance modules, and interactive shells.
- **Tier 2 (Inset Components):** Solid `#272F42` with optional `1px solid rgba(71, 85, 105, 0.2)`. Used for terminal inputs, inline code blocks, snippet runners, and collapsed steps.
- **Tier 3 (Floating Overlays / Modals):** Solid `#1B2336` surrounded by a crisp `1px solid #475569`. To maintain spatial separation without blurry drop shadows, overlays employ a tight, dark, un-blurred perimeter shadow: `0 8px 0 0 rgba(15, 23, 42, 0.8)`.

## Shapes

The shape system utilizes deliberate geometry to telegraph interactive context:

- **Cards & Step Modules:** `12px` border radius (`rounded-lg` equivalent). Creates structured, distinct modules that separate individual hints and diagnostics.
- **Buttons, Form Inputs, & Code Wrappers:** `8px` border radius. Delivers a tactile, developer-tool click target feel that aligns with standard IDE extensions.
- **Badges, Status Indicators, & Mode Pills:** Fully rounded `999px` capsule profile. Visually separates transient states (e.g., `L1 Direction`, `Flowing`) from operational card blocks.

## Components

### Buttons
- **Primary Action (Advance / Unlock):** Background `#22C55E`, text `#0F172A`, font `IBM Plex Sans` (600 weight), radius `8px`, padding `8px 16px`. Active state down-shifts opacity to `0.9` with `scale(0.98)`.
- **Secondary / Ghost:** Background `transparent`, border `1px solid #475569`, text `#F8FAFC`. Hover switches background to `#272F42`.
- **Destructive:** Background `transparent`, border `1px solid #EF4444`, text `#EF4444`. Hover fills with `rgba(239, 68, 68, 0.12)`.
- **Focus Rule:** Always displays `outline: 2px solid #FFFFFF; outline-offset: 2px;`.

### Step Indicators & Progressive Hint Tiers
- **Scaffold Progression:** Four structured tiers: `L1 Direction`, `L2 Approach`, `L3 Pseudocode`, `L4 Full Solution`.
- **Unlocked State:** Background `#1B2336`, left border accent `3px solid #22C55E`, primary text `#F8FAFC`.
- **Active / Unlocking State:** Amber indicator `#F59E0B` showing contextual prompts (e.g., *"Still stuck? L2 unlocked"*).
- **Locked State:** Background `#0F172A`, border `1px dashed #475569`, text `#94A3B8`, padlock glyph right-aligned.

### Status Indicators (Pills)
- Rendered using `JetBrains Mono` (11px, 500 weight), `4px 10px` padding, `999px` pill radius:
  - **Flowing:** `#22C55E` text and dot, background `rgba(34, 197, 94, 0.12)`.
  - **Stuck:** `#F59E0B` text and dot, background `rgba(245, 158, 11, 0.12)`.
  - **Distracted / Idle:** `#94A3B8` text and dot, background `rgba(148, 163, 184, 0.12)`.

### Code Blocks & Insets
- Contained inside `#272F42` backgrounds with an outer border `1px solid rgba(71, 85, 105, 0.5)` and `8px` corner radius.
- Language tag right-aligned using `label-sm` (`#94A3B8`). Code content rendered in `JetBrains Mono` 13px with horizontal overflow scroll and zero native scrollbar clutter.

### Inputs & Terminal Prompt
- Input fields use `#1B2336` background, `1px solid #475569`, text `#F8FAFC`, placeholder `#94A3B8`.
- Focus shifts border to `#22C55E` with zero ambient glow. Single-line terminal inputs carry a persistent `#22C55E` prompt symbol (`>_`).

### Checkboxes & Radios
- Size `16px x 16px`, radius `4px` (checkbox) or `999px` (radio).
- Default: `#1B2336` background with `1px solid #475569`. Checked: `#22C55E` fill with `#0F172A` icon checkmark.