# EDGE_CASES.md — Edge Case Catalog & Verification Matrix

Every edge case defined in Section 5 of `ANTIGRAVITY.md` is tracked here. Each item must map to defined behavior and an automated test before Definition of Done.

---

### A. Install, permissions, lifecycle
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-001 | First run, no consent | Observe nothing; chat-only mode available | `tests/unit/tracking-gating.test.ts` & `tests/e2e/onboarding.test.ts` | passed |
| EC-002 | User denies a site permission | Chat-only on that site; clear explanation; can retry later | `tests/unit/tracking-gating.test.ts` & `tests/unit/permissions.test.ts` | passed |
| EC-003 | Extension reloaded/updated while page open | Content script detects invalidated context, shows "reload page", no console spam | `tests/unit/resilience.test.ts` | passed |
| EC-004 | Service worker killed mid-request | State rehydrates; in-flight request is retried once or fails with a clear state | `tests/unit/worker-rehydrate.test.ts` | todo |
| EC-005 | Browser restart mid-session | Session summary closed gracefully; no stale nudges | `tests/unit/session.test.ts` | todo |
| EC-006 | Side panel closed/reopened | Conversation and active hint restored from storage | `tests/e2e/sidepanel-state.test.ts` | todo |
| EC-007 | Multiple windows/tabs on different problems | State keyed per tab; no cross-talk; one nudge at a time globally | `tests/unit/tab-state.test.ts` | todo |
| EC-008 | Incognito | Works only if the user allowed it; logs nothing persistent beyond settings | `tests/unit/incognito.test.ts` | todo |
| EC-009 | Restricted pages (chrome://, Web Store, PDF viewer, file://) | "Can't run here" state (S13.5); no errors | `tests/e2e/restricted-pages.test.ts` | todo |
| EC-010 | Storage quota exceeded / corrupt record | Trim oldest events; reset only the corrupt record; user notified once | `tests/unit/storage-quota.test.ts` & `tests/unit/storage.test.ts` | passed |

---

### B. Pages and DOM
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-020 | Unknown site | Generic extraction; offer "select text to ask about" | `tests/unit/adapter-generic.test.ts` | todo |
| EC-021 | Site DOM changed, selectors break | Adapter returns null; fallback to generic; log adapter failure; no crash | `tests/unit/adapter-resilience.test.ts` | todo |
| EC-022 | SPA navigation to another problem | Reset signals, context, active hint; keep chat history per problem | `tests/e2e/spa-nav.test.ts` | todo |
| EC-023 | No problem detected | S14.1 state with "use whole page" / "select text" | `tests/e2e/empty-context.test.ts` | todo |
| EC-024 | Very long page / huge statement | Truncate by token budget with priority to the statement; never freeze the page | `tests/unit/context-builder.test.ts` | todo |
| EC-025 | Page in iframe / shadow DOM | Best-effort; if unreachable, ask user to select text | `tests/e2e/iframe-dom.test.ts` | todo |
| EC-026 | Page language not English | Detect; still hint; reply in the user's chat language | `tests/unit/language.test.ts` | todo |
| EC-027 | Host page has strict CSP or aggressive CSS | Overlay unaffected (Shadow DOM); all network calls happen in the service worker | `tests/e2e/overlay-isolation.test.ts` | todo |
| EC-028 | Editor virtualises code lines | Include-code is best-effort; show what was captured and let the user edit it before sending | `tests/unit/editor-capture.test.ts` | todo |
| EC-029 | Page text contains prompt-injection | Treated as data; level rules unchanged; test fixtures prove it | `tests/unit/injection.test.ts` | todo |

---

### C. Signals and detection
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-040 | User reading carefully (long dwell, no stuck) | Dwell alone cannot exceed a cap on p(stuck); needs corroborating signals | `tests/unit/detector.test.ts` | todo |
| EC-041 | Tab hidden / window blurred | No dwell accumulation | `tests/unit/signals.test.ts` | todo |
| EC-042 | User idle (AFK, went for chai) | Idle detection pauses windows; no nudge on return for N seconds | `tests/unit/signals.test.ts` | todo |
| EC-043 | Clock changes / system sleep | Use monotonic time; discard impossible windows | `tests/unit/signals.test.ts` | todo |
| EC-044 | NaN, negative, or absurd feature values | Clamped; detector never returns NaN | `tests/unit/detector.test.ts` | todo |
| EC-045 | Rapid wrong submissions | Counted with dedupe so one click is not counted twice | `tests/unit/signals.test.ts` | todo |
| EC-046 | Accepted verdict | Mark solved, close nudges, show S12, update mastery | `tests/unit/verdict.test.ts` | todo |
| EC-047 | User scrolls a lot while comparing examples | Scroll reversals alone are insufficient to trigger | `tests/unit/detector.test.ts` | todo |

---

### D. Planner and nudges
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-060 | Cooldown, max/hour, quiet hours, snooze, paused | Hard gates, never bypassed by the bandit | `tests/unit/planner.test.ts` | todo |
| EC-061 | User ignores nudges repeatedly | Frequency decays; surfaced in Trace and metrics | `tests/unit/bandit.test.ts` | todo |
| EC-062 | "Don't nudge on this site" | Persisted block; reversible in settings | `tests/unit/planner.test.ts` | todo |
| EC-063 | Nudge appears while typing | No focus steal; keystrokes unaffected; auto-dismiss | `tests/e2e/nudge-focus.test.ts` | todo |
| EC-064 | Two tabs both stuck | Only the active tab nudges | `tests/unit/planner.test.ts` | todo |
| EC-065 | Cold start (no history) | Priors used; conservative sensitivity | `tests/unit/bandit.test.ts` | todo |
| EC-066 | Demo mode | Thresholds shortened; visibly badged; never default | `tests/unit/planner.test.ts` | todo |

---

### E. LLM, network, safety
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-080 | No key / invalid key | S13.1 with direct route to settings | `tests/unit/llm-client.test.ts` | todo |
| EC-081 | Offline | S13.2; detection continues; queued nothing sensitive | `tests/unit/llm-client.test.ts` | todo |
| EC-082 | 429 rate limit | S13.3 with live countdown from `Retry-After`; auto-enable button | `tests/unit/llm-client.test.ts` | todo |
| EC-083 | Timeout / 5xx | Backoff retry (bounded) then S13.4 | `tests/unit/llm-client.test.ts` | todo |
| EC-084 | Malformed or empty JSON | One repair attempt, then typed failure | `tests/unit/llm-client.test.ts` | todo |
| EC-085 | Model safety block / empty candidate | Friendly message; fallback scaffold | `tests/unit/llm-client.test.ts` | todo |
| EC-086 | User cancels while generating | Request aborted; UI returns to idle without error | `tests/unit/llm-client.test.ts` | todo |
| EC-087 | User spams the button | One in-flight per tab; duplicates coalesced | `tests/unit/llm-client.test.ts` | todo |
| EC-088 | Model returns code at L1/L2 | Critic rejects; regenerate; after 2 failures use fallback | `tests/unit/critic.test.ts` | todo |
| EC-089 | Ungrounded or wrong claim | Grounding check flags; confidence lowered; "I'm not sure" banner (S14.4) | `tests/unit/critic.test.ts` | todo |
| EC-090 | Critic itself fails | Treat as not-verified; show with low-confidence flag or hide per setting | `tests/unit/critic.test.ts` | todo |
| EC-091 | User demands the full answer at L1 | Must pass the explicit L4 confirmation flow; recorded in metrics | `tests/unit/critic.test.ts` | todo |
| EC-092 | Extremely long user message / paste | Hard cap with helpful message; never send unbounded text | `tests/unit/context-builder.test.ts` | todo |

---

### F. Fairness, privacy, data
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-100 | Contest detected or uncertain | Everything off (S14.2); cannot be overridden by settings | `tests/unit/contest.test.ts` | todo |
| EC-101 | Contest ends mid-session | Features re-enable only after a fresh page context | `tests/unit/contest.test.ts` | todo |
| EC-102 | Export data | Contains no key, no page text, no raw URLs | `tests/unit/export.test.ts` | todo |
| EC-103 | Delete all data | Clears local, session, IndexedDB; extension returns to onboarding | `tests/unit/storage.test.ts` | todo |
| EC-104 | Tracking toggled off mid-session | Collectors stop immediately; buffers cleared | `tests/unit/signals.test.ts` | todo |
| EC-105 | Settings read by content script | Content scripts never receive the key | `tests/unit/messaging.test.ts` | todo |

---

### G. UI, accessibility, performance
| ID | Case | Required behaviour | Test File | Status |
|---|---|---|---|---|
| EC-120 | Side panel width 320 to 700 | No overflow or overlap; code blocks scroll | `tests/e2e/sidepanel-responsive.test.ts` | todo |
| EC-121 | Keyboard-only use | Full operation, visible focus, Esc closes overlays | `tests/e2e/a11y-keyboard.test.ts` | todo |
| EC-122 | Screen reader | Errors in `role=alert`; status changes in `aria-live`; stepper has proper semantics | `tests/e2e/a11y-screenreader.test.ts` | todo |
| EC-123 | Reduced motion | No essential motion; animations disabled | `tests/e2e/a11y-reduced-motion.test.ts` | todo |
| EC-124 | Light vs dark host pages | Overlay readable on both (own surface and border) | `tests/e2e/overlay-contrast.test.ts` | todo |
| EC-125 | High CPU/slow page | Collector throttled; measured overhead stays under 2% CPU idle | `tests/unit/performance.test.ts` | todo |
| EC-126 | Hinglish or mixed-language input | Understood; reply in the user's style/language | `tests/unit/prompts.test.ts` | todo |
| EC-127 | Unhandled exception anywhere | Error boundary shows generic state, logs locally, offers "Copy diagnostics" without secrets | `tests/unit/error-boundary.test.ts` | todo |
