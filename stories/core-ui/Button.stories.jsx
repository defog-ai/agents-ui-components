import { Button } from "../../lib/components/core-ui/Button";

export default {
  title: "Core UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    actions: {
      handles: ["click"],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    onClick: { control: null },
  },
  render: ({ text, ...args }) => {
    return <Button {...args}>{text || "Click me"}</Button>;
  },
};

export const Primary = {
  args: { disabled: false },
};

export const Disabled = {
  args: { disabled: true, text: "Can't click me" },
};

export const Clicked = {
  name: "With click handler",
  args: {
    onClick: (ev) => {
      alert("clicked!");
    },
  },
};

export const Styled = {
  name: "With some tailwind classes and click handler",
  args: {
    onClick: (ev) => {
      alert("clicked!");
    },
    disabled: false,
    className:
      "py-1 py-2 border bg-gray-50 text-gray-500 shadow-sm rounded-md hover:bg-gray-100 hover:text-gray-800",
  },
};
