import { initContentScript } from '../src/content';

export default defineContentScript({
  matches: [
    'https://leetcode.com/*',
    'https://codeforces.com/*',
    'http://localhost/*',
    'http://127.0.0.1/*'
  ],
  main(ctx) {
    initContentScript(ctx);
  }
});
