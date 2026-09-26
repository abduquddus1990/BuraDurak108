/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        choyxona: {
          dark: '#1e1610',
          wood: '#3e2719',
          woodLight: '#5c3a21',
          gold: '#eab308',
          goldLight: '#fde047',
          adrasBlue: '#1e3a8a',
          adrasRed: '#991b1b',
          cream: '#fef3c7',
        }
      }
    },
  },
  plugins: [],
}
