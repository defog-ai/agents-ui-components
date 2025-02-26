import React from "react";

import { TextArea } from "../../lib/components/core-ui/TextArea";

export default {
  title: "Core UI/TextArea",
  component: TextArea,
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
  render: ({ list = [], ...args }) => {
    return list ? (
      <div className="flex flex-col gap-2">
        {list.map((item, i) => (
          <TextArea key={i} {...item.args} />
        ))}
      </div>
    ) : (
      <TextArea {...args} />
    );
  },
};

export const Variants = {
  args: {
    list: [
      { args: { label: "Normal", status: null } },
      { args: { label: "Disabled", disabled: true } },
      { args: { label: "Status: error", status: "error" } },
      { args: { label: "Status: warning", status: "warning" } },
    ],
  },
};
