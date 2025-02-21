import { useState } from "react";
import { Input, TextArea } from "@ui-components";
import { Trash2, CirclePlus } from "lucide-react";

export function AnalysisInputs({ initialInputs, handleEdit }) {
  const [inputs, setInputs] = useState(initialInputs);

  // prop is input name, newVal is the new value
  function onEdit(prop: string, newVal: string | Array<any>) {
    const newInputs = { ...inputs };
    newInputs[prop] = newVal;
    setInputs(newInputs);

    if (!handleEdit) return;
    handleEdit(prop, newVal);
  }

  return (
    <div className="text-sm text-gray-700 tool-input-list dark:text-gray-300">
      {/* Question Input */}
      {inputs.question && (
        <div className="mb-6">
          <div className="flex flex-row flex-wrap items-center gap-3 font-mono text-xs">
            <span className="p-1 mr-2 text-gray-400 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-400">
              String
            </span>
            <span className="font-bold">question</span>
          </div>
          <div className="mt-2">
            <TextArea
              rootClassNames="w-full"
              textAreaClassNames="resize-none overflow-auto text-sm"
              value={inputs.question}
              defaultRows={1}
              onChange={(ev) => {
                onEdit("question", ev.target.value);
              }}
            />
          </div>
        </div>
      )}

      {/* Hard Filters */}
      {inputs.hard_filters && (
        <div className="space-y-4">
          <div className="flex flex-row flex-wrap items-center gap-3 font-mono text-xs">
            <span className="p-1 mr-2 text-gray-400 bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-400">
              List
            </span>
            <span className="font-bold">hard_filters</span>
          </div>
          <div className="pb-4 space-y-2">
            {inputs.hard_filters.map((filter, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <Input
                  rootClassNames="flex-1"
                  value={filter}
                  placeholder="Filter condition"
                  onChange={(ev) => {
                    const newFilters = [...inputs.hard_filters];
                    newFilters[i] = ev.target.value;
                    onEdit("hard_filters", newFilters);
                  }}
                />
                <button
                  className="p-1.5 text-gray-400  group-hover:text-red-500 transition-opacity"
                  onClick={() => {
                    const newFilters = inputs.hard_filters.filter(
                      (_, idx) => idx !== i
                    );
                    onEdit("hard_filters", newFilters);
                  }}
                >
                  <span className="sr-only">Remove filter</span>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onEdit("hard_filters", [...(inputs.hard_filters || []), ""])
              }
              className="flex mt-4 items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <CirclePlus size={14} />
              <span>Add Filter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
