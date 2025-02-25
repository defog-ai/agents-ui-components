import { Input } from "../../lib/components/core-ui/Input";

export default {
  title: "Core UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: ({ ...args }) => {
    return args.list ? (
      <div className="flex flex-col gap-2">
        {args.list.map((item, i) => (
          <Input key={i} {...item.args} />
        ))}
      </div>
    ) : (
      <Input {...args} />
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
