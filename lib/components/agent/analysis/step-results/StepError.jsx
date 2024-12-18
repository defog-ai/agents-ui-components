import { CircleAlert } from "lucide-react";

export function StepError({ error_message = null }) {
  return (
    <div className="tool-run-error">
      <div className="tool-run-error-icon flex flex-row items-center">
        <span>
          <CircleAlert className="mr-1 w-3 h-3 text-rose-400" />
        </span>
        <span className="font-bold text-rose-400"> An error occurred</span>
      </div>
      <div className="tool-run-error-message">
        {error_message || "Something went wrong"}
      </div>
    </div>
  );
}
