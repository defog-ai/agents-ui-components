import { PhotoIcon } from "@heroicons/react/20/solid";
import { range } from "d3";

export function ToolEditorInput({
  input,
  name = null,
  onClick = (...args) => {},
  isTable = false,
  isImage = false,
}) {
  return (
    <>
      <div className="text-sm rounded-t-md font-semibold text-gray-900 p-1 bg-gray-100 mb-1">
        {name || input.name}
      </div>
      <div className="p-1 grow">
        {isTable ? (
          <div
            className="p-2 bg-blue-50 h-full hover:bg-blue-100 group shadow-inner grid grid-cols-4 gap-1 grid-rows-2 rounded-md border-gray-100 cursor-pointer"
            onClick={() => onClick(input)}
          >
            {range(0, 8).map((d, i) => (
              <div
                key={i}
                className="bg-blue-100 group-hover:bg-blue-200"
              ></div>
            ))}
          </div>
        ) : isImage ? (
          <div className="h-full">
            <PhotoIcon
              onClick={() => onClick(input)}
              className="w-full text-blue-50 cursor-pointer hover:text-blue-200"
            />
          </div>
        ) : (
          <div className="px-1">
            <div className="text-sm text-gray-500">{input.value + ""}</div>
          </div>
        )}
      </div>
    </>
  );
}
