import { Tabs } from "../../lib/components/core-ui/Tabs";

const normalTab = {
  name: "Normal tab",
  content: <div>Normal tab content</div>,
};

const redBackgroundTab = {
  name: "Red background in tab content",
  content: (
    <div className="h-40 flex items-center justify-center">Reg bg tab</div>
  ),
  classNames: "bg-rose-300",
};

const blueHeaderTab = {
  name: "Blue header tab",
  content: (
    <div className="h-40 flex items-center justify-center">Blue header tab</div>
  ),
  headerClassNames: "bg-blue-500 text-white hover:bg-blue-700 border",
};

export default {
  title: "Core UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "fullscreen",
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
};

export const Primary = {
  name: "Basic tabs",
  args: {
    tabs: [
      {
        name: "Tab 1",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 1
          </div>
        ),
      },
      {
        name: "Tab 2",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 2
          </div>
        ),
      },
      {
        name: "Tab 3",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 3
          </div>
        ),
      },
    ],
  },
};

export const WithCustomHeader = {
  name: "Tabs with custom header + tab with red bg in content",
  args: {
    tabs: [
      {
        name: "Tab 1",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 1
          </div>
        ),
      },
      blueHeaderTab,
      redBackgroundTab,
    ],
  },
};

export const Vertical = {
  name: "Vertical tabs",
  args: {
    tabs: [
      {
        name: "Tab 1",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 1
          </div>
        ),
      },
      {
        name: "Tab 2",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 2
          </div>
        ),
      },
      {
        name: "Tab 3",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 3
          </div>
        ),
      },
    ],
    vertical: true,
  },
};
export const Small = {
  name: "Small tabs",
  args: {
    tabs: [
      {
        name: "Tab 1",
        content: (
          <div className="h-40 flex items-center justify-center">
            Content for tab 1
          </div>
        ),
      },
      blueHeaderTab,
      redBackgroundTab,
    ],
    size: "small",
  },
};
