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
| **`optional_host_permissions`** | `https://*/*` | Powers Universal Mode (v1.0.4). Allows users to opt-in any article, documentation, or blog on a per-site basis. |
| **`optional_host_permissions`** | `http://*/*` | Enables local development, localhost testing, and offline evaluation harnesses (`127.0.0.1` / `localhost`). |

---

## 3. Universal Mode Dynamic Permissions & Lifecycle (v1.0.4)

Unstuck strictly avoids broad always-on host permissions. Arbitrary web access is 100% opt-in and user-granted:

1. **"Use on this page once":**
   - Activated via toolbar popup button on any standard HTTP(S) page.
   - Uses `activeTab` permission + `chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/content.js'] })`.
   - Injects the content script into the active tab for the current session only.
   - Zero persistent permissions or background registrations stored.
2. **"Always allow on this site":**
   - Triggers native Chrome permission prompt via `chrome.permissions.request({ origins: [originPattern] })`.
   - Requires explicit user consent. Once granted, registers a persistent dynamic content script for that origin using `chrome.scripting.registerContentScripts({ id, matches: [originPattern], js: ['content-scripts/content.js'] })`.
   - Persisted in Settings under `allowedOrigins`.
3. **Site Revocation & Pause:**
   - Any allowed site can be paused or revoked at any time from Options Settings > Allowed Sites.
   - Revocation calls `chrome.scripting.unregisterContentScripts({ ids: [id] })` and removes the origin from browser permissions with `chrome.permissions.remove({ origins: [originPattern] })`.
4. **Sensitive Page Guardrails:**
   - Universal Mode automatically checks for password inputs, checkout/payment forms, authentication gateways, and built-in blacklisted categories (banking, webmail, health, government, password vaults).
   - If detected, extraction is aborted immediately and no page content is ever read or transmitted.

---

## 4. Principle of Least Privilege Compliance
- **No Broad Default Injections:** The manifest content script matches ONLY LeetCode and Codeforces by default. All other web pages require explicit user gesture opt-in.
- **No Background Remote Servers:** The extension communicates exclusively with the direct Google Gemini API endpoint using the user's BYOK key.
- **No Sensitive Web APIs:** No `webRequest`, `cookies`, `history`, or broad `tabs` permissions are declared.
- **Fair-Play Safeguard:** When contest URLs are detected on enabled hosts (e.g., `/contest/`), all content overlays and LLM requests are silenced immediately.
