import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Popconfirm } from "../../lib/components/core-ui/Popconfirm";

export default {
  title: "Core UI/Popconfirm",
  component: Popconfirm,
} as ComponentMeta<typeof Popconfirm>;

const Template: ComponentStory<typeof Popconfirm> = (args) => (
  <Popconfirm {...args} />
);

export const Default = Template.bind({});
Default.args = {
  title: "Are you sure you want to proceed?",
  okText: "Yes",
  cancelText: "No",
  children: <button>Click Me</button>,
  onConfirm: () => console.log("Confirmed"),
  onCancel: () => console.log("Cancelled"),
};
