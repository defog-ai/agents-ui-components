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
        title="Drawer Title"
      >
        <div>
          <div className="space-y-4">
            <section>
              <h3 className="text-lg font-semibold mb-2">Section 1: Introduction</h3>
              <p className="mb-4">This drawer opens from the left and contains contextual actions or information. It demonstrates the scrolling behavior when content exceeds the drawer height.</p>
              <p className="mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Section 2: Features</h3>
              <ul className="list-disc pl-5 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i}>Feature item {i + 1} with some detailed explanation about what this feature does and how it benefits the user</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Section 3: Form Example</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Input Field 1</label>
                  <input type="text" className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Input Field 2</label>
                  <input type="text" className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Textarea</label>
                  <textarea className="w-full p-2 border rounded" rows={4}></textarea>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Section 4: Long Content</h3>
              {Array.from({ length: 3 }).map((_, i) => (
                <p key={i} className="mb-4">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                </p>
              ))}
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Section 5: Actions</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">Primary Action</button>
                <button className="w-full p-2 border border-gray-300 rounded hover:bg-gray-50">Secondary Action</button>
                <button className="w-full p-2 text-red-500 hover:bg-red-50 rounded">Danger Action</button>
              </div>
            </section>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
