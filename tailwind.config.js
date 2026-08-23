/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        midnight: '#0c1128',
        neon: {
          blue: '#00f0ff',
          purple: '#b026ff',
        },
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(10px)' },
        },
      },
      animation: {
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
