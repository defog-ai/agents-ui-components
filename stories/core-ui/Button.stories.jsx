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
  render: ({ text, list = null, ...args }) => {
    return list ? (
      <div className="flex flex-row gap-2">
        {list.map((item, i) => (
          <Button key={i} {...item.args}>
            {item.args.text}
          </Button>
        ))}
      </div>
    ) : (
      <Button {...args}>{text || "Click me"}</Button>
    );
  },
};

export const Primary = {
  args: { disabled: false },
};

export const Disabled = {
  args: { disabled: true, text: "Can't click me", className: "w-96" },
};

export const Variants = {
  args: {
    list: [
      { args: { variant: "normal", text: "normal" } },
      { args: { variant: "primary", text: "primary" } },
      { args: { variant: "danger", text: "danger" } },
    ],
  },
};

export const Clicked = {
  name: "With click handler",
  args: {
    onClick: (ev) => {
      alert("clicked!");
    },
  },
};
