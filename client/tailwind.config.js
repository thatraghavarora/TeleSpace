/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#0f172a",
          card: "#111827",
          primary: "#2563eb",
          accent: "#38bdf8",
          text: "#e5e7eb"
        }
      }
    }
  },
  plugins: []
};
