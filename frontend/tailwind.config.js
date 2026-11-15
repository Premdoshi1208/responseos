/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0f172a',
          800: '#151f32',
          700: '#1e293b',
        },
        surface: {
          dark: '#0e1626',
          panel: '#131d31',
          card: '#18243c',
          border: '#243452',
          hover: '#1e2d4a',
        },
        amber: {
          glow: '#f59e0b',
        },
        coral: {
          glow: '#ef4444',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
