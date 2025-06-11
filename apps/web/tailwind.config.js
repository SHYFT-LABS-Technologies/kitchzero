// apps/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f3',
          100: '#dcf2e3',
          200: '#bce5cb',
          300: '#8bd5a0',
          400: '#5cc575',
          500: '#6DBA7E', // Main primary
          600: '#4a9c5a',
          700: '#3d7d4a',
          800: '#32653d',
          900: '#2a5332',
          950: '#163018',
          DEFAULT: '#6DBA7E',
        },
        secondary: {
          50: '#f0f9fa',
          100: '#dbeef1',
          200: '#bddde4',
          300: '#91c3ce',
          400: '#5ea1b0',
          500: '#438595',
          600: '#3a6e7e',
          700: '#2F5D62', // Main secondary - darker
          800: '#2a4d52',
          900: '#264248',
          950: '#16272a',
          DEFAULT: '#2F5D62',
        },
        accent: {
          50: '#fef7f3',
          100: '#fdebe1',
          200: '#fbd4c7',
          300: '#f7b4a0',
          400: '#f28a69',
          500: '#E37A51', // Main accent
          600: '#d4502a',
          700: '#b23e20',
          800: '#91351f',
          900: '#762f20',
          950: '#40150e',
          DEFAULT: '#E37A51',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Modern UI colors for components
        background: '#fafafa',
        foreground: '#171717',
        card: '#ffffff',
        'card-foreground': '#171717',
        border: '#e5e5e5',
        input: '#f5f5f5',
        ring: '#6DBA7E',
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fef2f2',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        muted: {
          DEFAULT: '#f5f5f5',
          foreground: '#737373',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif'
        ],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -6px rgba(0, 0, 0, 0.12)',
        'medium': '0 4px 16px -4px rgba(0, 0, 0, 0.12), 0 8px 32px -8px rgba(0, 0, 0, 0.16)',
        'large': '0 8px 32px -8px rgba(0, 0, 0, 0.16), 0 16px 64px -16px rgba(0, 0, 0, 0.24)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.1)', opacity: '0.9' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.6s ease-out',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}