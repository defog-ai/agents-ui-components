import { CircleAlert } from "lucide-react";

export function AnalysisError({ error_message = null }) {
  return (
    <div className="p-4 mb-4 border rounded-lg bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
      <div className="flex items-center gap-2 mb-2">
        <CircleAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
        <span className="font-semibold text-rose-700 dark:text-rose-300">An error occurred</span>
      </div>
      <div className="pl-6 text-rose-600 dark:text-rose-400">
        {error_message || "Something went wrong"}
      </div>
    </div>
  );
}
