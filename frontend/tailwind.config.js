/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:          '#0a0c10',
        card:        '#0d1017',
        border:      '#1e2330',
        accent:      '#4d9fff',
        success:     '#22c55e',
        warning:     '#f59e0b',
        danger:      '#ef4444',
        textprimary: '#e2e8f0',
        textmuted:   '#4a5568',
        activebg:    '#0a2d6e',
        hoverbg:     '#141b27',
        alertbg:     '#7c2d12',
        alertborder: '#c2410c',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
