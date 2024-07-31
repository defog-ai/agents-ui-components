/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
    {
      name: "storybook-addon-jsdoc-to-mdx",
      options: {
        folderPaths: ["../lib/"], // paths to folders with JS/TS code
        extensions: ["jsx", "js"], // file extensions to include
      },
    },
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;
