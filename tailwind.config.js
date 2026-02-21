/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'gt-gold': '#B3A369',
        'gt-navy': '#003057',
        'gt-gold-light': '#EAAA00',
      },
    },
  },
  plugins: [],
}
