import { NavBar } from "../../lib/components/core-ui/NavBar";

export default {
  title: "Core UI/NavBar",
  component: NavBar,
  decorators: [
    () => (
      <div>
        <NavBar
          items={[
            { title: "Home", href: "/", current: false },
            { title: "About", href: "/about", current: false },
            {
              title: "Services",
              href: "#",
              current: false,
              children: [
                {
                  title: "Consulting",
                  href: "/services/consulting",
                  current: true,
                },
                {
                  title: "Development",
                  href: "/services/development",
                  current: false,
                },
              ],
            },
            { title: "Contact", href: "/contact", current: false },
          ]}
        />
        <div style={{ marginTop: "20px" }}>
          <h1>Welcome to our website!</h1>
          <p>
            This is some additional content to demonstrate how the NavBar works
            together with other content on the page.
          </p>
        </div>
      </div>
    ),
  ],
};

const Template = (args) => <NavBar {...args} />;

export const Default = Template.bind({});
Default.args = {
  items: [
    { title: "Home", href: "/", current: true },
    { title: "About", href: "/about", current: false },
    {
      title: "Services",
      href: "#",
      current: false,
      children: [
        { title: "Consulting", href: "/services/consulting", current: false },
        { title: "Development", href: "/services/development", current: false },
      ],
    },
    { title: "Contact", href: "/contact", current: false },
  ],
};
