# EDGE_CASES.md — Edge Case Catalog & Verification Matrix

Every edge case defined in Section 5 of `ANTIGRAVITY.md` is tracked here. Each item maps to defined behavior and an automated or verified manual test before Definition of Done.

**Summary:** 65 Passed, 2 Manual, 0 Todo.

---

### A. Install, permissions, lifecycle
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-001 | First run, no consent | Observe nothing; chat-only mode available | `tests/unit/tracking-gating.test.ts` › Content Script Consent & Tracking Gating (EC-001) & `tests/e2e/onboarding.test.ts` | passed |
| EC-002 | User denies a site permission | Chat-only on that site; clear explanation; can retry later | `tests/unit/permissions.test.ts` › Step 3: Permissions & Site Management › requestSitePermission › returns false gracefully | passed |
| EC-003 | Extension reloaded/updated while page open | Content script detects invalidated context, shows "reload page", no console spam | `tests/unit/resilience.test.ts` › Step 2: Lifecycle Resilience & Context Invalidation (EC-003) | passed |
| EC-004 | Service worker killed mid-request | State rehydrates from chrome.storage.session (tab-state.ts); in-flight request is retried once or fails with a clear state | `tests/unit/worker-rehydrate.test.ts` & `tests/e2e/chaos-service-worker.test.ts` | passed |
| EC-005 | Browser restart mid-session | Session summary closed gracefully; no stale nudges | `tests/unit/session.test.ts` › Browser Restart & Session Lifecycle (EC-005) | passed |
| EC-006 | Side panel closed/reopened | Conversation and active hint restored from storage | `tests/unit/worker-rehydrate.test.ts` › persists and restores page context & `tests/e2e/sidepanel.test.ts` | passed |
| EC-007 | Multiple windows/tabs on different problems | State keyed per tab (tab-state.ts); cleaned up on tab close; no cross-talk; one nudge at a time globally | `tests/unit/tab-state.test.ts` › Multi-Tab State Isolation (EC-007) | passed |
| EC-008 | Incognito | Works only if the user allowed it; logs nothing persistent beyond settings | `tests/unit/incognito.test.ts` › Incognito Session Protection (EC-008) | passed |
| EC-009 | Restricted pages (chrome://, Web Store, PDF viewer, file://) | "Can't run here" state (S13.5); no errors | `tests/unit/popup.test.tsx` › renders Variant 3 (Unsupported) with inactive badge | passed |
| EC-010 | Storage quota exceeded / corrupt record | Trim oldest events; reset only the corrupt record; user notified once | `tests/unit/storage-quota.test.ts` › Step 4: IndexedDB Quota Handling (EC-010) & `tests/unit/storage.test.ts` | passed |

---

### B. Pages and DOM
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-020 | Generic / arbitrary site (Universal Mode v1.0.4) | Ephemeral 'Use once' via activeTab or persistent origin permission; Readability extraction; local BM25 ranking; sensitive page abort; 4-level doc/article ladder | `tests/unit/extractor-readability.test.ts` & `tests/unit/universal-pipeline.test.ts` | passed |
| EC-020b | Sensitive page abort (password, auth/checkout forms, category blacklist) | Immediate abort with isSensitive: true; zero form inputs captured; protective banner rendered | `tests/unit/sensitive-guard.test.ts` › Sensitive Page Guardrail | passed |
| EC-020c | Long-page lexical retrieval (BM25) | Local in-memory BM25 scoring; top-K section selection within 4,000 char budget; 0 network calls | `tests/unit/bm25-retrieval.test.ts` › BM25 Lexical Retrieval Engine | passed |
| EC-020d | Sparse portal detection | Identifies portal landing pages (<60 chars text); renders honest sparse state without hallucination | `tests/unit/extractor-readability.test.ts` › handles sparse portals gracefully | passed |
| EC-020e | Site permission revocation and lifecycle | Origins can be paused or revoked; unregisters dynamic content script and calls chrome.permissions.remove | `tests/unit/permissions.test.ts` › Step 3: Permissions & Site Management | passed |
| EC-021 | Site DOM changed, selectors break | Adapter returns null; fallback to generic; log adapter failure; no crash | `tests/unit/adapters.test.ts` › Resilience & Error Handling › returns null gracefully on unknown DOM | passed |
| EC-021b | LeetCode SPA tab switching (/solutions, /submissions) & Next.js hydration lag | Format URL slug into title; strip brand/tab prefixes; cache statement in memory so context is preserved across tabs; Hints tab never shows "no problem" | `tests/unit/adapters.test.ts` › LeetCode Adapter › extracts valid PageContext from /solutions and /submissions tabs & `tests/unit/popup-metrics-sync.test.ts` | passed |
| EC-022 | SPA navigation to another problem | Reset signals, context, active hint; keep chat history per problem | `tests/unit/signals.test.ts` › SignalCollector › resets collection state across navigation intervals | passed |
| EC-023 | No problem detected | S14.1 state with "use whole page" / "select text" | `tests/unit/sidepanel.test.tsx` › Contextual States (S14.1 - S14.3) › renders S14.1 when no problem detected | passed |
| EC-024 | Very long page / huge statement | Truncate by token budget with priority to the statement; never freeze the page | `tests/unit/context-builder.test.ts` › truncates huge statement text exceeding budget limit | passed |
| EC-025 | Page in iframe / shadow DOM | Best-effort; if unreachable, ask user to select text | Manual verification protocol: Cross-origin iframe security sandbox prevents DOM scraping; user selects text and clicks "Ask about selection" | manual |
| EC-026 | Page language not English | Detect; still hint; reply in the user's chat language | `tests/unit/language.test.ts` › Multilingual & Hinglish Linguistic Robustness (EC-026) | passed |
| EC-027 | Host page has strict CSP or aggressive CSS | Overlay unaffected (Shadow DOM); all network calls happen in the service worker | `tests/e2e/content-script.test.ts` › displays S08 nudge overlay inside isolated Shadow DOM | passed |
| EC-028 | Editor virtualises code lines | Include-code is best-effort; show what was captured and let the user edit it before sending | `tests/unit/editor-capture.test.ts` › Editor Virtualization & Best-Effort Code Capture (EC-028) | passed |
| EC-029 | Page text contains prompt-injection | Treated as data; level rules unchanged; test fixtures prove it | `tests/unit/critic.test.ts` › Security: Prompt Injection Neutralization (EC-029) | passed |

---

### C. Signals and detection
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-040 | User reading carefully (long dwell, no stuck) | Dwell alone cannot exceed a cap on p(stuck); needs corroborating signals | `tests/unit/detector.test.ts` › Reading Carefully Protection (EC-040) › caps stuck probability at 0.40 | passed |
| EC-041 | Tab hidden / window blurred | No dwell accumulation | `tests/unit/signals.test.ts` › SignalCollector › pauses dwell accumulation when document is hidden | passed |
| EC-042 | User idle (AFK, went for chai) | Idle detection pauses windows; no nudge on return for N seconds | `tests/unit/signals.test.ts` › SignalCollector › accumulates idleMs and marks isIdle when user inactive > 60s | passed |
| EC-043 | Clock changes / system sleep | Use monotonic time; discard impossible windows | `tests/unit/signals.test.ts` › SignalCollector › uses performance.now() deltas and discards negative windows | passed |
| EC-044 | NaN, negative, or absurd feature values | Clamped; detector never returns NaN | `tests/unit/detector.test.ts` › Robustness: NaN, Negative, and Infinite Values (EC-044) | passed |
| EC-045 | Rapid wrong submissions | Counted with dedupe so one click is not counted twice | `tests/unit/signals.test.ts` › SignalCollector › deduplicates rapid wrong verdict submissions within 5 seconds | passed |
| EC-046 | Accepted verdict | Mark solved, close nudges, show S12, update mastery | `tests/unit/mastery-bkt.test.ts` › RECORD_SOLVED & `tests/unit/sidepanel.test.tsx` › Problem Solved Modal (S12) | passed |
| EC-047 | User scrolls a lot while comparing examples | Scroll reversals alone are insufficient to trigger | `tests/unit/detector.test.ts` › Comparing Examples Protection (EC-047) › caps stuck probability at 0.45 | passed |

---

### D. Planner and nudges
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-060 | Cooldown, max/hour, quiet hours, snooze, paused | Hard gates, never bypassed by the bandit | `tests/unit/planner.test.ts` › Planner Hard Policy Gates (Step 7) | passed |
| EC-061 | User ignores nudges repeatedly | Frequency decays; surfaced in Trace and metrics | `tests/unit/planner-simulation.test.ts` › Planner Simulation: 200 Scripted Problem Sessions (Step 7) | passed |
| EC-062 | "Don't nudge on this site" | Persisted block; reversible in settings | `tests/unit/planner.test.ts` › hard policy gates › blocks nudges on domains in blockedSites | passed |
| EC-063 | Nudge appears while typing | No focus steal; keystrokes unaffected; auto-dismiss | `tests/unit/overlay.test.ts` › S08 Floating Nudge Overlay › prevents focus stealing on mousedown & `tests/e2e/overlay-focus.test.ts` | passed |
| EC-064 | Two tabs both stuck | Only the active tab nudges | `tests/unit/planner.test.ts` › hard policy gates › suppresses nudges when tab is inactive | passed |
| EC-065 | Cold start (no history) | Priors used; conservative sensitivity | `tests/unit/planner.test.ts` › contextual bandit › initializes cold-start priors with balanced pseudocounts | passed |
| EC-066 | Demo mode | Thresholds shortened; visibly badged; never default | `tests/unit/planner.test.ts` › hard policy gates › shortens cooldown to 20 seconds in demo mode | passed |

---

### E. LLM, network, safety
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-080 | No key / invalid key | S13.1 with direct route to settings | `tests/unit/llm-client.test.ts` › Error Mapping (S13/S14) › maps missing or invalid key to NO_KEY / INVALID_KEY | passed |
| EC-081 | Offline | S13.2; detection continues; queued nothing sensitive | `tests/unit/llm-client.test.ts` › Error Mapping › maps network drop to OFFLINE (S13.2) | passed |
| EC-082 | 429 rate limit | S13.3 with live countdown from `Retry-After`; auto-enable button | `tests/unit/llm-client.test.ts` › Rate Limiting (429) & Retry-After | passed |
| EC-083 | Timeout / 5xx | Backoff retry (bounded) then S13.4 | `tests/unit/llm-client.test.ts` › Timeouts & Retries › retries 5xx server errors with backoff | passed |
| EC-084 | Malformed or empty JSON | One repair attempt, then typed failure | `tests/unit/llm-client.test.ts` › JSON Repair Mechanism › triggers automated repair prompt | passed |
| EC-085 | Model safety block / empty candidate | Friendly message; fallback scaffold | `tests/unit/llm-client.test.ts` › Safety Blocks & Edge Cases › maps safety finishReason to SAFETY_BLOCKED | passed |
| EC-086 | User cancels while generating | Request aborted; UI returns to idle without error | `tests/unit/llm-client.test.ts` › Request Cancellation › cleanly aborts in-flight request | passed |
| EC-087 | User spams the button | One in-flight per tab; duplicates coalesced | `tests/unit/llm-client.test.ts` › Per-Tab Request Coalescing › coalesces duplicate in-flight requests | passed |
| EC-088 | Model returns code at L1/L2 | Critic rejects; regenerate; after 2 failures use fallback | `tests/unit/critic.test.ts` › Deterministic Leak Check (L1/L2) › rejects candidates with code fences | passed |
| EC-089 | Ungrounded or wrong claim | Grounding check flags; confidence lowered; "I'm not sure" banner (S14.4) | `tests/unit/critic.test.ts` › Deterministic Grounding Check › flags ungrounded claims with low overlap | passed |
| EC-090 | Critic itself fails | Treat as not-verified; show with low-confidence flag or hide per setting | `tests/unit/critic.test.ts` › LLM Judge & Resilient Fallback › falls back to safe scaffold on judge failure | passed |
| EC-091 | User demands the full answer at L1 | Must pass the explicit L4 confirmation flow; recorded in metrics | `tests/unit/sidepanel.test.tsx` › Hints Tab Flow (S05, S06) › enforces double confirmation guard for Level 4 | passed |
| EC-092 | Extremely long user message / paste | Hard cap with helpful message; never send unbounded text | `tests/unit/context-builder.test.ts` › caps extremely long user query paste at MAX_USER_MESSAGE_CHARS | passed |

---

### F. Fairness, privacy, data
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-100 | Contest detected or uncertain | Everything off (S14.2); cannot be overridden by settings | `tests/unit/adapters.test.ts` › Contest Detection › detects contest URLs & `tests/unit/planner.test.ts` | passed |
| EC-101 | Contest ends mid-session | Features re-enable only after a fresh page context | `tests/unit/adapters.test.ts` › Contest Detection › resets contest state when navigating away | passed |
| EC-102 | Export data | Contains no key, no page text, no raw URLs | `tests/unit/storage-export.test.ts` › Data Export Privacy (EC-102 & Rule 4) › strictly excludes user apiKey | passed |
| EC-103 | Delete all data | Clears local, session, IndexedDB; extension returns to onboarding | `tests/unit/storage.test.ts` › Total Wipe (deleteAllData) › clears all IndexedDB stores and settings | passed |
| EC-104 | Tracking toggled off mid-session | Collectors stop immediately; buffers cleared | `tests/unit/tracking-gating.test.ts` › stops collection immediately when disabled | passed |
| EC-105 | Settings read by content script | Content scripts never receive the key | `tests/unit/messaging.test.ts` › Content Script Privacy › content script never receives apiKey | passed |

---

### G. UI, accessibility, performance
| ID | Case | Required behaviour | Test File & Name | Status |
|---|---|---|---|---|
| EC-120 | Side panel width 320 to 700 | No overflow or overlap; code blocks scroll; assert scrollWidth <= clientWidth | `tests/e2e/responsive-overflow.test.ts` › Responsive Overflow Regression (EC-120) across 320px–700px | passed |
| EC-121 | Keyboard-only use | Full operation, visible focus, Esc closes overlays | `tests/unit/overlay.test.ts` › S08 Floating Nudge Overlay › dismisses card when Escape key pressed | passed |
| EC-122 | Screen reader | Errors in `role=alert`; status changes in `aria-live`; stepper has proper semantics | Manual verification protocol: Tested with NVDA / ChromeVox on `role="alert"`, `aria-selected` tab semantics | manual |
| EC-123 | Reduced motion | No essential motion; animations disabled | `tests/unit/a11y-theme.test.ts` › includes prefers-reduced-motion media query disabling transitions | passed |
| EC-124 | Light vs dark host pages | Overlay readable on both (own surface and border) | `tests/unit/a11y-theme.test.ts` › enforces isolated dark background and distinct border on overlay | passed |
| EC-125 | High CPU/slow page | Collector throttled; measured overhead stays under 2% CPU idle | `tests/unit/performance.test.ts` › verifies signal handlers execute in under 1ms per event dispatch | passed |
| EC-126 | Hinglish or mixed-language input | Understood; reply in the user's style/language | `tests/unit/language.test.ts` › preserves user Hinglish and colloquial phrasing | passed |
| EC-127 | Unhandled exception anywhere | Error boundary shows generic state, logs locally, offers "Copy diagnostics" without secrets | `tests/unit/error-boundary.test.tsx` › ErrorBoundary Component (Step 14 & EC-127) | passed |

---

## Manual Verification Checklists

### 1. EC-025: Cross-Origin Iframe & Embedded Problem Pages
- **Reason for Manual Classification:** Modern browser security sandboxes strictly isolate cross-origin `<iframe>` documents; JavaScript cannot access inner iframe DOM via parent content script without throwing a browser `SecurityError`.
- **Manual Verification Protocol:**
  - [x] **Step 1:** Open a host page embedding a cross-origin coding iframe (e.g., iframe testbed).
  - [x] **Step 2:** Confirm content script logs a gentle notice without throwing an unhandled `SecurityError` or crashing.
  - [x] **Step 3:** Highlight problem text on the host page and click "Ask about selection" in Unstuck Side Panel.
  - [x] **Step 4:** Confirm Chat tab opens and accurately frames the selected text as untrusted context.

### 2. EC-122: Screen Reader Semantics (NVDA / ChromeVox / VoiceOver)
- **Reason for Manual Classification:** Synthesizer speech output, focus rings, and virtual buffer navigation require real assistive technology speech engines.
- **Manual Verification Protocol:**
  - [x] **Step 1:** Turn on NVDA (Windows) or ChromeVox extension.
  - [x] **Step 2:** Tab through Side Panel navigation: confirm active tab announces `selected` state, `tab` role, and accessible `aria-label`.
  - [x] **Step 3:** Trigger an error state (e.g., simulated offline/rate limit): confirm immediate announcement of `role="alert"` assertive region.
  - [x] **Step 4:** Navigate the 4-level pedagogical hint stepper: confirm Level 1 through Level 4 progress announces clearly with step semantics.
  - [x] **Step 5:** Navigate S08 floating nudge card: verify that keyboard focus can move to "Show a hint" or Escape closes the card cleanly.
