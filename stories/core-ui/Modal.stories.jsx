import { useState } from "react";
import { Modal } from "../../lib/components/core-ui/Modal";
import { Button } from "../../lib/components/core-ui/Button";

export default {
  title: "Core UI/Modal",
  component: Modal,
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
    const [modalOpen, setModalOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          {...args}
          open={modalOpen}
          onCancel={(d) => setModalOpen(false)}
          onOk={() => setModalOpen(false)}
        ></Modal>
      </>
    );
  },
};

export const Primary = {
  name: "Normal",
  args: {
    title: "This is title",
    children: (
      <div className="space-y-4">
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 1
        </div>
      </div>
    ),
  },
};

export const Footer = {
  name: "No footer",
  args: {
    title: "This is title",
    footer: false,
    children: (
      <div className="space-y-4">
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 1
        </div>
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 2
        </div>
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 3
        </div>
      </div>
    ),
  },
};

export const Styled = {
  name: "With some tailwind classes: w-8/12",
  args: {
    title: "This is title",
    contentClassNames: "w-8/12",
    children: (
      <div className="space-y-4">
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 1
        </div>
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 2
        </div>
        <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border">
          Item 3
        </div>
      </div>
    ),
  },
};
