# VIVA_NOTES.md — Live Demo Script, Backup Protocols & Viva Preparation

---

## 1. Honest Limits & Architectural Disclosures

- **Heuristic + Probabilistic Stuck Detection:** Stuck detection uses a calibrated logistic model over deterministic behavioral signals (dwell time, scroll reversals, wrong submissions, idle periods). It is an explainable probabilistic inference engine, not a heavy opaque neural network.
- **Hallucination Mitigation:** Grounding checks (requiring verbatim substring anchors from problem statements) and multi-agent Critic verification suppress ungrounded claims and code leaks, but cannot eliminate LLM variability entirely. Low-confidence outputs fall back to safe structural scaffolds.
- **Zero Cloud Footprint:** The entire architecture runs strictly in the browser extension under Manifest V3. No proprietary backend server touches user code or API keys.
- **Fair-Play Hard Lock:** In competitive contest environments (`/contest/`), all AI intervention is completely silenced to protect academic and contest integrity.

---

## 2. Step-by-Step 5-Minute Live Demo Script

### Preparation Before the Demo (T-2 Minutes)
1. Ensure the extension is loaded in Chrome from `.output/chrome-mv3`.
2. Open **Settings** (`chrome-extension://<id>/options.html#general`):
   - Toggle **Demo / Evaluation Mode** to **ON** (visibly badged; shortens cooldowns and stuck thresholds to 20 seconds).
   - Ensure a valid Gemini API key is configured (configured locally via Bring-Your-Own-Key in Settings). Note: The production build contains zero mock modes; it always communicates directly with the live Gemini API.
3. Open two tabs:
   - Tab 1: Problem page (LeetCode *Two Sum* or local fixture `tests/fixtures/leetcode-problem.html`).
   - Tab 2: Extension Side Panel opened alongside the problem tab.

---

### Step 1: Passive Observation & Signal Ingestion (0:00 – 0:45)
- **Action:**
  - Bring Tab 1 into focus.
  - Scroll up and down the problem statement. Type partial code into the editor. Switch tabs briefly and switch back.
  - Point to the Side Panel header showing `"Watching"` status.
- **What to Say:**
  > *"Welcome. Today I'm demonstrating Unstuck, an explainable, privacy-preserving AI coding tutor built natively as a Chrome extension.*
  >
  > *Notice that right now, as I read the problem, Unstuck is passively observing lightweight behavioural signals: dwell time on sections, scroll reversals, and editor interactions. Crucially, it does not record keystrokes or send my screen to any cloud server. Everything stays in memory inside the local content script."*

---

### Step 2: Stuck Inference & Shadow DOM Nudge (0:45 – 1:30)
- **Action:**
  - Submit a wrong testcase or idle with multiple scroll reversals.
  - Within ~20 seconds (demo mode), the floating S08 Nudge Card slides in smoothly at the bottom-right of the page.
  - Highlight that the editor cursor and keystrokes continue typing without focus theft.
- **What to Say:**
  > *"After detecting sustained struggle—corroborated by high dwell and wrong submission signals—our planner evaluates whether an intervention has positive expected utility.*
  >
  > *Here, the stuck probability crossed threshold, and this proactive Nudge Card appeared. Notice two key engineering details:*
  > *First, it renders inside an isolated Shadow DOM, so host-page CSS never distorts our UI.*
  > *Second, it never steals keyboard focus. I can continue typing in Monaco without interruption. If I ignore it, an 8-second countdown auto-dismisses it, training our contextual bandit to be less intrusive in the future."*

---

### Step 3: Progressive Socratic Hinting & Zero Code Leakage (1:30 – 3:00)
- **Action:**
  - Click **"Get Hint"** on the nudge card.
  - The Side Panel opens to the **Hints Tab**.
  - Show Hint Level 1 (Direction): conceptual paradigm (e.g. Hash Table complement lookup). Point out the exact quote highlighted from the problem statement.
  - Click **"Make it more direct"** to request Level 2 (Approach).
- **What to Say:**
  > *"When I accept the nudge, the request triggers our multi-agent StateGraph in the service worker.*
  >
  > *Notice what Level 1 gives me: purely Socratic conceptual direction. There is zero code, zero function signatures, and zero syntax snippets. This is enforced by our deterministic Critic guardrail.*
  >
  > *Notice also this grounded quote chip. Unstuck verified that this quote exists verbatim in the scraped problem statement before delivering it to me.*
  >
  > *If I need more help, I click 'Make it more direct'. Unstuck advances to Level 2—providing algorithmic outline without handing over the completed solution. It only advances to Level 3 pseudocode or Level 4 full code when explicitly requested, preserving the student's learning moment."*

---

### Step 4: Explainable AI Trace & BKT Mastery Progress (3:00 – 4:00)
- **Action:**
  - Switch to the **Trace Tab** in the Side Panel.
  - Walk through the visual execution timeline: `context_builder` (token budget) -> `hint_generator` -> `critic` (checks passed) -> `deliver`.
  - Switch to the **Progress Tab**. Show the Bayesian Knowledge Tracing topic bars and weak topic recommendations.
- **What to Say:**
  > *"Unlike black-box AI tools, Unstuck is fully explainable. The Trace tab reveals the exact internal pipeline: why the planner chose to nudge, what token budget was allocated, and how the Critic verified safety.*
  >
  > *Under the Progress tab, Unstuck maintains a local Bayesian Knowledge Tracing model. Each unassisted solve increases mastery, while heavy hint usage dampens gains. Notice the 'Focus weak' button: it highlights concepts with mastery below 60% and suggests targeted practice problems."*

---

### Step 5: Privacy Architecture, Local Audits & Total Wipe (4:00 – 4:45)
- **Action:**
  - Click the **Settings** icon to open `options.html#privacy`.
  - Scroll to the "What is sent to the AI" live transparency table.
  - Show the Local Audit Log entries count.
  - Point to the **Export Data (JSON)** and **Export Metrics (CSV/Markdown)** buttons.
  - Demonstrate or explain the typed `"DELETE"` modal.
- **What to Say:**
  > *"Finally, let's examine privacy. All settings, logs, and hints are stored locally in IndexedDB and Chrome storage.*
  >
  > *This transparency table dynamically discloses the exact schema sent to the LLM. If the user disables 'Include my code', editor text is omitted entirely. Users can export their entire history as JSON or audit metrics as CSV and Markdown. And clicking 'Delete all data' with typed confirmation executes a complete cryptographically clean wipe of all local stores."*

---

### Step 6: Wrap-Up & Viva Handover (4:45 – 5:00)
- **What to Say:**
  > *"In summary: Unstuck is proactive, Socratic, grounded, and privacy-preserving, implemented entirely within the Manifest V3 security model with zero server dependencies. Thank you, and I am ready for your questions."*

---

## 3. Contingency Protocols (Live Demo Failure Playbook)

> [!IMPORTANT]
> **Zero Mock Mode in Production:** The production extension contains zero mock toggles, simulated AI modes, or fake API pathways. All code paths execute against real storage, real DOM adapters, and the live Google Gemini API. If the live connection, browser, or API encounters issues during a presentation, do NOT attempt to fake behavior. Follow the strict fallbacks below.

### Scenario A: Google Gemini API Rate Limit (HTTP 429)
1. **Symptom:** UI displays the amber S13.3 "Rate limited" screen with an active countdown timer.
2. **What to Say:**
   > *"Notice how gracefully our extension handles provider rate limits. Instead of a generic error or silent crash, our LLM client parsed the HTTP 429 `Retry-After` header and displayed this live countdown. As soon as the countdown hits zero, the retry button re-enables automatically."*
3. **Action:** Wait 3 seconds for the countdown to expire and click "Try Again".

### Scenario B: Internet Disconnection or API Outage
1. **Symptom:** Red offline banner or S13.2 error card.
2. **What to Say:**
   > *"The live connection dropped. Notice that Unstuck's local telemetry and signal collector continue running offline without throwing uncaught exceptions. Let me switch to our offline benchmark CLI testbed to show our verified results."*
3. **Action:** Open terminal and run `npm run eval` to execute the offline evaluation testbed across 15 canonical benchmark problems, verifying the Critic and prompt pipeline without live network dependencies. Alternatively, switch to the verified backup screen recording.

### Scenario C: Unrecoverable Browser or System Freeze
1. **Action:** Immediately open the backup video file (`unstuck_demo_viva_backup.mp4`).
2. **What to Say:**
   > *"I have a high-definition backup recording of the complete live workflow captured earlier in a clean browser session. Let me play the 5-minute walkthrough from this recording."*

---

## 4. Backup Screen-Recording Checklist

Before presenting the viva, create and verify a backup screen recording following this exact specification:

| Parameter | Requirement |
|---|---|
| **Resolution** | Full HD `1920 x 1080` (16:9 aspect ratio) |
| **Framerate** | `60 fps` (smooth UI animations) or `30 fps` minimum |
| **Audio** | Clear, noise-cancelled microphone narration reciting the 5-minute script above |
| **Window Frame** | Clean Google Chrome profile; no personal bookmarks, extensions, or OS taskbar clutter |
| **File Format** | Standard MP4 (`H.264` video, `AAC` audio) |
| **File Naming** | `unstuck_demo_viva_backup.mp4` |
| **Storage Location** | Store on local Desktop and on a backup USB flash drive; **do NOT commit MP4 files to git** |

### Recording Sequence Checklist
- [ ] Scene 1: Extension unpacked load & Options setup (Demo Mode toggled ON).
- [ ] Scene 2: Problem page interaction with passive signal watching.
- [ ] Scene 3: S08 Nudge Card triggering in isolated Shadow DOM.
- [ ] Scene 4: Hints tab Level 1 and Level 2 delivery with grounded quote highlighting.
- [ ] Scene 5: Trace tab timeline and Progress tab Bayesian knowledge bars.
- [ ] Scene 6: Options page data transparency table, CSV/Markdown export, and delete-all confirmation.
- [ ] Verification: Test playback in VLC or default media player with sound on before the presentation.

---

## 5. Comprehensive Viva & Defense Q&A Compendium (35 Core Questions)

### Category A: Architecture & Chrome Manifest V3

#### Q1: Why did you build Unstuck under Manifest V3 instead of Manifest V2?
**Answer:** Chrome deprecated Manifest V2. Manifest V3 is the modern web extension standard, enforcing enhanced security, declarative permissions, and replacing persistent background pages with event-driven Service Workers. Building on MV3 ensures long-term store compatibility and forces strict privacy and resource isolation.

#### Q2: How does Unstuck handle the Service Worker ephemeral lifecycle when Chrome terminates it?
**Answer:** Chrome MV3 service workers can be suspended after ~30 seconds of inactivity. Unstuck persists all critical transient session state (active tab context, in-flight hint request status, recent nudge timestamps) in `chrome.storage.session` and long-term state in IndexedDB (`unstuck_store_v2`). When a new message or alarm awakens the service worker, it executes `rehydrateWorkerState()` before processing the event.

#### Q3: How do the Content Script, Service Worker, and Side Panel communicate?
**Answer:** They use a typed Chrome runtime message bus defined in `src/shared/messages.ts`. Content scripts send `EMIT_SIGNALS` and `NUDGE_ACCEPTED` to the service worker. The service worker broadcasts `SHOW_NUDGE` to content scripts and `STATE_UPDATED` to open UI surfaces. Side Panel and Popup query `GET_SIDE_PANEL_STATE` and `GET_POPUP_STATE` on mount.

#### Q4: Why not run the Google Gemini LLM fetch calls directly from the Content Script?
**Answer:** Three architectural reasons: (1) Content scripts execute within the untrusted host page context where malicious host scripts or XSS could inspect the DOM or prototype chains to extract the API key; (2) Content scripts are subject to the host page's Content Security Policy (CSP), which often blocks outbound requests to Google APIs; (3) Centralizing LLM calls in the service worker enables per-tab coalescing, global rate-limit tracking, and shared caching.

#### Q5: How does Shadow DOM isolation protect the nudge overlay (S08)?
**Answer:** Injected UI can be broken by host CSS resets (e.g., LeetCode's Tailwind rules or Codeforces' legacy styles). We attach an open Shadow DOM root (`#unstuck-overlay-root`) with an explicit internal CSS reset, ensuring consistent typography, colors, and layout completely immune to external CSS bleeding.

#### Q6: What is the storage hierarchy and why use multiple storage engines?
**Answer:** We use three distinct tiers:
1. `chrome.storage.local`: Lightweight key-value storage for user settings, consented sites, and the encrypted API key.
2. `chrome.storage.session`: Memory-only storage for in-flight request deduplication and active tab tracking (automatically purged on browser restart).
3. `IndexedDB` (via `idb`): Structured database for high-volume append-only event logs, full hint history, bandit state counters, and BKT mastery vectors.

---

### Category B: Pedagogy & Learning Science

#### Q7: Why use progressive tiered hints (L1–L4) instead of immediate complete solutions?
**Answer:** Research in cognitive load theory and self-directed learning shows that giving immediate answers induces the "illusion of competence"—learners feel they understand the solution without forming generative mental schemas. Unstuck uses a 4-tier pedagogical ladder: L1 (Direction/Invariant) -> L2 (Approach/Strategy) -> L3 (Pseudocode/Scaffold) -> L4 (Syntactic Code). Students receive only the minimum assistance required to regain momentum (Zone of Proximal Development).

#### Q8: How does Unstuck foster metacognition rather than passive dependency?
**Answer:** Level 1 hints are formulated as invariant questions (e.g., *"What property remains true after sorting?"* or *"Can the complement be looked up in O(1)?"*). Furthermore, the Side Panel provides structured feedback chips asking learners *why* a hint was or wasn't helpful, and the Problem Solved screen (S12) encourages them to articulate their time/space complexity before closing.

#### Q9: Why Bayesian Knowledge Tracing (BKT) instead of Deep Knowledge Tracing (DKT)?
**Answer:** DKT relies on large recurrent neural networks that require massive training datasets, high compute, and opaque latent vectors. BKT is a mathematically rigorous, explainable probabilistic graphical model with four interpretable parameters ($P(L_0), P(T), P(S), P(G)$). It runs client-side in sub-millisecond time, consumes zero server compute, and directly visualizes topic mastery in the Progress tab.

#### Q10: How does hint usage attenuate the BKT mastery update?
**Answer:** An unassisted solve provides strong evidence of mastery ($P(\text{Obs} \mid L) \approx 1 - P(S)$). However, if the user solves a problem after unlocking Level 3 or Level 4 hints, the observation was heavily scaffolded. We apply an attenuation factor $\text{attenuation} = \max(0.05, 1.0 - 0.25 \times \text{hintsUsed})$, discounting the posterior probability update so unassisted solves are rewarded substantially more than hint-assisted solves.

#### Q11: Why is Level 4 (Full Code) protected by an explicit double-confirmation guard?
**Answer:** In coding interviews and competitive programming, jumping straight to syntax is the most common anti-pattern. The double-confirmation dialog forces a cognitive pause: it explicitly warns that viewing full code reveals the answer and diminishes the BKT mastery reward, ensuring the user only unlocks it as a deliberate last resort.

#### Q12: How does the system adapt to learners of different mastery levels?
**Answer:** Pedagogical Routing inspects the learner's current decayed mastery for the problem's topic tags:
- Mastered ($P(L) \ge 0.85$): Begins at Level 1 (Direction) with terse invariant checks.
- Developing ($0.40 \le P(L) < 0.60$): Routes directly to Level 2 (Approach) to prevent frustration.
- Struggling ($P(L) < 0.40$): Directly offers Level 3 (Pseudocode scaffold) to avoid abandonment.

---

### Category C: Privacy, Security & BYOK Architecture

#### Q13: Why did you choose a Bring-Your-Own-Key (BYOK) architecture without a cloud backend?
**Answer:** BYOK gives users absolute cryptographic and privacy guarantees: their code, submission history, and API keys are never stored on or routed through our servers. It completely eliminates operating server costs, avoids multi-tenant database compliance risks (GDPR, FERPA), and gives users direct control over their token quotas in Google AI Studio.

#### Q14: How do you prevent user API keys from leaking to host pages or content scripts?
**Answer:** Principle of least privilege: the API key is stored exclusively in `chrome.storage.local` and accessed only by the background service worker. The content script has zero access to storage keys, and background messaging schemas strictly omit the API key from all broadcast payloads sent to tabs.

#### Q15: How does Unstuck defend against indirect prompt injection embedded in problem statements?
**Answer:** Host page problem descriptions and user code are treated as untrusted data. In `context-builder.ts`, all external text is wrapped inside strict boundary delimiters (`<<<UNTRUSTED_PAGE_DATA>>>`). System instructions explicitly command the model to treat content inside delimiters strictly as reference strings and never as executable instructions. Furthermore, the downstream Critic verifies output compliance regardless of user/page inputs.

#### Q16: What happens when the user clicks "Delete all data" in Settings?
**Answer:** The user must explicitly type `"DELETE"` in the modal. Upon confirmation, the service worker purges `chrome.storage.local`, `chrome.storage.session`, and completely deletes the `unstuck_store_v2` IndexedDB database. The extension resets to default onboarding state with zero residual logs.

#### Q17: Does Unstuck record keystrokes, clipboard content, or screen pixels?
**Answer:** No. We do not use keyloggers or canvas capture APIs. Content scripts observe aggregated behavioral events: active dwell time, scroll delta reversals, and submission button clicks. Keystroke content is never recorded; editor text is only read at the moment of an explicit user hint request, and only if the user consented to code inclusion.

#### Q18: What data is transmitted to Google Gemini, and can users opt out of sending their code?
**Answer:** Outbound payloads contain only: the problem statement, constraints, topic tags, submission error verdicts (e.g. WA/TLE), and the user's code snippet. Users can toggle "Include my code in AI context" off at any time in Options, which completely excludes their code editor buffer from the prompt.

---

### Category D: Machine Learning, Heuristics & Decision Theory

#### Q19: Why use a calibrated logistic regression for stuck detection instead of a deep neural network?
**Answer:** Three reasons:
1. **Explainability:** Feature weights ($w_W, w_D, w_R, w_T$) map directly to physical behavioral indicators (wrong submissions, dwell minutes, scroll reversals, tab switches), allowing us to compute transparent attribution percentages for the Trace tab (S07).
2. **Deterministic Latency:** Logistic inference evaluates in <0.1 ms in JavaScript with zero garbage collection spikes.
3. **Guardrail Enforceability:** We can enforce deterministic hard constraints (e.g. clamping $p \le 0.40$ during careful reading, or $p \le 0.45$ during example comparison) that are impossible to guarantee in deep black-box networks.

#### Q20: How does the detector distinguish between "stuck" and "reading carefully"?
**Answer:** The "Reading Carefully Protection" rule (EC-040) enforces that when wrong submissions $W = 0$ and scroll reversals $R \le 1$, $p_{\text{stuck}}$ is strictly capped at $\le 0.40$ during the initial phase ($t < N_{\text{eff}}$ minutes). However, in v1.0.5, to prevent learners from being indefinitely neglected while thinking quietly on hard problems (S3), once active dwell without progress exceeds $N_{\text{eff}}$ (default 8 minutes; 20 seconds in Demo Mode), the model transitions through a smooth hyperbolic tangent ramp:
$$P(\text{stuck}) = P_0 + (1 - P_0) \tanh\left(\frac{t - N_{\text{eff}}}{\tau}\right)$$
This smoothly elevates $P(\text{stuck})$ past the threshold ($0.60$) and presents a soft, supportive nudge (*"You've been on this one a while. Want a hint?"*). On documentation and article pages, the hard 0.40 cap remains permanent. Similarly, the "Distracted" classifier detects rapid tab switching ($\ge 4$ switches/min) with low active dwell ($< 45$s) and classifies the state as distracted rather than stuck.

#### Q21: How does the Contextual Bandit decide whether to show a nudge?
**Answer:** It uses an expected utility formulation:
$$U(s) = p_{\text{stuck}} \cdot \text{helpValue} - \text{interruptionCost}$$
If $U(s) < 0.50$, the planner suppresses the nudge. If $U(s) \ge 0.50$, it queries the bandit for the context bucket `site:stuckBucket:masteryBucket`. If the expected reward $Q(s)$ indicates high prior rejection or dismissal, the action chooses `wait` instead of `nudge`.

#### Q22: Why use $\epsilon$-greedy exploration with decay rather than Upper Confidence Bound (UCB)?
**Answer:** In browser extension environments, state spaces are compact and discrete (27 buckets). Decaying $\epsilon$-greedy ($\epsilon = \max(0.05, \frac{0.20}{1 + n/20})$) provides intuitive, predictable exploration that rapidly converges to the user's preference while maintaining an absolute 5% floor to adapt if the user's study habits evolve.

#### Q23: What are the bandit payoff values?
**Answer:** Accepting a nudge yields $+1.0$. Explicitly dismissing yields $-1.0$. Allowing the 8-second countdown to expire (ignored) yields $-0.5$. Blocking nudges on the domain yields $-2.0$. This heavily penalizes intrusive interruptions.

#### Q24: How does the Dual Critic system prevent LLM hallucinations and leaks?
**Answer:** The Critic operates in two stages:
1. **Deterministic Heuristic:** Zero-token regex patterns detect code syntax, Markdown code blocks, function signatures (`def `, `function `, `#include`), loops, and keywords for Levels 1 and 2.
2. **Grounding Verifier:** Validates that quoted terms and algorithmic claims anchor to verbatim substrings in the scraped problem statement. If candidate generation violates rules, it retries up to 3 times before deploying a safe generic scaffold.

---

### Category E: Platform Adapters & Engineering Robustness

#### Q25: How does Unstuck extract code from virtualized editors like Monaco or CodeMirror?
**Answer:** Modern online IDEs virtualize lines, rendering only DOM elements currently visible in the viewport. Unstuck accesses the editor through platform adapter hooks: querying the editor instance API on the window when accessible, or stitching visible line tokens and fallback DOM buffers with a best-effort tag (EC-028), while allowing users to inspect the captured snippet.

#### Q26: How does Unstuck handle Single Page Application (SPA) client-side navigation?
**Answer:** LeetCode uses Next.js SPA routing (`pushState`/`popstate`). Unstuck listens to `History.pushState` mutations and URL change events. Upon route change, it resets the SignalCollector's dwell timers, clears in-flight hints, and switches active problem context while retaining conversational history for the previous problem in local storage (EC-022).

#### Q27: What happens if LeetCode or Codeforces updates their DOM selectors?
**Answer:** The platform adapter returns `null` for unknown selectors. The extension gracefully falls back to the generic extractor (`GenericPageAdapter`), logging a non-fatal warning without crashing the content script (EC-021). The Side Panel displays the contextual state banner (S14.1), prompting the user to select text or use general chat.

#### Q28: How does the extension ensure zero focus theft when the nudge appears while typing?
**Answer:** The Shadow DOM host container is configured with `tabindex="-1"`. All mouse and pointer listeners on the nudge card call `event.preventDefault()` on `mousedown`, preventing the browser from moving keyboard focus away from the active Monaco editor instance (EC-063, EC-120).

#### Q29: How is contest integrity preserved during live competitions?
**Answer:** The adapter checks the URL pathname for `/contest/` (LeetCode) or active contest rounds (Codeforces). When a contest is detected, the extension engages a hard fair-play lock (EC-100): all signal collection, background planners, nudge overlays, and hint requests are completely disabled. The Side Panel and Toolbar Popup render the locked shield view (S14.2 / Variant 4).

#### Q30: How does Unstuck handle Google Gemini HTTP 429 rate limits?
**Answer:** When Gemini returns HTTP 429 (`RESOURCE_EXHAUSTED`), our LLM client parses the response headers (`Retry-After`) and response body (`RetryInfo.retryDelay` and Google RPC `QuotaFailure` violations). It classifies the event into `per_minute` (RPM burst) or `per_day` (RPD quota exhaustion):
- For `per_minute`: The UI presents an active countdown holding timer that never shows "0s remaining" while the quota window is closed.
- For `per_day`: The UI displays 'Daily Quota Exhausted', completely hides the futile auto-retry button, and directs the user to 'Switch model' (e.g., Flash 1.5) or 'Check usage in Google AI Studio'.
Furthermore, client-side requests are paced through a 10 RPM token bucket and deduplicated by request hash to prevent accidental bursts.

#### Q31: How do React Error Boundaries ensure fault isolation?
**Answer:** Every major tab and panel is wrapped in an independent `ErrorBoundary`. If an uncaught rendering error occurs in the Trace tab's SVG canvas, only that tab displays a fallback error card; the Hints and Chat tabs continue functioning normally without unmounting the root application.

#### Q32: In v1.0.0, why did all side panel chat queries return a canned Two Sum response, and how was this resolved in v1.0.1?
**Answer:** In v1.0.0, the message bus enforced a hard 10-second timeout. Multi-agent StateGraph runs under live LLM latency took 10–12 seconds, causing the promise to reject. A UI `catch` block in `SidePanelApp` had been populated with a hardcoded Two Sum scaffold with `criticChecked: true` rather than surfacing an honest error. Concurrently, the generator prompt strictly mandated verbatim quotes even for off-topic questions (e.g., *"who invented this problem"*), failing Critic grounding and exhausting retries.
In v1.0.1, we resolved this through five structural fixes:
1. Expanded generation bus timeout to 35 seconds with `requestId` tracking and cancellation support.
2. Structured off-topic question answering (`answerable_from_page: false`, optional `groundedQuote`).
3. Implemented deterministic short-circuiting in the Critic to eliminate wasted LLM judge latency when heuristic leaks or grounding fail.
4. Completely purged all fabricated mock data and hardcoded scaffolds across the codebase, replacing them with typed S13.x error cards and interactive Retry actions.
5. Added a bundle sentinel test that audits production artifacts for forbidden canned strings.

---

### Category F: Universal Mode Architecture, Multi-Site Permissions & Lexical Retrieval (v1.0.4)

#### Q33: How does Universal Mode (v1.0.4) expand Unstuck to arbitrary websites without requesting broad `*://*/*` host permissions?
**Answer:** In accordance with Chrome Web Store least-privilege policies, Unstuck's manifest declares host permissions strictly for competitive programming domains (`https://leetcode.com/*`, `https://codeforces.com/*`) and declares `optional_host_permissions: ['https://*/*', 'http://*/*']`.
Arbitrary sites use two explicit user-gesture opt-in paths:
1. **"Use on this page once"**: Leverages `activeTab` and programmatic injection (`chrome.scripting.executeScript`) for an ephemeral single-tab session without persisting host permissions.
2. **"Always allow on this site"**: Invokes `chrome.permissions.request({ origins: [originPattern] })`. Upon native Chrome permission grant, it dynamically registers a content script (`chrome.scripting.registerContentScripts`) and persists the origin in `settings.allowedOrigins`. Users can pause, resume, or revoke origins anytime in Settings > Allowed Sites.

#### Q34: What are the sensitive-page guardrails and how do they prevent privacy leaks on generic websites?
**Answer:** Before extracting any text on generic web pages:
1. **DOM Password & Auth Form Scan:** The extractor scans for `input[type="password"]` and authentication or payment forms (`form[action*="login"]`, `form[action*="signin"]`, `form[action*="checkout"]`, `form[action*="payment"]`, `[autocomplete*="password"]`, `[autocomplete="cc-number"]`). If detected, extraction immediately aborts (`isSensitive: true`), capturing zero page text and rendering a protective shield in the UI.
2. **Category Pattern Blacklist:** Built-in regex heuristics block extraction on banking (`chase.com`, `bankofamerica.com`, `paypal.com`, `stripe.com/pay`), checkout/cart paths (`/checkout`, `/cart`, `/billing`), webmail (`mail.google.com`, `outlook.live.com`), health/medical portals, and password managers. Users can also configure custom regex patterns in Settings.
3. **Form Input Pruning:** On all generic sites, the Readability extractor completely strips all `<input>`, `<textarea>`, `<select>`, and `[contenteditable]` elements so typed form inputs are never captured.

#### Q35: How does in-memory BM25 lexical ranking work on long web pages, and why was it chosen over remote vector embeddings?
**Answer:** On long technical articles or documentation (>4,000 characters), Unstuck chunks the extracted text by semantic heading boundaries (`h1`–`h4`) or 500-word blocks. It then evaluates an in-memory Okapi BM25 algorithm ($k_1=1.5, b=0.75$) with Term Frequency and Inverse Document Frequency scoring.
BM25 was chosen because:
- **Zero Privacy Leakage & Zero Network:** It runs purely in browser memory in <5ms without sending text to an external embedding provider or local WebAssembly model.
- **Deterministic Token Budgeting:** It packs only the top-$K$ most relevant sections fitting the 4,000-character context budget into the Gemini prompt.
- **Explainability:** Retrieved section titles are logged directly in the Trace tab and render as clickable citation chips that smooth-scroll to and highlight the referenced DOM section on the page.

#### Q36: How does the pedagogical scaffolding adapt when viewing documentation or an article instead of a coding problem?
**Answer:** When the content classifier detects `documentation` or `article` (via URL patterns, OpenGraph tags, or semantic heading density), the prompt generator and UI adapt the 4-tier scaffolding ladder:
- **Level 1 — Pointer:** Directs the user to the exact paragraph or conceptual section to examine without spoiling summaries.
- **Level 2 — Explain Simply:** Deconstructs complex terminology into accessible, plain-English conceptual explanations.
- **Level 3 — Worked Example / Analogy:** Provides real-world analogies or illustrative code usage examples.
- **Level 4 — Full Explanation:** Comprehensive synthesis covering edge cases, trade-offs, and background mechanics.
Furthermore, BKT mastery updates are skipped for generic reading material, and proactive nudges default to OFF to respect focused reading.

#### Q37: How does the "What will be sent to the AI" preview modal preserve user transparency?
**Answer:** Before sending extracted generic page text to the Gemini API, the side panel presents an expandable preview modal displaying the exact character count, title, and sanitized text excerpt. The user can review, manually edit or trim the text, toggle "Include page text" off for the current query, or select "Never send page text from this site" to persist a permanent privacy override.

---

### Category G: Production Stabilization, Quota Management & Signal Fidelity (v1.0.5)

#### Q38: What caused symptom S1 (`[Unstuck][AgentGraph][ERROR] hint_generator execution failed [object Object]`), and how did v1.0.5 resolve it?
**Answer:** Two root causes contributed to S1:
1. `console.error` parameter coercion: Handled operational errors (HTTP 429, timeouts, offline states) were passed directly to `console.error` as error objects. In Chrome extension service workers, objects passed to `console.error` are stringified by the Chromium logging bridge as `[object Object]` and flagged in `chrome://extensions` as severe runtime crashes.
2. In v1.0.5, we introduced `logger.operationalError` and `serializeLogData`. Handled operational failures are string-serialized into concise, single-line messages with zero raw secrets (e.g., `"[LlmError 429: RESOURCE_EXHAUSTED (per_minute)]"`) and routed to `console.warn` or `console.debug`. `console.error` is reserved exclusively for unhandled programming bugs and invariant violations.

#### Q39: Why did the stuck detector previously fail to trigger on long idle or reading times (S3), and how does the smooth $\tanh$ time ramp fix it?
**Answer:** Previously, the logistic model had a large negative intercept ($-1.80$). Without wrong submissions ($W = 0$) and scroll reversals ($R \le 1$), the logit remained low and a hard cap clamped $P(\text{stuck}) \le 0.40$. Even after 10–15 minutes of quiet thinking on LeetCode, $P(\text{stuck})$ hovered around $0.20$, far below the $0.60$ threshold.
In v1.0.5, we replaced the flat cap with a time-without-progress hyperbolic tangent ramp:
$$P(\text{stuck}) = P_0 + (1 - P_0) \tanh\left(\frac{t - N_{\text{eff}}}{\tau}\right)$$
where $N_{\text{eff}} = \text{nudgeAfterMinutes}$ (default 8 minutes; 20 seconds in Demo Mode) and $\tau = 4.0$ minutes. For $t < N_{\text{eff}}$, careful reading is protected. For $t \ge N_{\text{eff}}$, $P(\text{stuck})$ rises smoothly toward threshold. When triggered primarily by time, the UI delivers softer copy: *"You've been on this one a while. Want a hint?"*. Furthermore, the Toolbar Popup features a "Why no nudge yet?" diagnostic status box explaining whether the system is cooling down, reading without struggle, or waiting for signals.

#### Q40: How does v1.0.5 handle Gemini API free-tier rate limits and quota exhaustion (S4)?
**Answer:** Previous versions treated all HTTP 429 errors identically, setting an arbitrary 3-second timer that showed "0s remaining" while the quota window remained closed. In v1.0.5, we built deep parser support for Google RPC `RetryInfo` and `QuotaFailure` violations:
1. **Per-Minute Limits (`per_minute`):** The LLM client extracts `RetryInfo.retryDelay` or `Retry-After`. The UI displays an active holding countdown timer that never shows 0s while waiting, disabling retry until the window clears.
2. **Per-Day Quota Exhaustion (`per_day`):** When the daily free-tier quota (1,500 RPD on Flash) is reached, auto-retry buttons are completely removed to prevent useless API pounding. The UI informs the user that daily quota resets at midnight Pacific Time and provides direct links to switch models or check usage in Google AI Studio.
3. **Preventive Token Bucket:** All outbound calls pass through an in-memory 10 RPM token bucket rate limiter, preventing burst requests.
4. **Session Response Cache:** Identical queries within a 15-minute window are served from an in-memory session cache, consuming 0 tokens.

#### Q41: How does the Floating Action Button (FAB) open the Chrome Side Panel (S2), and how does it fall back?
**Answer:** When the user clicks the FAB on a coding page:
1. The content script sends a typed `OPEN_SIDE_PANEL` message to the background service worker.
2. The service worker calls `chrome.sidePanel.open({ tabId })`.
3. In browser environments where `chrome.sidePanel.open` requires direct top-level user gestures or is unsupported, the call rejects gracefully. The service worker catches this and returns `{ success: false, fallback: true }`.
4. The content script receives the fallback signal and renders an accessible in-page tooltip popover directing the user to click the Unstuck icon in the Chrome toolbar.
Additionally, the FAB supports keyboard activation (`Enter` / `Space`), right-click context menu options (Open Side Panel, Pause, Snooze 30m), and displays an active green dot only when a nudge is active or a hint is ready.

#### Q42: What is `lowQuotaMode` and how does the two-stage Critic design reduce LLM token consumption by 60%?
**Answer:** Under the original design, every hint request invoked the LLM generator followed by an LLM Critic judge, plus up to 3 retries, consuming 2 to 6 LLM calls per hint.
In v1.0.5, `lowQuotaMode` (enabled by default) restructures the Critic into two strict stages:
1. **Deterministic Guardrails First:** Zero-token regex leak detectors, level constraints, and problem statement substring quote grounding are evaluated locally in JavaScript.
2. **Judge Bypass:** In `lowQuotaMode`, once all deterministic checks pass, the LLM Critic judge is skipped, labeling the hint as `Checked (basic)`. If deterministic checks fail, retries are budgeted and capped at 2 LLM calls maximum.
This single optimization cuts per-hint token consumption by over 60%, drastically extending the student's free-tier daily quota.

#### Q43: How does per-tab state management ensure isolation across multiple concurrent coding tabs while surviving Manifest V3 service worker termination?
**Answer:** Previously, page contexts and signals were stored in module-level singletons in RAM, causing multi-tab cross-talk and data loss whenever the service worker suspended after 30 seconds of inactivity.
In v1.0.5, we implemented `TabStateManager`:
- Each tab maintains an isolated `TabState` record keyed by `tabId` containing its own `PageContext`, `SignalWindow`, `pStuck`, and timestamp.
- Tab states are synchronized to `chrome.storage.session`. When the service worker reawakens on any runtime message, it immediately rehydrates state from session storage.
- Closed tabs are cleanly evicted on `chrome.tabs.onRemoved`.
- All background handlers (`REQUEST_HINT`, `GET_PROBLEM_CONTEXT`, `SUBMIT_CHAT_QUERY`) resolve state strictly for the requesting `tabId`, eliminating cross-tab contamination.

#### Q44: Why did Gemini Flash models occasionally truncate output or fail with empty responses in structured generation (F5)?
**Answer:** On `gemini-2.5-flash`, internal reasoning tokens are counted against the declared `maxOutputTokens` budget. When generating structured JSON, if the model spends reasoning tokens internally, it can exhaust the output token budget before finishing the JSON payload. This produced truncated or empty responses, which legacy code misclassified as `SAFETY_BLOCKED`.
In v1.0.5:
1. We pass `thinkingConfig: { thinkingBudget: 0 }` for structured generation, dedicating 100% of the token budget to the JSON response.
2. We detect `MAX_TOKENS` finishReason as a typed `TRUNCATED_OUTPUT` error and perform a bounded retry with an expanded 4096-token budget.

---

### Category H: Universal Mode Chat Fidelity, Coverage Retrieval & Honest Error States (v1.0.6)

#### Q45: Why were algorithmic safe fallbacks prohibited from chat and non-problem pages in v1.0.6?
**Answer:** In earlier releases, when the Critic rejected a candidate or an error occurred during hint generation, `runAgentGraph` invoked `generateSafeFallback`. This returned an algorithmic scaffold designed specifically for LeetCode problems (*"Start by restating the problem in your own words. Identify what inputs are given, what output is expected..."*).
On non-problem pages (marketing pages like fellowship announcements, articles, documentation) and for conversational user queries (e.g., *"explain me about this fellowship in short points"*), returning a problem-solving scaffold was deceptive, nonsensical, and broken: it masqueraded an LLM/Critic failure as an answer.
In v1.0.6, we instituted the invariant that chat queries (`isChatQuery: true`) and non-problem pages MUST NEVER invoke `generateSafeFallback`. If generation or verification fails, the system returns an honest failure state (`success: false`, `errorCode`, `errorReason`) and offers the user an optional toggle to inspect the unverified draft.

#### Q46: How does broad summary coverage retrieval work, and why is it essential for long marketing/article pages?
**Answer:** Top-K BM25 retrieval excels at finding specific answers to narrow questions (e.g., *"What is the stipend?"*). However, for broad summary queries (e.g., *"explain this page"*, *"give me all details in short points"*, *"summarize this fellowship"*), standard BM25 clusters around a few high-frequency keyword sections and starves other essential sections (such as eligibility, timeline, FAQs).
In v1.0.6, `detectSummaryIntent` recognizes broad summary intent across English and Hinglish patterns. When active, `buildCoverageContext` executes a single-pass document-order coverage builder:
1. It parses all structural sections, including collapsed FAQ accordions (`<details>`, `<summary>`, `<dt>`, `<dd>`, `.accordion-*`).
2. It generates a top-level document outline so the LLM understands the global structure.
3. It allocates a proportional character quota per section (up to a 6,000-character budget), guaranteeing every section is represented without truncation bias.
4. It sets retrieval mode to `'coverage'`, displays a sections-used pill in the UI, and completes in exactly 1 generation call.

#### Q47: How does v1.0.6 handle grounded quote repair (partly verified), and why does it drop the quote rather than re-prompting?
**Answer:** LLMs frequently produce excellent, factually grounded answers but make minor alterations to their `groundedQuote` (e.g., slight punctuation changes, whitespace variations, or adding ellipsis). Previously, if verbatim substring matching failed, the Critic rejected the entire candidate and spent a costly second LLM call on regeneration, often running out of retry budget and failing.
In v1.0.6:
1. We introduced robust quote normalization: stripping smart quotes, normalizing whitespace, case-folding, and checking normalized substring containment.
2. We added fuzzy n-gram / token overlap matching (requiring $\ge 4$ tokens, $\ge 80\%$ token overlap, and strictly prohibiting code syntax).
3. If quote grounding still fails but the answer text itself passes all safety and code-leak checks, chat mode activates the **partly-verified path**: it drops the ungrounded quote, accepts the answer, assigns confidence 0.60, and badges it as `Critic: Partly verified`. This preserves useful answers while honestly signaling that the quote could not be strictly anchored, consuming 0 extra LLM calls.

#### Q48: What caused the Critic false positive rejecting normal English sentences containing the word "public"?
**Answer:** The Critic's deterministic regex guardrail included a check for Java/C++ method signatures: `\bpublic\s+(?:static\s+)?\w+\s+\w+`. Because this regex lacked a requirement for function call syntax (`(` or `=>`), any normal English noun phrase starting with "public" (e.g., *"public health"*, *"public infrastructure development"*, *"public sector projects"*) was misclassified as an executable code leak and rejected by the Critic.
In v1.0.6, we repaired `FUNCTION_SIGNATURE_REGEX` to strictly require parameter parentheses or arrow syntax: `\bpublic\s+(?:static\s+)?[\w<>[\]]+\s+\w+\s*(?:\(|=>)`. English adjectives like *"public policy"* now pass through cleanly.

#### Q49: How does the Side Panel UI handle honest failure states without frustrating the user?
**Answer:** Instead of rendering generic fallback advice with a confusing *"Low confidence 30%"* badge, the Side Panel displays an honest failure card with:
- An amber alert icon and clear message: *"I couldn't verify this answer against the current page."*
- A concise explanation of the failure reason (e.g., *"Answer could not be safely verified against the page context without leaking ungrounded claims."*).
- An interactive **"Show unverified draft"** toggle button allowing the user to view the raw candidate draft with an explicit disclaimer: *"This draft was not verified by the Critic. It may contain inaccuracies or ungrounded assumptions."*
- Dynamic pedagogical level chips tailored to the page type: on problem pages, it displays `Auto (L1 Direction)`; on articles and documentation, it displays `Auto (Pointer)`, `Explain simply`, `Worked example`, or `Full explanation`.

#### Q50: What is the "Zero-Error" standard achieved in v1.0.7, and how is it verified?
**Answer:** The v1.0.7 release instituted an absolute zero-tolerance standard for runtime errors, warnings, and unhandled promise rejections across all extension execution contexts (Content Scripts, Service Worker, Side Panel, Popup, and Options UI).
It is enforced by a Playwright verification suite (`npm run verify:errors`) that monitors all `console.error`, `console.warn`, unhandled page exceptions, and service worker crashes across 13 distinct real-world scenarios. The allowlist (`tests/zero-error/allowlist.json`) is strictly empty (`[]`), meaning zero warnings or errors are exempted or ignored.

#### Q51: How did v1.0.7 resolve the Hindi Wikipedia context budget warning (Evidence E1)?
**Answer:** Large multilingual encyclopedia articles like Wikipedia Hindi have over 220 sections and hundreds of thousands of characters. Previously, the readability scraper extracted these without budget caps, causing `PageContextSchema` to reject payloads exceeding old section counts (30) or character limits.
In v1.0.7:
1. `truncateToBudget()` slices statements with exact truncation tracking.
2. `sanitizeSectionsBudget()` enforces realistic caps (up to 60 sections, 4,000 characters per section, 60,000 total characters).
3. The message bus (`bus.ts`) includes an emergency trim fallback before schema validation so that any oversized payload is sanitized in-flight with zero console warnings.

#### Q52: Why are handled operational states (429, offline, invalid keys, contest mode) logged as info instead of warn/error?
**Answer:** In software engineering best practices, an expected, handled operational condition (such as a user entering an incorrect API key, device momentarily losing Wi-Fi, or API rate limiting with a 429 Retry-After header) is not an anomalous system failure. When an application catches, handles, and displays an informative UI state for these conditions, logging them as `console.warn` or `console.error` creates false alarms and clutters diagnostic pipelines. In v1.0.7, all handled states are logged at `info` or `debug` level.

#### Q53: How does the new System Health & Recent Diagnostics panel protect user privacy?
**Answer:** Located in Options (Bento 4), the Diagnostics UI reads from an in-memory 50-entry session ring buffer (`src/shared/errors/reporter.ts`). When a user clicks "Copy Diagnostics to Clipboard", it generates a sanitized summary containing browser version, OS platform, memory heap usage, active settings toggles, and recent event tags. Raw URLs, problem statement text, user code buffers, and API keys are strictly excluded.

#### Q54: How does v1.0.7 prevent false positive sensitive page blocking on educational URLs?
**Answer:** Previously, sensitive keywords like "pay", "cart", or "bank" used broad substring queries, causing educational pages like `https://en.wikipedia.org/wiki/Payment`, `/wiki/Open_banking`, `/wiki/Passport`, or `/wiki/Cartoon` to be blocked as checkout or banking pages. In v1.0.7, `src/shared/sensitive.ts` uses strict URL boundary regexes (`(?:^|\/)(?:checkout|cart|pay|billing)(?:\/|$|\?|#)`) and domain suffix matching, ensuring educational reading remains completely accessible.

#### Q55: Why did Wikipedia articles previously show LeetCode subtitles and coding problem chips in the side panel (Evidence E1)?
**Answer:** Prior to v1.0.8, the Side Panel UI lacked a unified taxonomy and fell back to hardcoded competitive programming strings (`"LeetCode"`, `"Explain this problem"`, `"Current solution code and constraints are already indexed"`) whenever page context lacked explicit overrides. In v1.0.8, canonical `src/shared/page-profile.ts` computes a `PageProfile` record consumed uniformly across all UI surfaces. On Wikipedia, the side panel displays `"Wikipedia"`, informational suggestion chips, generic reading empty states, and strictly disables the 1..4 coding hint stepper.

#### Q56: How does the v1.0.8 text highlighter handle inline markup, accordions, and citation markers (Evidence E2)?
**Answer:** Quotes retrieved from web pages often contain citation markers (e.g., `[1]`, `[20]`), non-breaking spaces, or typographic quotes, and can span across multiple inline tags (`<span>`, `<a>`, `<em>`) or reside inside collapsed `<details>` panels. In v1.0.8, `src/content/highlighter.ts`:
1. Uses `normaliseForMatch()` to strip citation superscripts and normalize punctuation.
2. Injects a non-destructive CSS Custom Highlight API style (`::highlight(unstuck-grounding-highlight)`).
3. Executes multi-strategy matching (exact match, prefix window, token-overlap fuzzy match).
4. Recursively traverses parent DOM nodes to open collapsed `<details>` or accordion parents containing the target quote.
5. Smoothly scrolls the element into view across any internal scrollable container.

#### Q57: How was user input loss prevented during conversational chat queries (Evidence E3)?
**Answer:** Previously, user input text in `ChatTab.tsx` was cleared immediately when the send button was clicked. If an asynchronous network error or background schema rejection occurred, the typed question was permanently lost. In v1.0.8, an optimistic UI renders the user message bubble immediately, retains the typed text in an internal buffer, and automatically restores the text into the textarea if the background fails to acknowledge the request within a 3-second watchdog timer.

#### Q58: Why were proactive Detector and Planner timings appearing in the Trace Tab for direct chat queries (Evidence E4)?
**Answer:** The multi-agent graph architecture previously logged default node timings for all nodes in its pipeline regardless of invocation entrypoint. For direct chat interactions initiated by the user, running detector and planner telemetry was inaccurate because no proactive struggle evaluation occurred. In v1.0.8, `src/background/graph/graph.ts` strictly gates detector and planner telemetry behind `isProactiveNudge: true`. Direct chat requests omit proactive nodes and tag traces with `userInitiated: true`.

---

## 6. Upfront Weaknesses & Technical Limitations (Honest Self-Critique)

In any academic or technical defense, acknowledging system limitations demonstrates engineering rigor:

1. **No Fully Offline LLM In-Browser:**
   While the Detector, Planner, BKT model, and Critic heuristics run 100% locally in the client, hint text generation requires an active internet connection to reach Google's Gemini REST API. Running a quantized 3B/7B LLM entirely inside browser WebGPU or WebAssembly is currently constrained by client hardware variability and download sizes (>2 GB).
2. **Platform DOM Dependency:**
   Web scrapers and DOM adapters inherently depend on platform markup stability. While our generic adapter fallback prevents unhandled exceptions when selectors break, optimal problem metadata extraction requires periodic maintenance when LeetCode or Codeforces redesigns their UI.
3. **Prompt Injection Defense is Defense-in-Depth, Not a Mathematical Proof:**
   Wrapping untrusted inputs in delimiters and deploying an automated Critic drastically suppresses jailbreak attempts. However, absent formal verification, LLMs are fundamentally open-ended probabilistic systems; absolute immunity against all theoretical zero-day indirect injection attacks cannot be mathematically guaranteed.
4. **Heuristic BKT Priors Across Varied Cohorts:**
   Our BKT engine uses calibrated standard priors ($P(L_0)=0.15, P(T)=0.10, P(S)=0.20, P(G)=0.25$). While effective for relative tracking, learning rates vary widely across human skill levels. A production scale system would benefit from cohort-based empirical parameter fitting.
5. **Single-Browser Verification:**
   The current release is optimized and packaged specifically for Google Chrome and Chromium-based browsers (Brave, Edge). Mozilla Firefox uses a different background script model (`background.scripts` vs `service_worker`) which would require WXT build target adjustments.

