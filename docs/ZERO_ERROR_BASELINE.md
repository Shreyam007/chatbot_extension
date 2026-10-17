| Scenario | Page / Context | Warns | Errors | PageErrors | First Message |
| :--- | :--- | :---: | :---: | :---: | :--- |
| Fresh Onboarding | options.html | 0 | 0 | 0 | None |
| Key Test: Valid Key | options.html | 1 | 0 | 0 | [Unstuck][ApiKeyTester][WARN] Gemini API key verified, but no text generation mo |
| Key Test: Invalid Key | options.html | 1 | 0 | 0 | [Unstuck][ApiKeyTester][WARN] Gemini API key verification failed - {"status":400 |
| Key Test: Offline | options.html | 1 | 0 | 0 | [Unstuck][ApiKeyTester][WARN] Network error testing Gemini API key - {"error":"F |
| Long Context Ingestion | https://en.wikipedia.org/wiki/Hindi | 6 | 0 | 0 | [Unstuck][MessageBus][WARN] Attempted to send invalid message payload: - {"formE |
| Technical Article | https://en.wikipedia.org/wiki/Binary_search_algorithm | 0 | 0 | 0 | None |
| Problem Description | https://leetcode.com/problems/two-sum/ | 0 | 0 | 0 | None |
| Codeforces Page | https://codeforces.com/problemset/problem/1/A | 0 | 0 | 0 | None |
| Accordion / FAQ Extraction | https://example.com/faq | 0 | 0 | 0 | None |
| Div-Only Fallback | https://example.com/landing | 0 | 0 | 0 | None |
| Sensitive: Checkout Path | https://shop.example.com/checkout | 0 | 0 | 0 | None |
| Sensitive: Login Page | https://auth.example.com/login | 0 | 0 | 0 | None |
| Non-Sensitive: Hidden Modal | https://docs.example.com/hidden-modal | 0 | 0 | 0 | None |
| Non-Sensitive: /wiki/Payment | https://en.wikipedia.org/wiki/Payment | 0 | 0 | 0 | None |
| Non-Sensitive: /wiki/Passport | https://en.wikipedia.org/wiki/Passport | 0 | 0 | 0 | None |
| Non-Sensitive: /wiki/Cartoon | https://en.wikipedia.org/wiki/Cartoon | 0 | 0 | 0 | None |
| Non-Sensitive: /wiki/Open_banking | https://en.wikipedia.org/wiki/Open_banking | 0 | 0 | 0 | None |
| Contest Mode | https://leetcode.com/contest/weekly-contest-400/ | 0 | 0 | 0 | None |
| SPA Navigation Clear | https://leetcode.com/spa/problems | 0 | 0 | 0 | None |
| Rate Limit 429 Handling | sidepanel.html | 0 | 0 | 0 | None |
| 10-Min Soak Test | Hindi (Heap: 7454KB -> 7543KB) | 3 | 0 | 0 | [Unstuck][MessageBus][WARN] Attempted to send invalid message payload: - {"formE |