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
        primary: "#6DBA7E",
        secondary: "#2F5D62", 
        accent: "#E37A51",
        background: "#FAFAF8",
        text: "#2E2E2E",
        success: "#519E66",
        warning: "#FFB45A", 
        border: "#DDEEE2",
        info: "#EDF3F4"
      }
    },
  },
  plugins: [],
}