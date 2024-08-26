const plugin = require("tailwindcss/plugin");

module.exports = {
  content: [
    "./index.html",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./test/**/*.{js,ts,jsx,tsx,mdx,html}",
    "./stories/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-text": "#2B2B2B",
        "primary-highlight": "#2B59FF",
        "secondary-highlight-1": "#6E00A2",
        "secondary-highlight-2": "#7891EE",
        "secondary-highlight-3": "rgba(112, 0, 163, 0.2)",
        "secondary-highlight-4": "hsla(37, 100%, 53%, 0.2)",
      },
      boxShadow: {
        custom: " rgba(0, 0, 0, 0.24) 0px 3px 8px",
      },
      keyframes: {
        "fade-in-down": {
          // first opacity 0 to 1
          // then display none
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "20%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
      animation: {
        "fade-in-down": "fade-in-down 1s",
        "fade-in": "fade-in 0.2s",
      },
    },
  },

  plugins: [
    require("@tailwindcss/forms"),
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".arrow-up": {
          width: "0",
          height: "0",
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
        },
        ".arrow-down": {
          width: "0",
          height: "0",
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
        },
      });
    }),
  ],
};
