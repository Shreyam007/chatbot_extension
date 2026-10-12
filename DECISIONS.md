# DECISIONS.md — Architecture & Engineering Log

This file records all architectural decisions, tool choices, visual mappings, and API findings for the **Unstuck** Chrome Extension (Manifest V3).

---

## 1. Design Asset & Screen Mapping (Stitch Exports)

The visual source of truth is located in `stitch_unstuck_coding_tutor_extension/stitch_unstuck_coding_tutor_extension/`. The folder structure maps 1:1 to the spec's S01–S14 screens:

| Spec ID | Name / Description | Stitch Export Directory | Core Files |
|---|---|---|---|
| **Tokens** | Core Design Tokens & System | `unstuck_1/`, `unstuck_side_panel/`, `unstuck_studio/` | `DESIGN.md` |
| **S01** | Onboarding Step 1 of 3 | `unstuck_onboarding_step_1_of_3/` | `code.html`, `screen.png` |
| **S02a** | Connect Your AI (BYOK Key Setup) | `unstuck_s02a_connect_your_ai/` | `code.html`, `screen.png` |
| **S02b** | Where Should I Help (Permissions) | `unstuck_s02b_where_should_i_help/` | `code.html`, `screen.png` |
| **S03** | Main Side Panel (Chat Active) | `unstuck_main_side_panel_chat_active/` | `code.html`, `screen.png` |
| **S03-Alt**| Chat Tab Conversation Flow | `unstuck_chat_tab_conversation/` | `code.html`, `screen.png` |
| **S04** | Active Problem Session | `unstuck_chrome_side_panel_active_problem_session/` | `code.html`, `screen.png` |
| **S05** | Hints Tab Active | `unstuck_chrome_side_panel_hints_tab_active/` | `code.html`, `screen.png` |
| **S06** | Hints Tab Agent Loading State | `unstuck_hints_tab_agent_loading_state/` | `code.html`, `screen.png` |
| **S07** | Trace Tab (Explainable AI Timeline) | `unstuck_trace_tab_explainable_ai/` | `code.html`, `screen.png` |
| **S08** | Floating Nudge FAB Overlay | `unstuck_floating_nudge_fab_overlay_leetcode_context/` | `code.html`, `screen.png` |
| **S09** | Extension Toolbar Popup (4 variants) | `unstuck_extension_toolbar_popup_4_variants/` | `code.html`, `screen.png` |
| **S10** | Progress Tab (Mastery) | `unstuck_side_panel_progress_tab/` | `code.html`, `screen.png` |
| **S11a** | Settings: AI Provider | `unstuck_settings_ai_provider/` | `code.html`, `screen.png` |
| **S11b** | Settings: Nudges Policy | `unstuck_settings_nudges/` | `code.html`, `screen.png` |
| **S11c** | Settings: Privacy & Data | `unstuck_settings_privacy_data/` | `code.html`, `screen.png` |
| **S12** | Problem Solved Verdict Accepted | `unstuck_problem_solved_verdict_accepted/` | `code.html`, `screen.png` |
| **S13.1** | Error: No API Key | `unstuck_state_1_no_api_key/` | `code.html`, `screen.png` |
| **S13.2** | Error: Offline | `unstuck_state_2_offline/` | `code.html`, `screen.png` |
| **S13.3** | Error: Rate Limited (429) | `unstuck_state_3_rate_limited/` | `code.html`, `screen.png` |
| **S13.4** | Error: AI Timeout / Error | `unstuck_state_4_ai_error_timeout/` | `code.html`, `screen.png` |
| **S13.5** | Error: Can't Run Here (Restricted) | `unstuck_state_5_can_t_run_here/` | `code.html`, `screen.png` |
| **S14** | Contextual Side Panel States | `unstuck_contextual_side_panel_states/` | `code.html`, `screen.png` |

---

## 2. Extension Build Tool Decision: WXT

**Options Evaluated:** `WXT` (`wxt@0.21.4`) vs `@crxjs/vite-plugin` (`3.0.0`).

### Findings
1. **Windows Path Normalization:** CRXJS historically and intermittently encounters path separator issues on Windows environments (`\` vs `/`), whereas WXT normalizes paths consistently across all platforms.
2. **Manifest V3 Side Panel Integration:** WXT provides first-class support for `sidepanel` entrypoints and automatically handles the `side_panel` manifest key with zero warnings.
3. **Shadow DOM Content Script UI:** In upcoming steps (Step 5 & 11), the nudge overlay must run inside an isolated Shadow DOM. WXT natively offers `createShadowRootUi` to inject Tailwind CSS into isolated shadow roots without leaking into host page DOM.
4. **Build Cleanliness:** WXT builds directly into `.output/chrome-mv3` with Vite in under 200ms with 0 manifest warnings.

**Decision:** Adopt **WXT** as the primary build framework for Unstuck.

---

## 3. Official Gemini API Model IDs

Checked against official Google AI for Developers documentation (`ai.google.dev`):

- **Default Active Model:** `gemini-2.5-flash` (recommended for low-latency coding assistance, price-performance, and structured JSON output).
- **Alternative Supported Models:** `gemini-1.5-flash`, `gemini-1.5-pro`.
- **Deprecated / Shut Down Models:** `gemini-2.0-flash` (deprecated as of June 1, 2026; do not use).
- **Rule Enforcement:** Model IDs are configurable by the user in settings, never hardcoded with assumptions.

---

## 4. Typography & Font Strategy

- **System & Telemetry Font:** `JetBrains Mono` (weights 400, 500, 600, 700) for headers, step indicators, micro-metrics, and code syntax.
- **Editorial & Conversational Font:** `IBM Plex Sans` (weights 400, 500, 600) for explanations, conversational tutor messages, and settings descriptions.
- **Loading:** Loaded via Google Fonts preconnect links in HTML entrypoints, with local system monospaced and sans-serif fallbacks.

---

## 5. Agent Graph Strategy (Plan for Step 9)

Per `ANTIGRAVITY.md` specification:
- Attempt `@langchain/langgraph` (web/JS build).
- If bundle size, service worker eval restrictions, or circular imports conflict with Manifest V3 service worker constraints, implement a lightweight typed `StateGraph` runner (nodes, conditional edges, retry loop) with identical node and edge names:
  `detector -> planner -> context_builder -> hint_generator -> critic -> deliver -> bandit_update`.

---

## 6. Message Bus Protocol & Resilience (Step 2)

- **Channel Pattern:** Two-way RPC request/response discriminated union (`type`) and one-way event broadcasts (`event`).
- **Validation:** Strict runtime parsing via Zod (`BusRequestSchema` and `BusResponseEnvelopeSchema`). Any malformed or unknown message is dropped safely and logged at `debug` level without throwing unhandled exceptions to UI layers.
- **Context Invalidation Handling (EC-003):** When the service worker restarts or the extension updates while a content script tab is open, `chrome.runtime.sendMessage` fails with `"Extension context invalidated"` or `"Receiving end does not exist"`. Both standard `Error` instances and `chrome.runtime.lastError` objects are intercepted, suppressed from console spam, and mapped to a clean user-visible reload indicator.
- **Secret Redaction (Rule 4):** All logs pass through `redactSecrets`, which scrubs Google AI keys (`AIzaSy...`) and any credential parameters before emitting to the console or the in-memory ring buffer.

---

## 7. Manifest, Permissions & Onboarding Architecture (Step 3)

- **Minimal Permissions in MV3:**
  - Base permissions: `storage`, `sidePanel`, `alarms`, `activeTab`, `scripting`.
  - Host permissions: `https://leetcode.com/*` and `https://codeforces.com/*` only.
  - Optional host permissions: `https://*/*` and `http://*/*` dynamically requested on-demand via `chrome.permissions.request({ origins: [...] })`.
- **BYOK Connection Verification Flow:**
  - Validates user-provided Gemini API keys against `https://generativelanguage.googleapis.com/v1beta/models?key=...`.
  - Confirms authentication status, fetches accessible models (`models/gemini-2.5-flash`, `models/gemini-1.5-flash`), and measures ping latency without consuming generation token quota.
  - Includes AbortController with 8-second deadline.
  - Redacts secret keys from all logs, error envelopes, and client events.
- **Tracking Consent Gating (EC-001 & EC-002):**
  - Tracking consent is strictly **OFF** by default.
  - Content scripts evaluate gating before registering any DOM mutation observers, scroll listeners, or timer accumulators.
  - If tracking is OFF or a site permission is denied, the extension runs in an explicit **Chat-only mode**, observing nothing.
- **Onboarding State Resumption:**
  - Progress (`currentStep`, `trackingEnabled`, `apiKey`, `enabledSites`, `testStatus`) persists in `chrome.storage.local` on every transition.
  - If a user closes the tab or side panel midway through setup, reopening seamlessly resumes from the exact step and inputs.

---

## 8. Storage Layer Architecture (Step 4)

- **Storage Division:**
  - `chrome.storage.local`: Settings (`SettingsSchema`), isolated API key (`apiKey`), and setup wizard state (`onboarding_state`).
  - `chrome.storage.session`: In-memory ephemeral runtime tracking (problem contexts and active signal windows per tab).
  - **IndexedDB (`idb`)**: Capped high-volume data:
    - `events` store (keyPath `id`, index `by_timestamp`): chronological event logs capped at `LIMITS.MAX_EVENT_LOG_ENTRIES` (500). Oldest entries trimmed automatically when exceeding cap.
    - `hints` store (keyPath `id`, index `by_problem`, index `by_timestamp`): graded hint delivery history.
    - `mastery` store (keyPath `topic`): topic-level Bayesian Knowledge Tracing records.
    - `bandit` store (keyPath `bucket`): contextual multi-armed bandit reward records.
- **Corrupt Record Recovery (EC-010):**
  - Every read from storage or IndexedDB is parsed with Zod.
  - If an individual record fails schema validation (e.g., malformed JSON or corrupted field), **only that specific record** resets to its default schema and is rewritten. Other records remain untouched.
- **Quota Handling & Auto-Trimming (EC-010):**
  - When IndexedDB triggers `QuotaExceededError`, `addEventLog` performs an emergency trim purging the oldest 25% of entries to free disk space before retrying the write.
- **Privacy-Preserving Export & Total Wipe:**
  - `exportAllData`: packages settings, topic mastery, bandit parameters, and event logs into a clean JSON file for user export. The user's Google AI API key is strictly omitted from the payload and JSON string (Rule 4).
  - `deleteAllData`: initiates a full reset across `chrome.storage.local`, `chrome.storage.session`, and all IndexedDB stores, re-initializing factory defaults.

---

## 9. Content Script: Site Adapters, Signal Collection & S08 Overlay (Step 5)

- **Adapter Architecture:**
  - Pluggable `PageAdapter` interface (`leetcodeAdapter`, `codeforcesAdapter`, `genericAdapter`) resolved via `resolveAdapter(url)`.
  - Extracts title, difficulty, statement text, topic tags, problem hash key (`<site>:<slug>`), and detect contest state.
  - Safe defensive DOM reading: returns `null` on broken or changed DOM (EC-021) without throwing or crashing host page.
  - Token budget cap: statement text truncated to `LIMITS.MAX_STATEMENT_CHARS` (16,000 chars, EC-024).
- **Contest Fair-Play Hard Rule (EC-031, EC-100):**
  - LeetCode detects `/contest/` in URL or ranking headers (`a[href*="/contest/ranking/"]`).
  - Codeforces detects `/standings`, `/countdown`, `#contest-state-phase`, or active contest timers.
  - Conservative rule: when contest is active, `isContest = true` and all nudges, overlays, and hint prompts are completely silenced and unmounted.
- **Monotonic Signal Collection (EC-041, EC-042, EC-043, EC-045, EC-047):**
  - **Monotonic Dwell:** Elapsed time calculated via `performance.now()` deltas to prevent system clock sleep/skew glitches (EC-043). Anomalous or negative deltas are discarded.
  - **Visibility & Focus Gating:** Pauses dwell accumulation completely when document is hidden (`visibilitychange`) or window blurred (`blur`/`focus`, EC-041).
  - **Active vs. Idle State:** User activity tracked across `keydown`, `mousedown`, `mousemove`, `touchstart`, `scroll`. If inactive for > 60,000 ms, enters `isIdle: true` and routes dwell to `idleMs` instead of `activeMs` (EC-042).
  - **Scroll Reversals:** Direction reversals tracked with an 80px accumulated distance threshold to ignore micro-scroll jitter (EC-047).
  - **Verdict Deduplication:** Wrong submissions deduplicated within a 5-second window or matching identical verdict text to avoid rapid double-counting (EC-045).
- **SPA Navigation Watcher (EC-022):**
  - Monkey-patches `history.pushState` and `history.replaceState`, listens to `popstate` and `hashchange`, with fallback interval check.
  - Emits navigation callback to reset the `SignalCollector` window, reset active state, and re-extract problem context.
- **S08 Floating Nudge & FAB Beacon (EC-027, EC-121):**
  - Injected inside `#unstuck-overlay-root` with an isolated **Shadow DOM** and encapsulated styles, preventing host page CSS or CSP bleed.
  - **State 1 (Nudge Card):** `#1B2336` surface, amber border-l-4 (`#EF9900`), lightbulb icon, UNSTUCK DETECTOR pill badge, Socratic preview badge, "Show a hint" CTA (`#22C55E`), "Not now" button, and 8-second auto-dismiss progress bar.
  - **State 2 (Compact FAB Beacon):** 40px circular button with radar pulse ring, notification dot, and spark icon.
  - Accessible keyboard dismissal: Pressing `Escape` cleanly dismisses the card and collapses to FAB (EC-121).
  - Focus preservation: Overlay does not steal input focus, allowing uninterrupted user typing (EC-063).

---

## 10. Detector: Stuck Probability Model & Logistic Calibration (Step 6)

- **Pure Deterministic Function:**
  - Implemented in `src/background/detector/model.ts` with zero asynchronous I/O and zero side effects.
  - Guarantees identical probability outputs and state classifications for identical inputs across repeated runs.
- **Model Calibration & Parameter Selection:**
  - `bias = -1.80`: Yields a baseline probability of ~14% at problem start, establishing a flowing default.
  - `w_wrong = 1.85`: Scaled logarithmically as $\ln(1 + W)$. Each additional wrong submission substantially increases stuck likelihood while damping extreme submission spam.
  - `w_dwell = 0.55`: Scaled via $\tanh(D / 10)$ to ensure dwell contribution smoothly saturates around 10–15 minutes.
  - `w_reversals = 0.35`: Scaled linearly with cap at 10 reversals.
  - `w_tabs = 0.30`: Scaled linearly with cap at 6 switches/min.
- **Corroboration Guardrails (EC-040 & EC-047):**
  - **Reading Carefully:** When wrong submissions $= 0$ and scroll reversals $\le 1$, $p_{\text{raw}}$ is capped at **0.40**, preventing long problem study from triggering premature prompts.
  - **Comparing Examples:** When wrong submissions $= 0$ and active dwell $< 3.0$ min, $p_{\text{raw}}$ is capped at **0.45**, preventing rapid scrolling while studying examples from being flagged as stuck.
- **Distracted Branch:**
  - High tab switching ($\ge 4.0$ switches/min) with low coding activity ($< 45$s) transitions the user directly to the `'distracted'` state.
- **Exponential Smoothing:**
  - $\alpha = 0.65$ smoothing prevents isolated single-event spikes from prematurely crossing thresholds while maintaining responsiveness to persistent struggle.
- **Explainability:**
  - Computes normalized percentage contributions `{ dwell, wrongSubmissions, scrollReversals, tabSwitches }` stored in the Trace record (S07).

---

## 11. Planner, Policy Gates & Contextual Bandit (Step 7)

- **Two-Phase Decision Architecture:**
  - **Phase 1: Deterministic Hard Gates (`evaluateHardGates`)**
    - Evaluates strict constraints in zero-tolerance order: consent/tracking enabled, contest fair-play (EC-100), site block list (EC-062), snooze active, quiet hours, cooldown period (EC-066), hourly nudge cap (EC-066), same-problem nudge limit, active tab check (EC-064), and non-stuck detector state gate.
    - Hard gates **CAN NEVER** be bypassed or learned away by the bandit policy.
  - **Phase 2: Expected Utility & Contextual Bandit (`selectBanditAction`)**
    - Context discretized into state buckets: `site:stuckBucket:masteryBucket` (e.g. `leetcode:high:low`).
    - Prior initialized via cold-start pseudocounts (EC-065): `{ accept: 1, dismiss: 1, ignore: 0, n: 2 }`, ensuring early exploration without bias.
    - Expected reward $Q(s) = \frac{\text{accept} \cdot 1.0 + \text{dismiss} \cdot (-1.0) + \text{ignore} \cdot (-0.5)}{n}$.
    - Expected utility formulation: $U(s) = p_{\text{stuck}} \cdot \text{helpValue} - \text{interruptionCost}$.
    - Decision policy: Nudge if $U(s) \ge 0.50$ AND $Q(s) > -0.20$.
    - $\epsilon$-greedy exploration: $\epsilon = \max(0.05, 0.20 / (1 + n / 20))$, decaying smoothly to 5% as experience grows.
- **Service Worker Restart Resilience (EC-004, Rule 6):**
  - Snooze and cooldown timers registered via `chrome.alarms` (`unstuck:snooze`, `unstuck:cooldown`) to wake the service worker reliably without hanging volatile in-memory `setTimeout` closures.
- **Simulation Validation (200 Scripted Problem Sessions):**
  - Tested across diverse user profiles (Novice, Independent, Casual) comparing the Contextual Bandit against a static threshold baseline ($p \ge 0.60$):
    - **Fixed Baseline:** 185 nudges, 89 accepts, 71 dismissals, **48.1% acceptance rate**.
    - **Contextual Bandit:** 90 nudges, 73 accepts, 13 dismissals, **81.1% acceptance rate**.
  - Demonstrates a **+33.0 percentage point gain** in acceptance precision and an **81.7% reduction in unwanted dismissals**.

---

## 12. LLM Client Architecture, Error Taxonomy & BYOK Resilience (Step 8)

- **Gemini REST Client in Service Worker (Rule 4, Rule 10):**
  - Implemented in `src/background/llm/client.ts` via direct REST calls using native `fetch` inside the background service worker only.
  - The user's API key is stored strictly in `chrome.storage.local` and never forwarded to content scripts or UI panels.
- **Structured JSON Output:**
  - Configured with `responseMimeType: "application/json"` and optional `responseSchema` for guaranteed structured responses.
  - Default temperature set to `0.2` and token output capped at `2048` tokens.
- **Error Taxonomy Mapped to Stitch S13/S14 States:**
  - `NO_KEY` / `INVALID_KEY` (400/403) $\to$ **S13.1** (Direct route to API key settings).
  - `OFFLINE` (Network dropped / `!navigator.onLine`) $\to$ **S13.2** (Offline state banner).
  - `RATE_LIMITED` (HTTP 429) $\to$ **S13.3** (Parses `Retry-After` header to drive live countdown timer).
  - `TIMEOUT` (20s AbortController deadline) / `SERVER_ERROR` (5xx) $\to$ **S13.4** (Retryable failure state).
  - `SAFETY_BLOCKED` (Google AI safety filter) $\to$ **S13.5 / EC-085** (Safety notification with fallback scaffold).
  - `MALFORMED_JSON` $\to$ **EC-084** (Single-shot repair attempt, then typed failure).
  - `ABORTED` $\to$ **EC-086** (Clean cancellation without UI error notification).
- **Single-Shot JSON Repair (EC-084):**
  - If model response syntax fails `JSON.parse`, the client triggers an automated one-shot repair prompt (`"The previous response was malformed JSON... Please fix and return ONLY valid JSON"`). If repair succeeds, valid parsed output is returned.
- **Per-Tab Request Coalescing (EC-087):**
  - Maintains `inFlightByTab` map keyed by tab ID. Duplicate rapid clicks while generation is active return the existing pending promise.
- **Strict Secret Redaction (Rule 4):**
  - All errors, headers, and logs pass through `redactSecrets`, scrubbed with `[REDACTED_API_KEY]`, preventing API key exposure even in unhandled exceptions or error boundary reports.

---

## 13. Agent Graph Architecture, Dual Critic & Safe Fallback (Step 9)

- **StateGraph Orchestrator (`src/background/graph/graph.ts`):**
  - Directed acyclic state machine with retry feedback loop:
    `context_builder` $\to$ `hint_generator` $\to$ `critic` $\to$ (`deliver` | retry `hint_generator` | `safe_fallback`).
  - Records granular run traces (`AgentRunTrace`) including node runtimes, token consumption, retry counts, and critic evaluation details.
  - Delivered hints are stored in IndexedDB `hints` store and appended to `events` log (`hint_delivered`).
- **Untrusted Page Context Demarcation (Rule 3, EC-024):**
  - All context harvested from external websites is demarcated inside `<<<UNTRUSTED_PAGE_DATA>>>` tags to thwart prompt injection and instructions embedded in problem descriptions or submissions.
  - Priority truncation strictly trims user code before problem statements when budget thresholds are exceeded (EC-029).
- **Tiered Hint Generation Prompts:**
  - **L1 (Direction):** Conceptual nudge, problem invariant or property check. Absolute prohibition of code snippets and named algorithms.
  - **L2 (Approach):** Algorithmic pattern and high-level strategy. Absolute prohibition of code snippets and function signatures.
  - **L3 (Pseudocode):** Structural pseudocode and data structure scaffold. Abstract invariants without direct language syntax.
  - **L4 (Full Solution):** Working code solution with inline pedagogical explanations, time/space complexity analysis, and invariant walkthroughs.
- **Dual Critic Leak Detection & Grounding Check (EC-090):**
  - **Deterministic Leak Detector:** Instant zero-token regex analysis detecting Markdown code blocks (```` ``` ````), programming language keywords (`def `, `function `, `#include`, `class `), variable assignments, and loop constructs. Rejects candidate immediately with detailed violation diagnostic fed back to generator.
  - **Grounding Verifier:** Verifies key entities and terms against problem description and user code via normalized token overlap. Rejects hallucinated constraints or unrelated problem references.
  - **LLM Critic Judge:** Invoked for nuanced semantic verification when candidate passes heuristic checks. If LLM judge errors or times out, safely falls back to heuristic verdict (EC-090).
- **Safe Pedagogical Fallback Node (EC-090, S14.4):**
  - Executed if hint generation repeatedly fails or critic rejects 3 consecutive attempts.
  - Emits safe conceptual scaffold with confidence clamped to $\le 0.35$, immediately surfacing the S14.4 "I'm not sure" low-confidence disclaimer banner in the UI.
- **42-Sample Critic Benchmark:**
  - Evaluated over a comprehensive suite of 42 labelled samples (12 compliant hints, 14 code/signature leaks, 8 ungrounded claims, 8 prompt injection attacks).
  - Achieved **100.0% Leak Detection Precision** (0 false negatives) and **100.0% Grounding Precision** (0 false positives).

---

## 14. Side Panel Architecture, Multi-Tab Coordination & S03-S14 States (Step 10)

- **Decomposed Modular Components (`src/sidepanel/components/`):**
  - **`Header.tsx`**: Status indicator with live pulsating watching beacon, contest mode lock pill, paused badge with toggle, settings gear, and high-density problem context bar with tags and sync status.
  - **`Navigation.tsx`**: 4-tab bar (`Chat`, `Hints`, `Trace`, `Progress`) with accessible ARIA tablist/tab roles, active indicator, and unread message counter badge.
  - **`ChatTab.tsx` (S03 / S03-Alt)**:
    - Multi-turn conversation stream with user bubbles and assistant Socratic hints.
    - S03 empty state with 3 prompt chips (`Explain this problem`, `Give me a direction`, `Check my approach`).
    - **"From the page" Citation Chips**: Clicking a quote dispatches `HIGHLIGHT_PAGE_TEXT` to the active tab's content script, smoothly scrolling to the snippet and highlighting it with a glowing pulsed border.
    - Mini-toolbar with hint disclosure level selector (`Auto L1`, `L2`, `L3`, `L4`).
  - **`HintsTab.tsx` (S05, S06)**:
    - 4-level pedagogical stepper (L1 Direct, L2 Approach, L3 Pseudo, L4 Full Solution).
    - Confidence badge with hover tooltip explaining verification confidence.
    - Critic verification badge ("Checked by Critic: No spoiler code detected").
    - Action buttons (`Next hint (L...)`, `Make it more direct`, `I solved it! 🎉`).
    - Feedback rating with thumbs down expansion into reason chips (`Too vague`, `Gave too much`, `Wrong direction`, `Other`).
    - **L4 Double Confirmation Guard**: Level 4 unlocks a confirmation card ("Guarded: Level 4 reveals the full solution code. Are you sure?") requiring explicit user confirmation before exposing working code.
    - **S06 Agent Loading Skeleton**: Pulsing placeholder with critic verification status during generation.
  - **`TraceTab.tsx` (S07)**:
    - Explainable AI telemetry summary bento: Latency, pipeline pass rate (4/4 passed), and intervention level.
    - Vertical pipeline tree with connecting gradient line across 4 agent nodes:
      1. **Detector Agent**: Stuck probability ($p = 0.78$), logistic weights, and sparkbars for dwell time (85%), scroll reversals (72%), wrong verdicts (90%), and tab switches (45%).
      2. **Planner Agent**: Utility vs interruption cost ($U = 0.82 > 0.35$), bandit state bucket, and hard gates verification.
      3. **Generator Agent**: Model ID (`gemini-2.5-flash`), token consumption, and untrusted context boundary.
      4. **Critic Agent**: Deterministic leak check, grounding text overlap (94%), and LLM judge verdict.
  - **`ProgressTab.tsx` (S10)**:
    - 3-column metrics bento: Solved this week, hints per solve, and nudge acceptance rate.
    - SVG sparkline trend across last 10 problem submissions with area gradient, trend points, and accessible data table alternative for screen readers.
    - Bayesian Knowledge Tracing topic mastery accordion with progress bars (Arrays & Hashing, Two Pointers, Binary Search, Dynamic Programming) and "Focus weak" filter toggle.
  - **`SolvedModal.tsx` (S12)**:
    - S12 hero celebration banner ("Solved. Nice.") triggered on acceptance or manual click.
    - 2x2 session metrics: Time taken, hints used, topic & structure, and mastery progress gain (+4% $\to$ 72%).
  - **`ErrorStateView.tsx` (S13.1–S13.5)**:
    - S13.1 No API Key / Invalid Key with direct Options CTA.
    - S13.2 Offline state with connection retry.
    - S13.3 HTTP 429 Rate Limited with live countdown timer.
    - S13.4 AI Timeout (20s safety deadline) / Server Error with retry.
    - S13.5 Restricted context (`chrome://` / Web Store).
  - **`ContextualStateView.tsx` (S14.1–S14.3)**:
    - S14.1 No Problem Detected with options to open chat, select text, or use full page.
    - S14.2 Contest Fairness Lock with rules explanation.
    - S14.3 Observation Paused with resume action.
- **Verification:**
  - 19/19 unit tests passing in `tests/unit/sidepanel.test.tsx`.
  - 4/4 Playwright E2E tests passing with pixel-accurate screenshots captured for all tabs and modals.

---

## 15. Nudge Overlay, Focus Safety, Snooze Mechanics & Toolbar Popup (Step 11)

- **Shadow-DOM Nudge Overlay (S08):**
  - Encapsulated inside `#unstuck-overlay-root` open shadow DOM ensuring 100% isolation from host platform CSS/CSP (EC-027).
  - 8-second countdown progress bar (`unstuck-progress-bar`) triggering automatic dismissal and dispatching an `ignore` penalty ($-0.5$) to the contextual bandit upon expiry.
  - Dismissing via Close button or `Esc` key dispatches a `dismiss` penalty ($-1.0$).
  - Accepting via "Show a hint" dispatches an `accept` reward ($+1.0$) and triggers initial L1 pedagogical hint generation.
  - Interactive snooze dropdown menu allows users to snooze nudges for 10 minutes, 1 hour, or until tomorrow (`SET_SNOOZE`), as well as permanently block nudges on the active domain (`BLOCK_SITE` / `block_site` penalty of $-2.0$).
  - Collapses into a 40px circular Floating Action Button (FAB) beacon with pulsating green glow.
- **Focus & Keystroke Safety (EC-120):**
  - All overlay elements enforce `tabindex="-1"` and prevent default on `mousedown`, guaranteeing that active code editor instances (Monaco, Ace, CodeMirror) never lose typing focus when nudges mount.
  - Keystrokes pass through untouched; only `Escape` key events are intercepted for card dismissal.
  - Header drag handle supports fluid repositioning via `pointerdown`, `pointermove`, and `pointerup` handlers.
  - Adaptive positioning algorithm detects active editor cursor coordinates and automatically flips card to top-right if cursor is in lower-right viewport.
- **Toolbar Popup Architecture (S09 — 4 Variants):**
  - **Variant 1 (Active):** Live pulsating watching beacon, platform domain pill, 3 stat tiles (Nudges, Accepted %, Hints used/left), "Open side panel" CTA (with `⌥S` badge), and "Pause for 1 hour".
  - **Variant 2 (Paused):** Paused warning indicator, elapsed vs remaining countdown progress bar, dimmed stat tiles, "Resume watching" CTA, and "Keep paused for today".
  - **Variant 3 (Unsupported):** Inactive badge, "I can't run on this page", target URL with lock icon, supported out-of-the-box platforms list (LeetCode, HackerRank, Codeforces, docs), and "Add custom domain" CTA.
  - **Variant 4 (Contest Mode):** Fair-play badge, contest active notification, contest domain pill, and integrity lock notice explaining disabled hint generation during active competitions.
  - Communicates directly with background service worker via `GET_POPUP_STATE`, `SET_PAUSED`, `SET_SNOOZE`, and `BLOCK_SITE`.
- **Verification:**
  - 16/16 unit tests passing in `tests/unit/overlay.test.ts` and `tests/unit/popup.test.tsx` (200/200 total unit tests passing).
  - 5/5 Playwright E2E tests passing, verifying real keystroke uninterrupted typing in code editor, snooze mechanics, and popup rendering.

---

## 16. Options Page & Privacy Tools Architecture (Step 12 — S11)

- **Dedicated Stitch Options Dashboard (`OptionsApp.tsx`):**
  - Complete parity with Stitch visual design (`tokens.css`, Tailwind dark palette, custom scrollbars, and JetBrains Mono / IBM Plex typography).
  - Two-column responsive architecture with sticky sidebar navigation and top auto-save status pill indicating live save timestamps.
  - Multi-tab navigation across 5 discrete interfaces:
    1. **AI & Inference (`ai`):** BYOK Gemini key configuration with password reveal/hide, clipboard copy, live Google AI Studio link, model dropdown (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`), and interactive "Test Connection" button testing endpoint latency via `TEST_API_KEY`. Also supports default hint level selection (L1 to L4).
    2. **Nudges & Policy (`nudges`):** Stuck detection sensitivity selector (Low, Medium, High), cooldown duration range slider (1 to 60m), max nudges per hour dropdown (1 to 10), quiet hours start/end scheduling, demo mode (20s thresholds), hard-locked contest auto-disable notice (EC-100), and interactive blocked problem sites list with one-click unblock actions.
    3. **Data Transparency (`transparency`):** Renders single-source-of-truth `DataTransparencyTable` auditing all 8 outbound payload fields (Problem Statement, Invariant Constraints, Topic Tags, Submission Verdict, AST Code Snippet, Telemetry, Auth Tokens, and Thread Context) and verifying that raw telemetry and tokens are never sent.
    4. **Privacy & Storage (`privacy`):** Hero security protocol card ("Everything is stored on this device"), storage statistics bento (Audit events, hints recorded, blocked domains), behavioral signal tracking and AST code editor consent toggles, JSON data backup exporter, and destructive total wipe button.
    5. **Setup Wizard (`onboarding`):** S01-S02 Onboarding Wizard view with automatic routing for fresh installs and manual re-triggering from options.
- **Typed Destructive Wipe Guard (`DeleteConfirmModal.tsx`):**
  - Irreversible action modal warning against accidental data destruction.
  - Form validation requires user to type exact string `"DELETE"` before the "Permanently Erase Everything" confirmation button activates, displaying a real-time `MATCHED` confirmation badge.
  - Calls `DELETE_ALL_DATA` via background message bus, clearing all IndexedDB namespaces (`unstuck_store_v2`), chrome local/session storage, stored API keys, and restoring factory defaults.
- **Data Transparency Matrix (`DataTransparencyTable.tsx`):**
  - Explains outbound payloads with clear categorization (Transmitted, Conditional, Local Only, Omitted, Trimmed Sliding Window).
  - Dynamically updates code context status based on `includeCodeConsent` toggle (`Allowed (User Consent)` vs `Excluded (Consent Disabled)`).
- **Zero-Leakage JSON Data Export (`exportAllData()`):**
  - Triggers client-side JSON export of all recorded events, problem contexts, hints delivered, mastery items, and bandit parameters.
  - Strictly omits `apiKey` per Rule 4 zero-leakage security guarantee.
- **Verification:**
  - 7/7 unit tests passing in `tests/unit/options.test.tsx` (207/207 total unit tests passing across 24 files).
  - 6/6 Playwright E2E suites passing in `tests/e2e/options-privacy.test.ts`, verifying full navigation, live transparency table updates, typed `"DELETE"` confirmation, and JSON export file downloads.

---

## 17. BKT-Lite Mastery Model & Weak-Topic Review Architecture (Step 13)

- **Bayesian Knowledge Tracing (BKT) Formulation (`src/background/mastery/bkt.ts`):**
  - Standard 4-parameter BKT formulation configured in `src/shared/config.ts`:
    - $P(L_0) = 0.30$ (Prior probability of knowing the concept)
    - $P(T) = 0.15$ (Probability of transit / learning after an opportunity)
    - $P(S) = 0.10$ (Probability of slip: student knows topic but makes error / needs hints)
    - $P(G) = 0.20$ (Probability of guess: student does not know topic but solves without hints)
  - **Hint-Attenuated Observation Likelihood:**
    - Solves with hints are attenuated to prevent artificial mastery inflation.
    - Attenuation factor: $\text{attenuation} = \max(0.05, 1.0 - 0.25 \times \text{hintsUsed})$.
    - Unassisted solve (0 hints) yields 100% credit: $P(\text{Obs} \mid L) = 1 - P(S)$, $P(\text{Obs} \mid \neg L) = P(G)$.
    - Assisted solve blends observation likelihood smoothly towards non-success.
  - **Posterior Probability & Learning Update:**
    - Posterior before transition:
      $$P(L_t \mid \text{Obs}) = \frac{P(L_t) \times P(\text{Obs} \mid L_t)}{P(L_t) \times P(\text{Obs} \mid L_t) + (1 - P(L_t)) \times P(\text{Obs} \mid \neg L_t)}$$
    - Transit to next state:
      $$P(L_{t+1}) = P(L_t \mid \text{Obs}) + (1 - P(L_t \mid \text{Obs})) \times P(T)$$
    - Clamped strictly to $[0.01, 0.99]$.
- **Temporal Memory Decay (Ebbinghaus Forgetting Curve):**
  - Inactivity degrades latent knowledge over time via exponential half-life decay:
    $$P_{\text{decayed}} = P_{\text{prior}} + (P_{\text{current}} - P_{\text{prior}}) \times 2^{-\Delta t / t_{\text{half}}}$$
    where $t_{\text{half}} = 30\text{ days}$ and baseline asymptotic floor is $P_{\text{prior}} = 0.30$.
- **Pedagogical Routing & Hint Calibration:**
  - `recommendStartingHintLevel(pKnown)`:
    - $P(L) \ge 0.85$ (Mastered): Starts at Level 1 (Direction) to preserve challenge and foster independent insight.
    - $0.60 \le P(L) < 0.85$ (Competent): Starts at Level 1 (Direction).
    - $0.40 \le P(L) < 0.60$ (Developing): Starts at Level 2 (Approach / Algorithm pattern) to save cognitive fatigue.
    - $P(L) < 0.40$ (Struggling / Novice): Starts at Level 3 (Pseudocode scaffold) to provide immediate structure.
- **Weak-Topic Identification & Deliberate Practice:**
  - Topics with $P(L) < 0.60$ are classified as `weak` with deliberate practice recommendations.
  - `identifyWeakTopics()` maps low-mastery concepts to curated canonical problem sets (e.g., LeetCode 300 Longest Increasing Subsequence, LeetCode 322 Coin Change for Dynamic Programming; LeetCode 33 Search in Rotated Sorted Array for Binary Search).
  - Supplies specific pedagogical study tips (e.g., "Focus on defining clear state transitions and identifying base cases").
- **Side Panel Progress UI Integration (`ProgressTab.tsx`):**
  - "Topic mastery" section dynamically tags topics with amber `Weak` badges when $P(L) < 0.60$.
  - "Focus weak" button (`data-testid="focus-weak-btn"`) toggles filtered view to highlight only vulnerable concepts.
  - "Recommended Topic Review" card (`data-testid="weak-topics-review-panel"`) presents focused deliberate practice recommendations and calibrated mastery percentages.
- **Automated Verification:**
  - 15/15 unit tests passing in `tests/unit/mastery-bkt.test.ts` (222/222 total unit tests passing across all 25 test files).
  - Playwright E2E test passing in `tests/e2e/mastery-progress.test.ts`, verifying BKT mastery calibration, focus toggle, and capturing high-fidelity screenshots (`sidepanel_mastery_bkt.png`, `sidepanel_mastery_weak_review.png`).
  - Full suite of 7/7 Playwright E2E suites passing cleanly.

---

## 18. E2E Service-Worker Interception & Gemini Mocking (Step 16)

- **Problem:**
  - In Manifest V3 Chrome extensions, the background service worker executes inside an isolated V8 isolate context (`ServiceWorkerGlobalScope`), completely detached from DOM page window contexts.
  - Standard Playwright page-level routing (`page.route()`) intercepts only navigation and resource requests issued by that specific DOM page, completely bypassing network calls initiated inside the service worker via `fetch()`.
  - Adding test-only mock flags, conditional build flags, or fake endpoints into production source code violates production purity and introduces security risks.
- **Solution (Zero Production Contamination):**
  - Playwright provides a direct `Worker` handle to the extension background script (`context.serviceWorkers()[0]`).
  - During E2E test execution, we execute `background.evaluate()` on that Worker handle to intercept `globalThis.fetch` inside the `ServiceWorkerGlobalScope` dynamically at runtime.
  - Test suites inject mock behaviors (successful level-specific hint generation, HTTP 429 rate limits with `Retry-After: 3`, HTTP 403 invalid key errors, and network disconnects) entirely in memory during test initialization.
- **Advantages:**
  1. **Production Purity:** Zero mock hooks, debug flags, or test bypasses exist in `src/` or the production bundle (`.output/chrome-mv3`).
  2. **End-to-End Realism:** Network calls traverse the real `GeminiClient`, parse real responses and headers, pass through the real multi-agent Critic and grounding guardrails, and propagate through the message bus to React components.
  3. **Verification:** Proven by inspecting `.output/chrome-mv3` after a normal production build and asserting that the exact mocked response reaches the Side Panel UI.

