import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './src/**/*.{html,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        surface: '#0b1326',
        'surface-dim': '#0b1326',
        'surface-bright': '#31394d',
        'surface-container-lowest': '#060e20',
        'surface-container-low': '#131b2e',
        'surface-container': '#171f33',
        'surface-container-high': '#222a3d',
        'surface-container-highest': '#2d3449',
        'surface-variant': '#2d3449',
        'surface-tint': '#4ae176',

        // Text & neutrals
        'on-surface': '#dae2fd',
        'on-surface-variant': '#bccbb9',
        'inverse-surface': '#dae2fd',
        'inverse-on-surface': '#283044',
        outline: '#869585',
        'outline-variant': '#3d4a3d',
        background: '#0b1326',
        'on-background': '#dae2fd',

        // Primary / Accent (CTA)
        primary: '#4be277',
        'on-primary': '#003915',
        'primary-container': '#22c55e',
        'on-primary-container': '#004b1e',
        'inverse-primary': '#006e2f',
        'primary-fixed': '#6bff8f',
        'primary-fixed-dim': '#4ae176',
        'on-primary-fixed': '#002109',
        'on-primary-fixed-variant': '#005321',

        // Secondary / Info
        secondary: '#7bd0ff',
        'on-secondary': '#00354a',
        'secondary-container': '#00a6e0',
        'on-secondary-container': '#00374d',
        'secondary-fixed': '#c4e7ff',
        'secondary-fixed-dim': '#7bd0ff',
        'on-secondary-fixed': '#001e2c',
        'on-secondary-fixed-variant': '#004c69',

        // Tertiary / Warning (Stuck state)
        tertiary: '#ffba61',
        'on-tertiary': '#472a00',
        'tertiary-container': '#ef9900',
        'on-tertiary-container': '#5c3800',
        'tertiary-fixed': '#ffddb8',
        'tertiary-fixed-dim': '#ffb95f',
        'on-tertiary-fixed': '#2a1700',
        'on-tertiary-fixed-variant': '#653e00',

        // Error / Destructive
        error: '#ffb4ab',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',

        // Focus ring
        'focus-ring': '#ffffff'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        'headline-lg': ['"JetBrains Mono"', 'monospace'],
        'headline-md': ['"JetBrains Mono"', 'monospace'],
        'headline-sm': ['"JetBrains Mono"', 'monospace'],
        'body-lg': ['"IBM Plex Sans"', 'sans-serif'],
        'body-md': ['"IBM Plex Sans"', 'sans-serif'],
        'body-sm': ['"IBM Plex Sans"', 'sans-serif'],
        'label-lg': ['"JetBrains Mono"', 'monospace'],
        'label-md': ['"JetBrains Mono"', 'monospace'],
        'label-sm': ['"JetBrains Mono"', 'monospace'],
        'code-block': ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px'
      },
      spacing: {
        gutter: '0.5rem',
        margin: '1rem',
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.25rem',
        'space-xl': '1.5rem'
      }
    }
  },
  plugins: []
};

export default config;
