import { SingleSelect } from "../../lib/components/core-ui/SingleSelect";

export default {
  title: "Core UI/SingleSelect",
  component: SingleSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" }
  }
};

export const Default = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
      { value: "durian", label: "Durian" },
      { value: "elderberry", label: "Elderberry" },
    ],
    placeholder: "Select a fruit",
    label: "Favorite Fruit",
  },
};

export const WithDefaultValue = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
      { value: "durian", label: "Durian" },
      { value: "elderberry", label: "Elderberry" },
    ],
    defaultValue: "banana",
    placeholder: "Select a fruit",
    label: "Favorite Fruit",
  },
};

export const DisabledState = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
    defaultValue: "cherry",
    disabled: true,
    label: "Disabled Select",
  },
};

export const SmallSize = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
    size: "small",
    label: "Small Select",
  },
};

export const WithCustomOptionRenderer = {
  args: {
    options: [
      { value: "success", label: "Success", color: "green" },
      { value: "warning", label: "Warning", color: "orange" },
      { value: "error", label: "Error", color: "red" },
    ],
    optionRenderer: (option) => (
      <div className="flex items-center">
        <span
          className="inline-block w-3 h-3 rounded-full mr-2"
          style={{ backgroundColor: option.color }}
        ></span>
        {option.label}
      </div>
    ),
    label: "Status",
  },
};

export const NoAllowClear = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
    allowClear: false,
    label: "No Clear Button",
  },
};

export const NoAllowCreateNewOption = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
    allowCreateNewOption: false,
    label: "No Create New Option",
  },
};

export const WithOtherOption = {
  args: {
    options: [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "cherry", label: "Cherry" },
    ],
    showOtherOption: true,
    label: "Favorite Fruit with Other Option",
    placeholder: "Select a fruit or enter your own",
  },
};

export const CustomOtherLabel = {
  args: {
    options: [
      { value: "red", label: "Red" },
      { value: "blue", label: "Blue" },
      { value: "green", label: "Green" },
    ],
    showOtherOption: true,
    otherOptionLabel: "Custom color...",
    label: "Select Color",
  },
};