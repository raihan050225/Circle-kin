/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
  colors: {
    bg: {
      main: "#faf7f4",
      card: "#ffffff",
      muted: "#f1ede9",
    },
    text: {
      dark: "#2d2a26",
      muted: "#7a736b",
    },
    accent: {
      primary: "#f4a261",
      green: "#7fc8a9",
      blue: "#8ecae6",
    },
  },
  borderRadius: {
    xl: "16px",
  },
  boxShadow: {
    card: "0 8px 24px rgba(0,0,0,0.04)",
  },
},
  }}
