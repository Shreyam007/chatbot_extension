# Unstuck (Chrome Extension)

A proactive, explainable tutoring Chrome extension (Manifest V3) for developers tackling competitive programming and Data Structures & Algorithms.

---

## Features

- **Lightweight Signal Observation:** Detects cognitive friction via dwell time, scroll reversals, and wrong verdict submissions.
- **Explainable Nudge Policy:** Contextual multi-armed bandit decides when assistance is worth the interruption cost.
- **Tiered Hint Scaffolding:** Graded guidance (L1 Direction -> L2 Approach -> L3 Pseudocode -> L4 Solution).
- **Zero-Backend Privacy (BYOK):** Direct client-to-Gemini connection using the user's API key stored in `chrome.storage.local`.
- **Fair-Play Contest Protection:** Automatic disable on LeetCode and Codeforces live contests.

---

## Getting Started

### Prerequisites
- Node.js >= 20.0
- Google Chrome or Chromium-based browser

### Installation & Build
```bash
# Install dependencies
npm install

# Build unpacked extension
npm run build

# Run unit tests
npm test
```

### Loading in Chrome
1. Navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder created by `npm run build`.

---

## Security & Pre-Commit Hook

A secret scanner is included to prevent accidental credential commits:
```bash
# Audit repository for exposed secrets
npm run security:scan

# Enable the pre-commit hook in .git/hooks/
npm run prepare
```

