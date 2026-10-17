# Unstuck — Proactive, Explainable AI Coding Tutor

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](#)
[![React](https://img.shields.io/badge/React-18-blue.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Unit Tests](https://img.shields.io/badge/Tests-415%20Passing-brightgreen.svg)](#)
[![Zero-Error Gate](https://img.shields.io/badge/Zero--Error%20Gate-21%2F21%20Passing-brightgreen.svg)](#)

> **Unstuck** is an open-source, local-first Chrome extension that acts as a proactive, pedagogical coding tutor for competitive programming, documentation, and technical web reading.
> Rather than functioning as a code-generating chatbot that spoils solutions, Unstuck passively monitors cognitive struggle, decides when an intervention is justified, and dispenses structured, multi-level hints anchored strictly in problem statements and page context.

---

## Key Features

1. **Passive Struggle Detection (Zero Keylogging):**
   - Monitors dwell time, scroll pauses, code edit churn, and wrong submission verdicts without capturing keystroke streams.
   - Calculates real-time stuck probability $P(\text{stuck})$ locally inside the browser.

2. **Contextual Bandit Intervention Policy:**
   - Evaluates whether offering a nudge is worth the cognitive interruption cost.
   - Uses an $\epsilon$-greedy bandit with Bayesian prior decay to adapt to individual user dismissal patterns over time.

3. **4-Tier Pedagogical Scaffolding Ladder:**
   - **Level 1 (Direction / Pointer):** High-level conceptual nudge anchored in problem statement or article section. Zero code.
   - **Level 2 (Approach / Explain Simply):** Algorithmic pattern or plain-English conceptual breakdown. Zero code.
   - **Level 3 (Pseudocode / Worked Example):** Structural template, logic outline, or concrete practical analogy.
   - **Level 4 (Guarded Solution / Full Explanation):** Complete implementation or in-depth synthesis protected by an explicit double-confirmation modal.

4. **Multi-Agent Critic & Grounding Guardrails:**
   - Every candidate hint is audited by an independent Critic agent before delivery.
   - Inspects for code leakage at L1/L2, verifies statement grounding, and asserts topic relevance. Falls back to deterministic safe hints if verification fails.

5. **Page-Aware Intelligence & Hardened Adapters (v1.0.9 "PAGE-AWARE"):**
   - Canonical `PageProfile` taxonomy driving dynamic context metadata, prompt scaffolds, and responsive empty states without overfitting tokens.
   - Dedicated Wikipedia adapter extracting structured lead, infobox facts, and heading-chunked sections while cleanly removing citations (`[1]`), reference lists, and navboxes.
   - 44-fixture real-DOM test matrix covering competitive programming, technical articles, and documentation pages.
   - Text highlighter utilizing the CSS Custom Highlight API (`::highlight`), auto-scrolling, and automatic `<details>` / accordion expansion.
   - Multi-tab tracking with per-tab conversation isolation, prompt recovery on preview cancellation, and synchronous user-gesture token retention for sidepanel open requests.
   - Responsive hints stepper with full text wrapping preventing overflow down to 320px viewports.

6. **Explainability & Telemetry Audit (Trace Tab):**
   - Full glassbox audit trail displaying each pipeline step: generator latency, critic approval verdict, confidence scores, retrieved BM25 sections, and token usage.

7. **Bayesian Knowledge Tracing (Progress Tab):**
   - Calibrates topic mastery across DSA categories (Arrays, Dynamic Programming, Graphs, etc.) using two-state BKT equations (skipped on generic non-programming pages).

8. **Fair-Play Contest Protection:**
   - Automatically detects live contest URLs on LeetCode (`/contest/`) and Codeforces (`/contest/`).
   - Completely silences content script overlays and suspends all model generation requests.

9. **Zero-Backend Privacy (BYOK):**
   - 100% client-side architecture. Your key is stored only on this device (`chrome.storage.local`) and sent only to Google's Gemini API with your requests. We run no servers.

---

## Visual Walkthrough

| Onboarding & BYOK Setup | Pedagogical Hints Ladder | Explainable AI Trace Tab |
|---|---|---|
| ![Onboarding Setup](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_onboarding_step_1_of_3/screen.png) | ![Hints Stepper](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_chrome_side_panel_hints_tab_active/screen.png) | ![Trace Timeline](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_trace_tab_explainable_ai/screen.png) |

| Floating Nudge Overlay | Topic Progress (BKT Mastery) | Privacy Data Transparency |
|---|---|---|
| ![Floating Nudge](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_floating_nudge_fab_overlay_leetcode_context/screen.png) | ![Mastery Progress](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_side_panel_progress_tab/screen.png) | ![Privacy Settings](stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/unstuck_settings_privacy_data/screen.png) |

---

## System Requirements

- **Runtime:** Google Chrome or Chromium-based browser (v114+ recommended for Chrome Side Panel API support).
- **Build Tools:** Node.js `>= 20.0.0`, npm `>= 10.0.0`.
- **Operating System:** Windows, macOS, or Linux.

---

## Installation & Setup

### 1. Build from Source
```bash
# Clone repository
git clone https://github.com/Shreyam007/chatbot_extension.git
cd chatbot_extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Build production extension package
npm run build
```

The unpacked extension files are output to `.output/chrome-mv3`.

### 2. Load Extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** in the top-left toolbar.
4. Select the `.output/chrome-mv3` folder inside the cloned project.
5. The **Unstuck** icon will appear in your Chrome toolbar.

### 3. Connect Your Gemini API Key (BYOK)
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Click the Unstuck toolbar popup icon and select **Settings** (or open the onboarding wizard).
3. Paste your API key into the **AI Provider** tab.
4. Click **Test API Key**. Upon successful validation, the key is saved directly into `chrome.storage.local`.

---

## Demo Mode

For evaluation and testing without waiting for standard 15-minute cooldown timers, enable **Demo Mode**:
1. Open **Options** (`chrome-extension://<id>/options.html#advanced`) or inspect Settings.
2. Toggle **Demo Mode (Fast Cooldowns)** to **ON**.
3. When enabled:
   - Dwell detection threshold shortens from 5 minutes to 20 seconds.
   - Nudge cooldown shortens to 20 seconds.
   - Distinct badges (`DEMO (20s)`) appear in the Side Panel header and toolbar popup.

---


## Privacy Summary: What is Sent to the AI

Unstuck adheres to strict client-side data minimization:

| Field | Sent to Gemini? | Purpose / Justification |
|---|---|---|
| **Problem Title & Slug** | **Yes** | Anchors the tutor to the specific problem context. |
| **Problem Statement Text** | **Yes** | Allows grounding verification and topic extraction. |
| **Generic Web Page Text (Universal Mode)** | **Opt-in per site** | Sanitized readability excerpt or top BM25 sections. Preview modal allows editing or omitting before sending. |
| **Detected Content Type / Tags** | **Yes** | Calibrates hints to programming vs documentation vs article. |
| **Current Target Hint Level** | **Yes** | Enforces pedagogical scaffolding tier (L1 to L4). |
| **User Code Editor Buffer** | **Optional** (Default: OFF) | Only included on coding sites if the user explicitly enables "Include my code" consent in settings. Zero form inputs/textareas read on generic sites. |
| **Keystroke Streams / Timestamps** | **NO** | Never collected or transmitted. |
| **Passwords / Sensitive Form Data** | **NO** | Sensitive-page guardrail halts extraction entirely on login/payment pages. |
| **Browsing History / Other Tabs** | **NO** | Unstuck only executes on explicitly allowed or user-activated origins. |
| **API Key** | **Direct to Google** | Communicates directly with `generativelanguage.googleapis.com` via HTTPS. |

Users can view audit metrics, export their complete history as JSON/CSV/Markdown, or execute a complete cryptographically clean wipe of all IndexedDB and Chrome Storage records at any time.

---

## Project Structure

```
├── assets/                 # Vector logo source and rasterized icons
├── docs/                   # Engineering specs, architecture, permissions, and defense notes
│   ├── ARCHITECTURE.md     # Deep architecture, multi-agent graphs, message bus
│   ├── DECISIONS.md        # Architecture Decision Records (ADRs 1–18)
│   ├── EDGE_CASES.md       # Edge cases catalog (65 automated, 2 manual)
│   ├── EVALUATION.md       # Offline Critic benchmark and harness methodology
│   ├── MANUAL_QA.md        # Comprehensive real-Chrome manual QA script (v1.0.4)
│   ├── PERMISSIONS.md      # Manifest V3 permission justifications (least privilege)
│   ├── PRIVACY.md          # Plain-language privacy disclosure (sensitive guardrails)
│   └── VIVA_NOTES.md       # 5-minute live demo script and 35+ Q&A viva defense
├── entrypoints/            # WXT extension entrypoints (background, content, popup, sidepanel, options)
├── public/                 # Static extension assets (icons, manifest fixtures)
├── scripts/                # Benchmark, packaging, and credential scanning utilities
├── src/
│   ├── background/         # Service worker, multi-agent graph, bandit planner, BKT mastery
│   ├── content/            # Signal collectors, DOM adapters, Readability extractor, Shadow DOM overlay
│   │   ├── adapters/       # LeetCode, Codeforces, and Generic adapters
│   │   └── extractor/      # Readability heuristics, classifier, sensitive form scanner
│   ├── options/            # Settings dashboard (Provider, Nudges, Sites, Privacy, Advanced)
│   ├── popup/              # Toolbar popup UI (Universal Mode enablement, telemetry overview)
│   ├── shared/             # Zod schemas, typed message bus, BM25 retrieval, permissions
│   ├── sidepanel/          # Native Side Panel app (Hints, Chat, Trace, Progress, SendPreviewModal)
│   └── ui/                 # Design token system, ErrorBoundary, components
└── tests/
    ├── e2e/                # Playwright E2E suites (10 full scenarios including Universal Mode)
    ├── fixtures/           # 44 real-world HTML test fixtures (Wikipedia, LeetCode, Codeforces, MDN, blogs, auth)
    └── unit/               # Vitest unit test suite (58 test files, 417 tests)
```

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run compile` | Runs TypeScript typechecker (`tsc --noEmit`). |
| `npm run lint` | Runs ESLint across all source and test files. |
| `npm test` | Runs the complete Vitest unit test suite (58 files, 417 tests). |
| `npm run verify:errors` | Runs Playwright Zero-Error verification suite across 21 real-world scenarios. |
| `npm run eval:wikipedia` | Evaluates Wikipedia article section extraction, BM25 retrieval, and citation scrubbing. |
| `npm run test:e2e` | Runs Playwright E2E test scenarios in Chromium. |
| `npm run build` | Builds the production extension package using WXT + Vite (sourcemaps disabled). |
| `npm run zip` | Packages `.output/chrome-mv3` into `.output/unstuck-1.0.9-chrome.zip`. |
| `npm run eval` | Executes the offline Critic verification benchmark across 15 DSA problems. |
| `npm run eval:live` | Runs live evaluation against the active Google Gemini API. |
| `npm run security:scan`| Audits repository and git history for accidentally staged credentials. |

---

## Honest Limitations

1. **Behavioral Proxy for Intent:** Dwell time and code churn are heuristic proxies for cognitive struggle. A user pausing to consult a textbook may look identical to a user daydreaming.
2. **Provider Constraints:** Generative hint generation depends on Google Gemini availability and is subject to provider rate limits (HTTP 429) and network latency.
3. **Synthetic Benchmarks vs. Classroom Studies:** Benchmark results demonstrate algorithmic compliance and critic filtering in synthetic environments, not a longitudinal human learning study.
4. **Verification Boundary Declaration:** Automated verification guarantees that all 21 scenarios pass with 0 warnings, 0 errors, and an empty allowlist under headless Chromium with schema-valid contract mocks. Live external Gemini API calls in production, manual QA in Brave browser, and longitudinal empirical user studies are **NOT VERIFIED** in this automated gate and must be evaluated separately in live human testing environments.

---

## Troubleshooting & Diagnostics

- **Page-Aware Panel & Dynamic Tracking (v1.0.8):** The Side Panel automatically tracks the active browser tab, switching conversation history and context tags seamlessly without cross-tab contamination. Non-coding pages (e.g. Wikipedia articles, documentation) present clean reading chips and omit coding hint levels.
- **System Health & Recent Diagnostics (v1.0.7):** Open **Options > Advanced** to inspect the live 50-entry error ring buffer. Click **Copy Diagnostics to Clipboard** to copy sanitized system state and logs directly for bug reports.
- **Zero-Error Hardening (v1.0.7):** Handled operational states (offline network, Gemini 429 rate limits, invalid keys, non-problem pages, contest mode, and user dismissals) are classified as `info` or `debug` logs, ensuring zero spurious warnings or unhandled rejections.
- **Invalid API Key (S13.1):** Verify that your API key is active in [Google AI Studio](https://aistudio.google.com/) and that the Gemini API is enabled for your project.
- **Quota Exceeded (HTTP 429 / S13.3):**
  - **Per-Minute Limit (15 RPM):** The extension automatically queues requests through a token bucket rate-limiter and displays a live holding countdown.
  - **Daily Limit Exhaustion:** Free-tier keys have strict daily limits. If exhausted, Unstuck displays "Daily Quota Exhausted" and allows switching models in Options or checking usage in Google AI Studio without wasting quota on futile retries.
  - **Low-Quota Mode:** Kept ON by default in Settings (`lowQuotaMode: true`), capping the multi-agent graph to max 2 LLM calls per hint and skipping redundant LLM critic judges when deterministic leak and grounding checks pass.
- **Floating Star Button (FAB) Click on LeetCode:** Clicking the FAB opens the Unstuck Side Panel directly or displays an in-page tooltip fallback ("Click the Unstuck toolbar icon to open the panel"). You can also press Enter/Space or right-click the button for snooze and pause shortcuts.
- **Why No Nudge Yet?:** Open the Unstuck toolbar popup to view the live "Why no nudge yet?" diagnostic box explaining the exact pipeline decision (e.g., active dwell time, cooldown remaining, contest mode, or bandit pacing).
- **Console / Extension Error Logs:** As of v1.0.5, operational errors are serialized cleanly (`serializeLogData`), eliminating ambiguous `[object Object]` entries in browser extension logs.
- **Context Invalidation After Reload:** If you reload the extension in `chrome://extensions`, refresh open LeetCode/Codeforces problem tabs to reconnect content script communication channels. Content scripts now auto-destroy listeners on invalidation.

---

## License

This project is licensed under the [MIT License](LICENSE) — Copyright © 2026 Shreyam Pandey.
