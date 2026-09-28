import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#27332D",
        blue: "#2563EB",
        green: "#237A57",
        sky: "#EAF4FF",
        cream: "#FFF9F0",
        coral: "#F28C7F",
      },
      boxShadow: { soft: "0 18px 60px -28px rgba(32, 63, 65, .25)" },
    },
  },
  plugins: [],
} satisfies Config;
