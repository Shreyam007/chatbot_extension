import { initContentScript } from '../src/content';

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    initContentScript();
  }
});
