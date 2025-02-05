import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Drawer } from "../../lib/components/core-ui/Drawer";
import React, { useState } from "react";

export default {
  title: "Core UI/Drawer",
  component: Drawer,
} as ComponentMeta<typeof Drawer>;

const Template: ComponentStory<typeof Drawer> = (args) => <Drawer {...args} />;

// New Story: LeftDrawer demonstrating real-world usage with a button click
export const LeftDrawer = () => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", height: "400px", padding: 20 }}>
      <button onClick={() => setVisible(true)} style={{ marginBottom: 20 }}>
        Open Drawer
      </button>
      <Drawer
        placement="left"
        visible={visible}
        onClose={() => setVisible(false)}
        width={300}
      >
        <div style={{ padding: 20 }}>
          <h3>Drawer Content</h3>
          <p>
            This drawer opens from the left and contains contextual actions or
            information.
          </p>
        </div>
      </Drawer>
    </div>
  );
};
