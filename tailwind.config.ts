import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        plaster: "var(--plaster)",
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        haldi: "var(--haldi)",
        blush: "var(--blush)",
        sage: "var(--sage)",
        ink: "var(--ink)",
        night: "var(--night)",
        grey: "var(--grey)",
        accent: "var(--accent)",
        marigold: "var(--marigold)",
      },
      fontFamily: {
        bodoni: ["var(--font-bodoni)", "Georgia", "serif"],
        caveat: ["var(--font-caveat)", "cursive"],
        hindi: ["var(--font-hindi)", "serif"],
      },
      fontSize: {
        furniture: [
          "10.5px",
          { lineHeight: "1.4", letterSpacing: "0.18em", fontWeight: "500" },
        ],
      },
      transitionTimingFunction: {
        balconia: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
      screens: {
        xs: "390px",
      },
      borderRadius: {
        DEFAULT: "0",
        none: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        arch: "999px 999px 0 0",
        pill: "999px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
