import React, { useState } from "react";
import {
  Menu,
  MenuItem,
  SubMenu,
  Dropdown,
} from "../../lib/components/core-ui/Menu";
import {
  Home,
  Settings,
  User,
  Bell,
  LogOut,
  ChevronDown,
  Mail,
  FileText,
  BarChart,
  Users,
  HelpCircle,
  Search,
} from "lucide-react";
import { Button } from "../../lib/components/core-ui/Button";

export default {
  title: "Core UI/Menu",
  component: Menu,
  parameters: {
    layout: "centered",
    actions: {
      handles: ["click"],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    horizontal: {
      control: "boolean",
      description: "Display menu horizontally",
    },
    collapsed: {
      control: "boolean",
      description: "Collapse menu to show only icons",
    },
  },
};

// Basic Menu Example
export const BasicMenu = {
  name: "Basic Menu",
  render: (args) => (
    <div className="w-64">
      <Menu {...args}>
        <MenuItem>Dashboard</MenuItem>
        <MenuItem>Profile</MenuItem>
        <MenuItem>Settings</MenuItem>
        <MenuItem divider>Help</MenuItem>
        <MenuItem>Logout</MenuItem>
      </Menu>
    </div>
  ),
};

// Menu with Icons
export const MenuWithIcons = {
  name: "Menu with Icons",
  render: (args) => (
    <div className="w-64">
      <Menu {...args}>
        <MenuItem icon={<Home className="w-4 h-4" />}>Dashboard</MenuItem>
        <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
        <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
        <MenuItem icon={<HelpCircle className="w-4 h-4" />} divider>
          Help
        </MenuItem>
        <MenuItem icon={<LogOut className="w-4 h-4" />}>Logout</MenuItem>
      </Menu>
    </div>
  ),
};

// Menu with Active Item
export const MenuWithActiveItem = {
  name: "Menu with Active Item",
  render: (args) => (
    <div className="w-64">
      <Menu {...args}>
        <MenuItem icon={<Home className="w-4 h-4" />} active>
          Dashboard
        </MenuItem>
        <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
        <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
        <MenuItem icon={<HelpCircle className="w-4 h-4" />} divider>
          Help
        </MenuItem>
        <MenuItem icon={<LogOut className="w-4 h-4" />}>Logout</MenuItem>
      </Menu>
    </div>
  ),
};

// Menu with Disabled Item
export const MenuWithDisabledItem = {
  name: "Menu with Disabled Item",
  render: (args) => (
    <div className="w-64">
      <Menu {...args}>
        <MenuItem icon={<Home className="w-4 h-4" />}>Dashboard</MenuItem>
        <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
        <MenuItem icon={<Settings className="w-4 h-4" />} disabled>
          Settings
        </MenuItem>
        <MenuItem icon={<HelpCircle className="w-4 h-4" />} divider>
          Help
        </MenuItem>
        <MenuItem icon={<LogOut className="w-4 h-4" />}>Logout</MenuItem>
      </Menu>
    </div>
  ),
};

// Horizontal Menu
export const HorizontalMenu = {
  name: "Horizontal Menu",
  render: (args) => (
    <div className="w-full">
      <Menu {...args} horizontal>
        <MenuItem icon={<Home className="w-4 h-4" />}>Dashboard</MenuItem>
        <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
        <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
        <MenuItem icon={<HelpCircle className="w-4 h-4" />}>Help</MenuItem>
        <MenuItem icon={<LogOut className="w-4 h-4" />}>Logout</MenuItem>
      </Menu>
    </div>
  ),
  args: {
    horizontal: true,
  },
};

// Menu with Submenu
export const MenuWithSubmenu = {
  name: "Menu with Submenu",
  render: (args) => (
    <div className="w-64">
      <Menu {...args}>
        <MenuItem icon={<Home className="w-4 h-4" />}>Dashboard</MenuItem>
        <SubMenu title="User" icon={<User className="w-4 h-4" />}>
          <MenuItem>Profile</MenuItem>
          <MenuItem>Account</MenuItem>
          <MenuItem>Preferences</MenuItem>
        </SubMenu>
        <SubMenu title="Reports" icon={<FileText className="w-4 h-4" />}>
          <MenuItem>Daily</MenuItem>
          <MenuItem>Weekly</MenuItem>
          <MenuItem>Monthly</MenuItem>
        </SubMenu>
        <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
        <MenuItem icon={<LogOut className="w-4 h-4" />}>Logout</MenuItem>
      </Menu>
    </div>
  ),
};

// Collapsed Menu
export const CollapsedMenu = {
  name: "Collapsed Menu",
  render: (args) => (
    <div>
      <Menu {...args} collapsed>
        <MenuItem icon={<Home className="w-5 h-5" />}></MenuItem>
        <MenuItem icon={<User className="w-5 h-5" />}></MenuItem>
        <MenuItem icon={<Settings className="w-5 h-5" />}></MenuItem>
        <MenuItem icon={<HelpCircle className="w-5 h-5" />} divider></MenuItem>
        <MenuItem icon={<LogOut className="w-5 h-5" />}></MenuItem>
      </Menu>
    </div>
  ),
  args: {
    collapsed: true,
  },
};

// Dropdown Menu Example
export const DropdownMenuExample = () => {
  return (
    <div className="p-8 flex flex-col gap-8 items-start">
      <h3 className="text-lg font-semibold">Dropdown Menu Examples</h3>

      <div className="flex gap-4">
        <Dropdown
          trigger={
            <Button className="flex items-center gap-2">
              <span>User Menu</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          }
        >
          <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
          <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
          <MenuItem icon={<Bell className="w-4 h-4" />}>Notifications</MenuItem>
          <MenuItem divider icon={<LogOut className="w-4 h-4" />}>
            Logout
          </MenuItem>
        </Dropdown>

        <Dropdown
          trigger={
            <Button variant="primary" className="flex items-center gap-2">
              <span>Actions</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          }
          placement="bottom-right"
        >
          <MenuItem icon={<FileText className="w-4 h-4" />}>
            New Document
          </MenuItem>
          <MenuItem icon={<Users className="w-4 h-4" />}>Share</MenuItem>
          <MenuItem icon={<Mail className="w-4 h-4" />}>Send Email</MenuItem>
          <MenuItem divider icon={<BarChart className="w-4 h-4" />}>
            View Analytics
          </MenuItem>
        </Dropdown>
      </div>
    </div>
  );
};

// Interactive Menu Example
export const InteractiveMenuExample = () => {
  const [activeItem, setActiveItem] = useState("dashboard");

  return (
    <div className="p-4 flex gap-8">
      <div className="w-64">
        <h3 className="text-lg font-semibold mb-4">Interactive Menu</h3>
        <Menu>
          <MenuItem
            icon={<Home className="w-4 h-4" />}
            active={activeItem === "dashboard"}
            onClick={() => setActiveItem("dashboard")}
          >
            Dashboard
          </MenuItem>

          <SubMenu title="User" icon={<User className="w-4 h-4" />}>
            <MenuItem
              active={activeItem === "profile"}
              onClick={() => setActiveItem("profile")}
            >
              Profile
            </MenuItem>
            <MenuItem
              active={activeItem === "account"}
              onClick={() => setActiveItem("account")}
            >
              Account
            </MenuItem>
          </SubMenu>

          <MenuItem
            icon={<Settings className="w-4 h-4" />}
            active={activeItem === "settings"}
            onClick={() => setActiveItem("settings")}
          >
            Settings
          </MenuItem>

          <MenuItem
            icon={<HelpCircle className="w-4 h-4" />}
            active={activeItem === "help"}
            onClick={() => setActiveItem("help")}
            divider
          >
            Help
          </MenuItem>

          <MenuItem
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => alert("Logged out!")}
          >
            Logout
          </MenuItem>
        </Menu>
      </div>

      <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
        <h2 className="text-xl font-bold mb-4">
          {activeItem.charAt(0).toUpperCase() + activeItem.slice(1)} Content
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          This is the content area for the {activeItem} section. Click on
          different menu items to see this content change.
        </p>
      </div>
    </div>
  );
};

// Navigation Bar Example
export const NavigationBarExample = () => {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4">
          <Menu horizontal className="border-0 shadow-none">
            <div className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
              CompanyLogo
            </div>

            <div className="flex-1">
              <Menu horizontal className="border-0 shadow-none">
                <MenuItem>Home</MenuItem>
                <MenuItem>Products</MenuItem>
                <MenuItem>Services</MenuItem>
                <MenuItem>About</MenuItem>
                <MenuItem>Contact</MenuItem>
              </Menu>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <Dropdown
                trigger={
                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                }
                placement="bottom-right"
              >
                <div className="px-4 py-2 font-semibold border-b border-gray-200 dark:border-gray-700">
                  Notifications
                </div>
                <MenuItem>New message from John</MenuItem>
                <MenuItem>Your order has shipped</MenuItem>
                <MenuItem>Welcome to our platform!</MenuItem>
                <div className="px-4 py-2 text-sm text-blue-500 border-t border-gray-200 dark:border-gray-700">
                  View all notifications
                </div>
              </Dropdown>

              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      U
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                }
                placement="bottom-right"
              >
                <MenuItem icon={<User className="w-4 h-4" />}>Profile</MenuItem>
                <MenuItem icon={<Settings className="w-4 h-4" />}>
                  Settings
                </MenuItem>
                <MenuItem divider icon={<LogOut className="w-4 h-4" />}>
                  Logout
                </MenuItem>
              </Dropdown>
            </div>
          </Menu>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 mt-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          This example shows how to use the Menu component to create a
          navigation bar.
        </p>
      </div>
    </div>
  );
};
