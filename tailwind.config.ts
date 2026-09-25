import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        field: "var(--field)",
        line: "var(--line)",
        line2: "var(--line-2)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        cyan: "var(--cyan)",
        "cyan-ink": "var(--cyan-ink)",
        "cyan-soft": "var(--cyan-soft)",
        err: "var(--err)",
      },
      fontFamily: {
        head: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { sm: "8px", DEFAULT: "10px" },
    },
  },
  plugins: [],
} satisfies Config;
