import { initContentScript } from '../src/content';

export default defineContentScript({
  matches: [
    'https://leetcode.com/*',
    'https://codeforces.com/*'
  ],
  main() {
    initContentScript();
  }
});
