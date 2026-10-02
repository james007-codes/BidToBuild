/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111113",
        surface2: "#18181B",
        hover: "rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
