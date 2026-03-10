/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'perfume-gold': '#D4AF37',
        'perfume-black': '#1A1A1B',
        'perfume-cream': '#FCFAF7',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}