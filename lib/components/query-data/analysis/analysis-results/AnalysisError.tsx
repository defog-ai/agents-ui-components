import { CircleAlert } from "lucide-react";

export function AnalysisError({ error_message = null }) {
  return (
    <div className="p-4 mb-4 border rounded-lg bg-rose-50 border-rose-200">
      <div className="flex items-center gap-2 mb-2">
        <CircleAlert className="w-4 h-4 text-rose-500" />
        <span className="font-semibold text-rose-700">An error occurred</span>
      </div>
      <div className="pl-6 text-rose-600">
        {error_message || "Something went wrong"}
      </div>
    </div>
  );
}
