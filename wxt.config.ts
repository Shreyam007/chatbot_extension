import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Unstuck',
    description: 'Proactive, explainable tutoring assistant for coding problems.',
    version: '0.1.0',
    permissions: ['storage', 'sidePanel', 'alarms', 'activeTab', 'scripting'],
    host_permissions: [
      'https://leetcode.com/*',
      'https://codeforces.com/*'
    ],
    optional_host_permissions: [
      'https://*/*',
      'http://*/*'
    ],
    action: {
      default_title: 'Unstuck'
    }
  },
  modules: ['@wxt-dev/module-react']
});
