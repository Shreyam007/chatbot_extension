# PRIVACY.md — Privacy Policy & Data Notice

**Last Updated:** October 12, 2026  
**Product Version:** Unstuck v1.0.0

---

## 1. Our Privacy Philosophy

**Unstuck** was designed from first principles as a **zero-backend, privacy-first AI tutor**. We believe that learning tools should empower students without tracking them, harvesting their code, or monetizing their personal data.

1. **Zero Intermediate Servers:** Unstuck operates entirely inside your local Google Chrome browser. We operate no cloud proxy servers, no telemetry ingestion collectors, and no hosted databases.
2. **Bring Your Own Key (BYOK):** All AI interactions communicate directly and securely from your browser to Google's Gemini REST API using your personal API key from Google AI Studio.
3. **Local Storage First:** All interaction history, hints, Bayesian mastery vectors, and diagnostic logs are stored exclusively in your browser's local storage and IndexedDB.

---

## 2. What Data Is Collected and Where It Lives

### A. Data Stored Strictly on Your Device (100% Local)

The following data never leaves your browser:

| Category | Storage Engine | Purpose | Retention |
|---|---|---|---|
| **API Key** | `chrome.storage.local` | Authenticates your direct requests to Google Gemini | Until deleted by user |
| **User Settings** | `chrome.storage.local` | Difficulty, theme, quiet hours, blocked domains | Until deleted by user |
| **Ephemeral Session State** | `chrome.storage.session` | Deduplicating in-flight requests and active tab state | Wiped on browser close |
| **Behavioral Signals** | Memory / Local Content Script | Active dwell time, scroll reversals, and submission clicks | Windowed buffer (resets on navigation) |
| **Mastery Models (BKT)** | `IndexedDB` (`unstuck_store_v2`) | Calibrates topic skill levels and recommended review | Until deleted by user |
| **Interaction Logs** | `IndexedDB` (`unstuck_store_v2`) | Audit trail of hints generated and feedback given | Ring-buffered local storage |

> [!NOTE]
> Unstuck uses `chrome.storage.local`, **not** `chrome.storage.sync`. Your settings and API keys are never synchronized across devices through Google account sync.

---

## 3. Data Egress Matrix: What Is Sent to Google Gemini

When you explicitly request an AI hint or accept a proactive nudge, the background service worker sends a structured prompt directly to `generativelanguage.googleapis.com`.

The exact data transmission matrix is shown below:

| Data Field | Sent to Google Gemini? | Guard / User Control |
|---|---|---|
| **Problem Title & Description** | **Yes** | Required to provide accurate algorithmic hints |
| **Problem Constraints & Invariants** | **Yes** | Enforces valid time and space complexity boundaries |
| **Topic Tags (e.g. Dynamic Programming)** | **Yes** | Frames pedagogical hints to the target paradigm |
| **Submission Error Verdict (e.g. WA, TLE)** | **Yes** | Helps diagnose specific algorithmic errors |
| **Code Editor Content** | **Gated by Consent** | **Controlled by `includeCodeConsent` toggle** in Settings. When disabled, your code editor is completely omitted from the prompt |
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
