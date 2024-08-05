import "../basic-tailwind-imports-for-html-files.css";

/** @type { import('@storybook/react').Preview } */
const preview = {
  tags: ["autodocs"],
  parameters: {
    options: {
      storySort: (a, b) => {
        if (a.title === "Quickstart") {
          return -1;
        }
        if (b.title === "Quickstart") {
          return 1;
        }

        return undefined;
      },
    },
  },
};

export default preview;
