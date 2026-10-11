# STITCH_SCREENS.md — Stitch UI Design Specs & Asset Mapping

This file indexes all visual design specifications and Stitch exports for the **Unstuck** Chrome Extension.

Visual assets, HTML implementations, and screenshots are organized inside `stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/`.

---

## 1. Design Token System

The design token system is extracted from Stitch exports (`unstuck_1/`, `unstuck_side_panel/`, `unstuck_studio/`) and codified in `src/ui/tokens.css` and `tailwind.config.ts`.

### Color Palette (Tailwind Tokens)
- **Primary:** `#4be277` (Accent green)
- **Secondary:** `#a5ee82` (Light accent green)
- **Tertiary:** `#ffb865` (Warm amber / weak topic highlight)
- **Surface / Background:**
  - `surface`: `#0b0f17`
  - `surface-container-lowest`: `#0e131d`
  - `surface-container-low`: `#141a26`
  - `surface-container`: `#182030`
  - `surface-container-high`: `#1f293d`
  - `surface-container-highest`: `#26324a`
- **Text & Content:**
  - `on-surface`: `#e2e8f0`
  - `on-surface-variant`: `#94a3b8`
  - `outline`: `#64748b`
  - `outline-variant`: `#334155`

### Typography
- **Code & Metrics:** `JetBrains Mono` (weights 400, 500, 600, 700)
- **Editorial & UI:** `IBM Plex Sans` (weights 400, 500, 600)

---

## 2. Screen & Component Catalog

| Spec ID | Name / Description | Directory Path | Core Files |
|---|---|---|---|
| **S01** | Onboarding Step 1 of 3 | `stitch_unstuck_coding_tutor_extension/unstuck_onboarding_step_1_of_3/` | `code.html`, `screen.png` |
| **S02a** | Connect Your AI (BYOK Key Setup) | `stitch_unstuck_coding_tutor_extension/unstuck_s02a_connect_your_ai/` | `code.html`, `screen.png` |
| **S02b** | Where Should I Help (Permissions) | `stitch_unstuck_coding_tutor_extension/unstuck_s02b_where_should_i_help/` | `code.html`, `screen.png` |
| **S03** | Main Side Panel (Chat Active) | `stitch_unstuck_coding_tutor_extension/unstuck_main_side_panel_chat_active/` | `code.html`, `screen.png` |
| **S03-Alt**| Chat Tab Conversation Flow | `stitch_unstuck_coding_tutor_extension/unstuck_chat_tab_conversation/` | `code.html`, `screen.png` |
| **S04** | Active Problem Session | `stitch_unstuck_coding_tutor_extension/unstuck_chrome_side_panel_active_problem_session/` | `code.html`, `screen.png` |
| **S05** | Hints Tab Active | `stitch_unstuck_coding_tutor_extension/unstuck_chrome_side_panel_hints_tab_active/` | `code.html`, `screen.png` |
| **S06** | Hints Tab Agent Loading State | `stitch_unstuck_coding_tutor_extension/unstuck_hints_tab_agent_loading_state/` | `code.html`, `screen.png` |
| **S07** | Trace Tab (Explainable AI Timeline) | `stitch_unstuck_coding_tutor_extension/unstuck_trace_tab_explainable_ai/` | `code.html`, `screen.png` |
| **S08** | Floating Nudge FAB Overlay | `stitch_unstuck_coding_tutor_extension/unstuck_floating_nudge_fab_overlay_leetcode_context/` | `code.html`, `screen.png` |
| **S09** | Extension Toolbar Popup (4 variants) | `stitch_unstuck_coding_tutor_extension/unstuck_extension_toolbar_popup_4_variants/` | `code.html`, `screen.png` |
| **S10** | Progress Tab (Mastery) | `stitch_unstuck_coding_tutor_extension/unstuck_side_panel_progress_tab/` | `code.html`, `screen.png` |
| **S11a** | Settings: AI Provider | `stitch_unstuck_coding_tutor_extension/unstuck_settings_ai_provider/` | `code.html`, `screen.png` |
| **S11b** | Settings: Nudges Policy | `stitch_unstuck_coding_tutor_extension/unstuck_settings_nudges/` | `code.html`, `screen.png` |
| **S11c** | Settings: Privacy & Data | `stitch_unstuck_coding_tutor_extension/unstuck_settings_privacy_data/` | `code.html`, `screen.png` |
| **S12** | Problem Solved Verdict Accepted | `stitch_unstuck_coding_tutor_extension/unstuck_problem_solved_verdict_accepted/` | `code.html`, `screen.png` |
| **S13.1** | Error: No API Key | `stitch_unstuck_coding_tutor_extension/unstuck_state_1_no_api_key/` | `code.html`, `screen.png` |
| **S13.2** | Error: Offline | `stitch_unstuck_coding_tutor_extension/unstuck_state_2_offline/` | `code.html`, `screen.png` |
| **S13.3** | Error: Rate Limited (429) | `stitch_unstuck_coding_tutor_extension/unstuck_state_3_rate_limited/` | `code.html`, `screen.png` |
| **S13.4** | Error: AI Timeout / Error | `stitch_unstuck_coding_tutor_extension/unstuck_state_4_ai_error_timeout/` | `code.html`, `screen.png` |
| **S13.5** | Error: Can't Run Here (Restricted) | `stitch_unstuck_coding_tutor_extension/unstuck_state_5_can_t_run_here/` | `code.html`, `screen.png` |
| **S14** | Contextual Side Panel States | `stitch_unstuck_coding_tutor_extension/unstuck_contextual_side_panel_states/` | `code.html`, `screen.png` |
