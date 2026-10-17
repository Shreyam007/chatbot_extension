# Unstuck Logging Policy

## 1. Core Principles & Philosophy
In Chromium-based browsers (Chrome, Brave, Edge), the `chrome://extensions` "Errors" page collects and highlights all `console.warn` and `console.error` invocations from service workers, content scripts, and extension views (popup, side panel, options). 

A production browser extension running under normal, daily user workflows must produce **ZERO** warnings and errors on the Errors page. 

Any extension warning or error indicates either an unhandled software bug or a design violation where expected operational states were inappropriately flagged as warnings.

---

## 2. Log Levels & Classification

| Log Level | Permitted Usage | Prohibited Usage | Console Output |
| :--- | :--- | :--- | :--- |
| **`DEBUG`** | Detailed trace information, performance timings, internal state transitions, message bus dispatch events. | Normal production alerts, user-facing notifications. | `console.debug` (suppressed by default in production) |
| **`INFO`** | **All expected operational states**: network offline, HTTP 429 / quota exhaustion, invalid or missing API key during test, contest page detected, sensitive page blocked, universal mode inactive, user cancellation/abort, navigation away, empty page context. | Real software exceptions or data corruption. | `console.info` |
| **`WARN`** | **Unexpected but successfully recovered conditions**: storage quota exceeded triggering emergency LRU trim, corrupted cache record ignored and purged, initial LLM output parse failure that was repaired by the single-shot repair prompt. | Any expected handled operational condition (offline, 429, invalid key, contest, sensitive page). | `console.warn` |
| **`ERROR`** | **True software bugs**: unhandled promise rejections, unexpected schema validation failures, uncaught React rendering crashes, unrecoverable state corruption, invariant failures. | Handled operational errors or user configuration issues. | `console.error` |

---

## 3. Strict Rules for Expected Operational States

The following conditions are normal and expected during web browsing and must **NEVER** produce `warn` or `error`:

1. **Network Offline / Disconnected:**
   - Classification: `INFO` (e.g. `logger.info('Network request aborted: user offline')`).
2. **Rate Limits & Quota Limits (HTTP 429 / Per-minute / Per-day):**
   - Classification: `INFO` (e.g. `logger.info('LLM rate limit reached; displaying cooldown notice')`).
3. **Invalid or Missing API Key (during key testing or usage):**
   - Classification: `INFO` (e.g. `logger.info('API key validation completed: invalid key')`).
4. **No Page Context / Non-Problem Page:**
   - Classification: `DEBUG` or `INFO` (e.g. `logger.debug('No code problem detected on current URL')`).
5. **Contest Page Detected:**
   - Classification: `INFO` (e.g. `logger.info('Contest detected: contest mode engaged, nudges suppressed')`).
6. **Sensitive / Financial / Government Page Detected:**
   - Classification: `INFO` (e.g. `logger.info('Sensitive page rule matched: extraction disabled')`).
7. **User Cancellation / Abort:**
   - Classification: `INFO` or `DEBUG` (e.g. `logger.debug('Hint request aborted by user navigation')`).

---

## 4. Message Formatting & Data Sanitization

1. **No Raw Objects:**
   - All diagnostic details must be serialized into a clean, human-readable string. Never pass raw JavaScript objects or unformatted error dumps directly into console methods.
   - Format: `[Unstuck][<Context>][<LEVEL>] <Message> [details: <string>]`
2. **Zero Secrets:**
   - API keys, authorization tokens, session cookies, and credentials must never appear in log output, console messages, or stack traces.
3. **Zero Raw Page Text:**
   - User document text, article contents, passwords, form values, and DOM innerHTML must never be serialized into log strings.
4. **URL Sanitization:**
   - Only log origin and sanitized pathname or route hash when diagnosing context extraction; never log full query strings or fragment parameters that may contain tokens.

---

## 5. Global Error Capture & Ring Buffer

- Unhandled window errors (`window.addEventListener('error')`) and unhandled promise rejections (`window.addEventListener('unhandledrejection')`) are intercepted globally.
- Each error record is sanitized (timestamp, context, message, stack file:line, extension version) and stored in an in-memory ring buffer (up to 50 records).
- Diagnostics are viewable by the user in **Options > About > "Recent errors"** with a **"Copy diagnostics"** button for easy reporting without leaking sensitive browsing text.
