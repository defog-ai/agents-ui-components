import { MultiSelect } from "../../lib/components/core-ui/MultiSelect";

export default {
  title: "Core UI/MultiSelect",
  component: MultiSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export const Primary = {
  args: {
    options: [
      { value: "All", label: "All" },
      { value: "Clear", label: "Clear" },
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
      { value: "D", label: "D" },
      { value: "E", label: "E" },
      { value: "F", label: "F" },
      { value: "G", label: "G" },
      { value: "H", label: "H" },
      { value: "I", label: "I" },
      { value: "J", label: "J" },
    ],
    // value: ["All", "Clear", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
  },
};
