# Extension Permissions Audit & Justification

Every permission declared in `manifest.json` conforms to the Chrome Web Store principle of least privilege. Unstuck operates with zero remote server dependencies; all sensitive data remains in the user's local browser environment.

---

## 1. API Permissions (`permissions`)

| Permission | One-Line Justification |
|---|---|
| `storage` | Persists user settings, Gemini BYOK credentials, topic mastery, and audit logs locally on client without an external database. |
| `sidePanel` | Displays the pedagogical tutor interface, hint ladders, chat tab, and explainability trace in Chrome's native side panel. |
| `alarms` | Schedules background timers for nudge cooldowns, bandit telemetry decay, and auto-dismissals without keeping the service worker permanently active. |
| `activeTab` | Grants temporary contextual tab access when the user clicks the Unstuck toolbar action popup. |
| `scripting` | Enables programmatic content script injection and communication with active coding problem tabs. |

---

## 2. Match Patterns & Host Permissions

| Scope | Pattern | One-Line Justification |
|---|---|---|
| **`host_permissions`** | `https://leetcode.com/*` | Required for observing editor activity, detecting stuck states, and extracting problem context on LeetCode problems. |
| **`host_permissions`** | `https://codeforces.com/*` | Required for observing editor activity, detecting stuck states, and extracting problem context on Codeforces problems. |
| **`optional_host_permissions`** | `https://*/*` | Allows users to explicitly opt-in support for additional coding platforms or mirrors via the Options page. |
| **`optional_host_permissions`** | `http://*/*` | Enables local development, fixture testing, and offline evaluation harnesses (`127.0.0.1` / `localhost`). |

---

## 3. Principle of Least Privilege Compliance
- **No Background Remote Servers:** The extension never communicates with any server other than the direct Google Gemini API endpoint using the user's own API key.
- **No Sensitive Web APIs:** No `webRequest`, `cookies`, `history`, or `tabs` management permissions are requested.
- **Fair-Play Safeguard:** When contest URLs are detected on enabled hosts (e.g., `/contest/`), all content overlays and LLM requests are silenced immediately.
