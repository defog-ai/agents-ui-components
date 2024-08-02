/** @type { import('@storybook/react').Preview } */

import "../basic-tailwind-imports-for-html-files.css";

const preview = {
  tags: ["autodocs"],
  parameters: {
    options: {
      storySort: {
        order: [],
      },
    },
  },
};

export default preview;
