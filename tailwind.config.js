/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#080a0f',
          card: '#0e121a',
          cardHover: '#141a24',
          border: '#1f2937',
          gold: '#f59e0b',
          goldLight: '#fbbf24',
          buy: '#10b981',
          buyGlow: 'rgba(16, 185, 129, 0.4)',
          sell: '#ef4444',
          sellGlow: 'rgba(239, 68, 68, 0.4)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
