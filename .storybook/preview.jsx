/** @type { import('@storybook/react').Preview } */

import {
  Controls,
  Description,
  Primary,
  Stories,
  Title,
  useOf,
  Markdown,
  DocsContext,
} from "@storybook/blocks";
import "../basic-tailwind-imports-for-html-files.css";

import { useContext } from "react";

const ModifiedControls = (props) => {
  const of = useOf();
  // console.log(of);
  // const context = useContext(DocsContext);
  // const { story } = context.resolveOf(of || "story", ["story"]);
  // const { parameters, argTypes, component, subcomponents } = story;
  // const controlsParameters = parameters.docs?.controls || {};

  // console.log("controlsParameters", controlsParameters);
  const context = useContext(DocsContext);
  // console.log(context);
  // const { story } = context.resolveOf(of || "story", ["story"]);
  // const { parameters, argTypes, component, subcomponents } = story;
  // const controlsParameters = parameters.docs?.controls || {};

  return <Controls />;
};

const preview = {
  tags: ["autodocs"],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      page: (props) => {
        return (
          <>
            <Title />
            <Description />
            <Primary />
            <ModifiedControls />
            {/* <Controls /> */}
            <Stories />
          </>
        );
      },
    },
  },
};

export default preview;
