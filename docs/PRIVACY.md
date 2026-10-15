# PRIVACY.md — Privacy Policy & Data Notice

**Last Updated:** October 15, 2026  
**Product Version:** Unstuck v1.0.5

---

## 1. Our Privacy Philosophy

**Unstuck** was designed from first principles as a **zero-backend, privacy-first AI tutor**. We believe that learning tools should empower students without tracking them, harvesting their code, or monetizing their personal data.

> **Canonical Privacy Guarantee:**  
> *"Your key is stored only on this device (chrome.storage.local) and sent only to Google's Gemini API via secure HTTP headers with your requests. We run no servers."*

1. **Zero Intermediate Servers:** Unstuck operates entirely inside your local Google Chrome browser. We operate no cloud proxy servers, no telemetry ingestion collectors, and no hosted databases.
2. **Bring Your Own Key (BYOK) via Secure Headers:** All AI interactions communicate directly and securely from your browser service worker to Google's Gemini REST API using your personal API key transmitted via the `'x-goog-api-key'` HTTP header (never exposed in URL query parameters, network logs, or history).
3. **Local Storage First:** All interaction history, hints, Bayesian mastery vectors, and diagnostic logs are stored exclusively in your browser's local storage and IndexedDB.
4. **Universal Mode Opt-In Per Site (v1.0.4):** Outside of the two core coding platforms (LeetCode, Codeforces), Unstuck NEVER activates, injects, or reads content from any webpage without explicit user consent.

---

## 2. Universal Mode & Sensitive Page Guardrails (v1.0.4)

When browsing documentation, tech articles, blogs, or general web pages in Universal Mode:

1. **Opt-in per Site:**
   - Single-use: Clicking "Use on this page once" in the popup injects via `activeTab` only for the current tab lifecycle.
   - Persistent: Clicking "Always allow on this site" requests runtime permission (`chrome.permissions.request`) and dynamically registers content scripts for that origin only.
2. **First-Request Send Preview:**
   - Before your first question or hint on any generic site, Unstuck displays a modal previewing the exact text excerpt to be sent to Gemini.
   - You can edit/trim the text, exclude page text entirely, or mark the domain as "Never send page text".
3. **Zero Form / Password Reading:**
   - Unstuck strictly ignores all `<input>`, `<textarea>`, `<select>`, and `[contenteditable]` elements on generic sites. `readEditorCode` unconditionally returns `null`.
4. **Automatic Sensitive Page Abort:**
   - If a page contains `<input type="password">`, login/auth forms, or credit card/checkout fields, content extraction is **completely aborted** and a guarded state banner is displayed in the side panel.
   - Built-in category blacklists automatically block extraction on banking portals, payment processors, webmail providers, electronic medical records, government identity services, and cloud password vaults. Users can add custom regex patterns in Settings > Allowed Sites.
5. **Local Lexical BM25 Ranking:**
   - For long documentation and articles, section selection is performed by a local, in-memory BM25 lexical retriever. It makes zero network calls and generates zero external embeddings.
6. **Incognito Session Hygiene:**
   - In incognito windows, all interaction logs, hints, and event recording to IndexedDB are disabled to guarantee zero data persistence.

---

## 3. What Data Is Collected and Where It Lives

### A. Data Stored Strictly on Your Device (100% Local)

The following data never leaves your browser:

| Category | Storage Engine | Purpose | Retention |
|---|---|---|---|
| **API Key** | `chrome.storage.local` | Authenticates your direct requests to Google Gemini | Until deleted by user |
| **User Settings** | `chrome.storage.local` | Difficulty, theme, quiet hours, allowed sites, custom blacklist | Until deleted by user |
| **Ephemeral Session State** | `chrome.storage.session` | Deduplicating in-flight requests and per-tab state | Wiped on browser close |
| **Nudge Diagnostics Ring Buffer** | `chrome.storage.session` | Last 50 nudge decisions (numerical metrics only, zero URLs or page text) | Wiped on browser close |
| **Behavioral Signals** | Memory / Local Content Script | Active dwell time, scroll reversals, and submission clicks | Windowed buffer (resets on navigation) |
| **Mastery Models (BKT)** | `IndexedDB` (`unstuck_store_v2`) | Calibrates topic skill levels and recommended review (coding only) | Until deleted by user |
| **Interaction Logs** | `IndexedDB` (`unstuck_store_v2`) | Audit trail of hints generated and feedback given | Ring-buffered local storage |

> [!NOTE]
> Unstuck uses `chrome.storage.local`, **not** `chrome.storage.sync`. Your settings and API keys are never synchronized across devices through Google account sync.

---

## 4. Data Egress Matrix: What Is Sent to Google Gemini

When you explicitly request an AI hint or submit a chat question, the background service worker sends a structured prompt directly to `generativelanguage.googleapis.com`.

The exact data transmission matrix is shown below:

| Data Field | Sent to Google Gemini? | Guard / User Control |
|---|---|---|
| **Page / Problem Title & Excerpt** | **Yes** | Required to ground pedagogical responses. Previewed and editable via Send Preview Modal on generic sites |
| **User Question** | **Yes** | Your explicit query in the Chat tab |
| **User Selected Text** | **Yes (When Selected)** | Prioritized if you highlight a specific paragraph on the page |
| **Problem Constraints & Tags** | **Yes (Coding sites)** | Enforces valid time and space complexity boundaries |
| **Submission Error Verdict (e.g. WA, TLE)** | **Yes (Coding sites)** | Helps diagnose specific algorithmic errors |
| **Code Editor Content** | **Gated by Consent** | **Controlled by `includeCodeConsent` toggle** in Settings. Completely disabled on generic sites |
| **Form Inputs & Passwords** | **No (Never Extracted)** | Form fields and textareas are sanitized and stripped on generic sites |
| **Active Dwell & Scroll Telemetry** | **No (Local Only)** | Evaluated strictly on your machine by our logistic detector |
| **Keystrokes & Typing Cadence** | **No (Never Collected)** | Unstuck does not log keystrokes or text outside the editor |
| **Account Credentials & Cookies** | **No (Never Collected)** | Cookies and session auth tokens are strictly stripped |
| **Screen Pixels / Video Recordings** | **No (Never Collected)** | Unstuck does not capture screenshots, canvas buffers, or video |

---

## 4. User Controls & Self-Sovereignty

You maintain absolute control over your data at all times:

1. **Code Inclusion Toggle:** In Settings -> General, you can toggle **"Include my code in AI context"** off. Hints will still be generated based on the problem statement without reading your editor buffer.
2. **Domain Blacklisting:** You can click "Don't nudge on this site" on any nudge card or configure blocked domains in Settings to silence the extension on specific platforms.
3. **Contest Fair-Play Lock:** On contest URLs (`/contest/`), all AI intervention is automatically silenced and no prompts are dispatched.
4. **Data Export:** You can export your complete history at any time from Settings:
   - **JSON Export:** Full raw dump of local storage and IndexedDB.
   - **CSV / Markdown Export:** Structured metrics tables for personal review.
   *(All exports strictly exclude your API key and raw web cookies).*
5. **Irreversible Data Erasure:** In Settings -> Privacy & Storage, clicking **"Delete all data"** and typing `"DELETE"` completely wipes `chrome.storage.local`, `chrome.storage.session`, and deletes the `unstuck_store_v2` IndexedDB database.

---

## 5. Third-Party Service Providers

When you use your Google Gemini API key:
- Network requests travel via HTTPS directly between your browser and `https://generativelanguage.googleapis.com`.
- Data handling by Google is governed by the [Google AI Studio Terms of Service](https://ai.google.dev/terms) and [Google Privacy Policy](https://policies.google.com/privacy).
- We do not share your data with advertisers, data brokers, or any other third parties.

---

## 6. Questions & Contact

For questions, audit requests, or bug reports regarding Unstuck's privacy practices, open an issue on the project repository:  
https://github.com/Shreyam007/chatbot_extension
