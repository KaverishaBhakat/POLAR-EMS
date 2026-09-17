/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        polar: {
          bg: '#080D14',
          surface: '#0D1520',
          card: '#111C2B',
          cardHover: '#162438',
          border: '#1B2C42',
          borderLight: '#263D5C',
          borderGlow: '#0EA5E9',
          cyan: '#06B6D4',
          cyanGlow: '#22D3EE',
          blue: '#0284C7',
          blueLight: '#38BDF8',
          emerald: '#10B981',
          emeraldGlow: '#34D399',
          amber: '#F59E0B',
          amberGlow: '#FBBF24',
          rose: '#EF4444',
          roseGlow: '#F87171',
          muted: '#8B9EB3',
          darkNavy: '#1D3045',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Helvetica Neue ME"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-dash': 'flow 20s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        flow: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
