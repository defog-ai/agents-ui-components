import { AlertBanner } from "../../lib/components/core-ui/AlertBanner";
import { useState } from "react";

export default {
  title: "Core UI/AlertBanner",
  component: AlertBanner,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select", 
      options: ["success", "warning", "error", "info"],
    },
    dismissable: {
      control: "boolean",
    },
    autoDismissDelay: {
      control: "number",
      description: "Time in milliseconds before auto-dismissing. No auto-dismiss if not provided."
    },
    onDismiss: { control: null },
    icon: { control: null },
  },
};

export const Default = {
  args: {
    message: "This is an informational alert.",
    type: "info",
  },
};

export const Success = {
  args: {
    message: "Operation completed successfully!",
    type: "success",
  },
};

export const Warning = {
  args: {
    message: "Warning: This action cannot be undone.",
    type: "warning",
  },
};

export const Error = {
  args: {
    message: "Error: Failed to save changes.",
    type: "error",
  },
};

export const NotDismissable = {
  args: {
    message: "This alert cannot be dismissed.",
    type: "info",
    dismissable: false,
  },
};

export const WithCustomIcon = {
  args: {
    message: "Alert with custom icon",
    type: "info",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export const WithDismissCallback = () => {
  const [lastDismissed, setLastDismissed] = useState("");
  
  return (
    <div className="space-y-4">
      {!lastDismissed.includes("success") && (
        <AlertBanner
          message="Success alert with dismiss callback"
          type="success"
          onDismiss={() => setLastDismissed(prev => prev + "success,")}
        />
      )}
      
      {!lastDismissed.includes("warning") && (
        <AlertBanner
          message="Warning alert with dismiss callback"
          type="warning"
          onDismiss={() => setLastDismissed(prev => prev + "warning,")}
        />
      )}
      
      {!lastDismissed.includes("error") && (
        <AlertBanner
          message="Error alert with dismiss callback"
          type="error"
          onDismiss={() => setLastDismissed(prev => prev + "error,")}
        />
      )}
      
      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <p>Dismissed alerts: {lastDismissed || "None"}</p>
      </div>
    </div>
  );
};

export const MultipleAlerts = () => (
  <div className="space-y-2">
    <AlertBanner
      message="Success: Your changes have been saved."
      type="success"
    />
    <AlertBanner
      message="Warning: This action may take a few minutes."
      type="warning"
    />
    <AlertBanner
      message="Error: Unable to connect to server."
      type="error"
    />
    <AlertBanner
      message="Info: New version available."
      type="info"
    />
  </div>
);

export const AutoDismiss = {
  args: {
    message: "This alert will auto-dismiss after 3 seconds",
    type: "info",
    autoDismissDelay: 3000,
  },
};