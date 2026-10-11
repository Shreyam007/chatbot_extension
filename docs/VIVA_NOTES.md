# VIVA_NOTES.md — Project Limits, Defense Points & Architectural Rationale

## 1. Honest Limits

- **Heuristic + Probabilistic Stuck Detection:** Not a heavy black-box ML model. It combines deterministic signals (dwell time, scroll reversals, wrong submissions) via a calibrated logistic function.
- **Hallucination Mitigation:** Grounding checks and critic evaluation lower hallucination rates, but cannot eliminate them entirely. Low-confidence outputs show an unambiguous "I'm not sure" state.
- **Edge Case Rigor:** Every failure mode in `docs/EDGE_CASES.md` maps directly to handled UI states or fallback scaffolds.

## 2. Likely Viva Questions & Answers

### Q: Why Manifest V3 rather than an external proxy server?
**A:** Privacy and zero-maintenance architecture. Users bring their own Google Gemini API key. Raw code and problem queries go directly to the provider from the browser's sandboxed service worker; no middleman server can intercept or log user sessions.

### Q: Why Shadow DOM for the content script overlay?
**A:** Websites like LeetCode and Codeforces have heavy, conflicting global CSS rules and CSS resets. Injecting into an open Shadow DOM guarantees complete style encapsulation: the extension's Tailwind classes do not pollute the host page, and host page styles cannot break the extension's UI.

### Q: How do you prevent code leakage at low hint tiers?
**A:** The hint generation graph uses a two-stage filter:
1. Strict system instructions forbidding code syntax at L1 (Direction) and L2 (Approach).
2. A deterministic critic parsing markdown ASTs and regex tokenizers to reject any code fences, variable definitions, or keywords before hints reach the user.
