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
**Answer:** The "Reading Carefully Protection" rule (EC-040) enforces that when wrong submissions $W = 0$ and scroll reversals $R \le 1$, $p_{\text{stuck}}$ is strictly capped at $\le 0.40$, regardless of how long the user dwells on the statement. Similarly, the "Distracted" classifier detects rapid tab switching ($\ge 4$ switches/min) with low active dwell ($< 45$s) and classifies the state as distracted rather than stuck.

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
**Answer:** When Gemini returns HTTP 429 (`ResourceExhausted`), our LLM client inspects the `Retry-After` header. It maps this to the `RATE_LIMITED` error code (S13.3) and passes the duration to the UI, which displays an active countdown timer. When the countdown reaches zero, the action button re-enables automatically.

#### Q31: How do React Error Boundaries ensure fault isolation?
**Answer:** Every major tab and panel is wrapped in an independent `ErrorBoundary`. If an uncaught rendering error occurs in the Trace tab's SVG canvas, only that tab displays a fallback error card; the Hints and Chat tabs continue functioning normally without unmounting the root application.

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

