# MANUAL_QA.md — Step-by-Step Manual QA Checklist for Google Chrome

This checklist guides manual quality assurance for **Unstuck v1.0.0** in a real Google Chrome / Chromium browser environment.

---

## 1. Extension Installation & Asset Verification

- [ ] **1.1 Unpacked Load:**
  1. Open Chrome and navigate to `chrome://extensions/`.
  2. Enable **Developer mode** toggle in the top-right corner.
  3. Click **Load unpacked** and select the `.output/chrome-mv3` directory.
  4. Verify the extension appears with name **"Unstuck: AI Coding Tutor"**, version **"1.0.0"**, and no error badge.
- [ ] **1.2 Packaged Zip Verification:**
  1. Extract `.output/unstuck-1.0.0-chrome.zip` to a test folder.
  2. Load unpacked from the extracted folder.
  3. Verify all assets (HTML, scripts, icons) load without missing file warnings.
- [ ] **1.3 Icon Assets:**
  1. Confirm the toolbar icon renders cleanly at high DPI (green knot logo on dark background).
  2. Inspect icon sizes: 16px, 32px, 48px, and 128px rendered in extension manager and toolbar.

---

## 2. First-Run Onboarding & BYOK Configuration

- [ ] **2.1 Onboarding Flow:**
  1. Click the Unstuck toolbar icon or open `chrome-extension://<id>/options.html`.
  2. Confirm the Onboarding Wizard renders step 1 (Welcome & Philosophy).
  3. Advance to step 2 (Bring Your Own Key).
- [ ] **2.2 API Key Configuration & Validation:**
  1. Paste a valid Google Gemini API key (`AIzaSy...`).
  2. Click **"Test Connection"**: verify it validates with a green success badge.
  3. Test error handling: enter an invalid key (e.g. `AIzaSyInvalidKeyTest1234567890`) and click test; verify it displays clear HTTP 400 error guidance.
  4. Re-enter the valid key and save.
- [ ] **2.3 Site Permissions & Consents:**
  1. In Settings, verify LeetCode and Codeforces are enabled.
  2. Verify the **"Include my code in AI context"** toggle works and persists across page reloads.

---

## 3. LeetCode Problem Interaction & Passive Observation

- [ ] **3.1 Problem Detection:**
  1. Navigate to a live LeetCode problem (e.g., `https://leetcode.com/problems/two-sum/`).
  2. Click the toolbar icon: verify Toolbar Popup (Variant 1) shows **"Watching"**, domain `leetcode.com`, and session stats.
  3. Open Chrome Side Panel (`⌥S` or right-click extension icon -> Open side panel).
  4. Verify the Side Panel recognizes the problem title and tags.
- [ ] **3.2 Focus-Safe Nudge Overlay (S08):**
  1. Scroll through the problem statement and type code into the Monaco editor.
  2. In Demo Mode (or after sustained dwell/wrong submit), observe the floating **Nudge Card** slide into the bottom-right corner.
  3. **Focus Verification:** While the nudge card is animating or visible, continue typing in Monaco. Verify that **zero keystrokes are dropped** and keyboard focus is **never stolen**.
  4. Press `Escape`: verify the nudge dismisses smoothly and collapses into the 40px green beacon.
  5. Click the green beacon: verify it expands back to the nudge card.

---

## 4. Progressive Socratic Hinting & Critic Verification

- [ ] **4.1 Level 1 (Direction):**
  1. On the nudge card or in the Side Panel Hints tab, request a hint.
  2. Verify Level 1 renders within 2–3 seconds.
  3. **Zero Code Leak Verification:** Verify Level 1 contains strictly conceptual guidance (invariants, paradigms), **zero code syntax**, and **zero code blocks**.
  4. Verify the grounded citation chip displays verbatim text from the problem statement.
- [ ] **4.2 Level 2 (Approach):**
  1. Click **"Make it more direct"** to advance to Level 2.
  2. Verify algorithmic outline is delivered without full code implementations.
- [ ] **4.3 Level 3 (Pseudocode):**
  1. Advance to Level 3: verify structural pseudocode is provided.
- [ ] **4.4 Level 4 (Full Code) Confirmation Guard:**
  1. Click **"Reveal full solution"**.
  2. Verify the **double-confirmation warning dialog** appears, explaining that viewing code reduces learning gains.
  3. Click **"Confirm & Reveal"**: verify full code syntax is unlocked with syntax highlighting and a "Copy Code" button.
- [ ] **4.5 Problem Solved Flow (S12):**
  1. Click **"I solved it!"** in the Hints tab (or submit an Accepted verdict on LeetCode).
  2. Verify the Solved Modal renders with a congratulatory banner, 2x2 session stats, and BKT mastery delta.

---

## 5. Codeforces Adapter Verification

- [ ] **5.1 Problem Extraction:**
  1. Navigate to a Codeforces problem (e.g., `https://codeforces.com/problemset/problem/1/A`).
  2. Open the Side Panel: verify problem name ("Theatre Square"), time limit, and memory limit are correctly identified.
  3. Request a hint: verify generated guidance specifically addresses the Codeforces problem formulation.

---

## 6. Contest Fair-Play Lock (EC-100)

- [ ] **6.1 LeetCode Contest:**
  1. Navigate to `https://leetcode.com/contest/`.
  2. Verify the Side Panel displays the **S14.2 Contest Fairness Shield**.
  3. Verify the toolbar popup displays Variant 4 (Contest Shield).
  4. Verify nudge overlays are strictly suppressed and hint generation is locked.
- [ ] **6.2 Codeforces Contest:**
  1. Navigate to an active Codeforces contest URL (e.g. `/contest/` route).
  2. Confirm the fair-play lock activates immediately.

---

## 7. Keyboard Navigation & Accessibility (a11y)

- [ ] **7.1 Keyboard-Only Navigation:**
  1. Open Side Panel and press `Tab` / `Shift+Tab`.
  2. Verify visible focus outlines on all tabs, prompt chips, and buttons.
  3. Use arrow keys to navigate between Chat, Hints, Trace, and Progress tabs.
- [ ] **7.2 Responsive Layout:**
  1. Resize the Chrome Side Panel width from 320px to 700px.
  2. Verify no horizontal scrollbars appear on text, no UI clipping, and code snippets scroll horizontally inside code blocks.

---

## 8. Data Privacy, Audit Logs & Destructive Reset

- [ ] **8.1 Data Transparency Table:**
  1. Open `chrome-extension://<id>/options.html#privacy`.
  2. Review the live data transparency table. Confirm it clearly itemizes all data fields sent to Gemini vs kept local.
- [ ] **8.2 Telemetry Export:**
  1. Click **"Export Data (JSON)"**: save the file and open it.
  2. Confirm `apiKey` is **not** present anywhere in the export.
  3. Click **"Export Metrics (CSV)"** and **"Export Metrics (Markdown)"**: verify clean file downloads.
- [ ] **8.3 Total Wipe ("DELETE" Modal):**
  1. Click **"Delete all data"**.
  2. Verify the "Permanently Erase" button remains disabled until `"DELETE"` is typed exactly.
  3. Type `"DELETE"` and confirm.
  4. Verify IndexedDB and Chrome storage are wiped, and the extension returns to the initial onboarding screen.

---

## 9. Universal Mode & Arbitrary Website Verification (v1.0.4)

- [ ] **9.1 Toolbar Popup on Un-enabled Site (e.g. Wikipedia):**
  1. Navigate to a technical article (e.g., `https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm`).
  2. Click the extension toolbar icon.
  3. Verify popup displays the Universal Mode enablement card with three distinct actions:
     - **"Use on this page once"** (activeTab ephemeral execution)
     - **"Always allow on en.wikipedia.org"** (origin permission request + dynamic script registration)
     - **"Open chat without page"** (standalone tutor with zero page scraping)
  4. Verify footer cleanly displays `v1.0.4 • <selected Gemini model>` with zero "Local LLM" or dead "Open scratchpad panel" buttons.
- [ ] **9.2 "Use on this page once" & Readability Extraction:**
  1. Click **"Use on this page once"**.
  2. Verify the side panel opens immediately, showing the **"Article"** content-type badge and page domain.
  3. In the Hints tab, verify the dynamic ladder displays **Pointer / Explain Simply / Worked Example / Full Explanation** instead of coding problem steps.
- [ ] **9.3 "What will be sent to the AI" Preview Modal:**
  1. Ask a question: *"What is the time complexity with a min-priority queue?"*.
  2. Before dispatch, confirm the **Send Preview Modal** appears with character count, page title, and editable text excerpt.
  3. Confirm the modal provides:
     - **"Include page text"** toggle
     - **"Never send page text from this site"** checkbox option
  4. Click **"Send to AI"** and verify the answer grounds strictly on the extracted Dijkstra article text.
  5. Inspect the Trace tab: verify retrieved BM25 section headings are transparently itemized.
- [ ] **9.4 Sparse Portal Detection (e.g. wikipedia.org):**
  1. Navigate to the landing page `https://www.wikipedia.org/` (portal without article prose).
  2. Click **"Use on this page once"**.
  3. Verify the Side Panel displays the honest sparse state: *"Not enough readable text found on this portal. Select specific text to ask about, or open chat without page context."*
- [ ] **9.5 Sensitive Page Guardrail & Blacklist:**
  1. Navigate to a login or checkout page (or load `tests/fixtures/login-form.html`).
  2. Click the toolbar icon or trigger extraction.
  3. Verify extraction **immediately aborts** with `isSensitive: true`.
  4. Verify the Side Panel renders the safety banner: *"Extraction disabled on sensitive pages (login/payment forms detected)."*
  5. Verify zero form inputs, textareas, or password values are transmitted or stored.
- [ ] **9.6 Settings > Allowed Sites Management & Revocation:**
  1. Click the Settings gear icon and select the **"Allowed Sites"** tab (`#sites`).
  2. Verify all granted origins are displayed with status, grant date, and actions (**Pause**, **Resume**, **Revoke**).
  3. Click **"Pause"**: verify origin status updates to Paused.
  4. Click **"Revoke"**: confirm the origin is removed from storage and `chrome.permissions.remove()` is called.
  5. Review the **Sensitive Page Blacklist** section: verify built-in categories (banking, webmail, checkout, health) are displayed and custom regex patterns can be added.

