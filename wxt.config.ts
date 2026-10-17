import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: (env) => ({
    name: 'Unstuck',
    description: 'Proactive, explainable tutoring assistant for coding problems and technical pages.',
    version: '1.0.7',
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    permissions: ['storage', 'sidePanel', 'alarms', 'activeTab', 'scripting'],
    host_permissions:
      env.mode === 'development'
        ? ['https://leetcode.com/*', 'https://codeforces.com/*', 'https://*/*', 'http://*/*']
        : ['https://leetcode.com/*', 'https://codeforces.com/*'],
    optional_host_permissions:
      env.mode === 'development'
        ? []
        : ['https://*/*', 'http://*/*'],
    action: {
      default_title: 'Unstuck',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png'
      }
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  }),
  modules: ['@wxt-dev/module-react'],
  vite: (env) => ({
    build: {
      sourcemap: env.mode === 'development',
    },
  }),
});
