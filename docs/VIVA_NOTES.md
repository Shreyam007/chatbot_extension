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
   - Ensure a valid Gemini API key is configured (or keep local fixture server ready).
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

## 3. Contingency Protocols (What to do if something fails during the live demo)

### Scenario A: Google Gemini API Rate Limit (HTTP 429)
1. **Symptom:** UI displays the amber S13.3 "Rate limited" screen with a countdown timer.
2. **What to Say:**
   > *"Notice how gracefully our extension handles provider rate limits. Instead of a generic error or silent crash, our LLM client parsed the HTTP 429 `Retry-After` header and displayed this live countdown. As soon as the countdown hits zero, the retry button re-enables automatically."*
3. **Action:** Wait 3 seconds for the countdown to expire and click "Try Again".

### Scenario B: Internet Disconnects or API Outage
1. **Symptom:** Red offline banner or S13.2 error card.
2. **What to Say:**
   > *"The live connection dropped. Notice that Unstuck's local telemetry and signal collector continue running offline without throwing uncaught exceptions. Let me switch to our offline benchmark replay to show the reproducible results."*
3. **Action:** Run `npm run eval` in terminal to show the 15-problem verified benchmark table, or switch to the Backup Screen Recording.

### Scenario C: Unrecoverable Browser or System Freeze
1. **Action:** Immediately open the backup video file (`unstuck_demo_viva_backup.mp4`).
2. **What to Say:**
   > *"I have a high-definition backup recording of the complete live workflow captured earlier today. Let me play the 5-minute walkthrough from this recording."*

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
