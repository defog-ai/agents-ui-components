import { python } from "@codemirror/lang-python";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useRef } from "react";
import { EditorView } from "@codemirror/view";
import { twMerge } from "tailwind-merge";

export default function ToolCodeEditor({
  toolCode,
  className = "",
  editable = false,
  onChange = (...args) => {},
}) {
  const editor = useRef(null);

  return (
    <ReactCodeMirror
      ref={editor}
      className={twMerge("*:outline-0 *:focus:outline-0", className)}
      value={toolCode}
      editable={editable}
      extensions={[python(), EditorView.lineWrapping]}
      onChange={(val) => {
        onChange(val);
      }}
      basicSetup={{
        lineNumbers: false,
        highlightActiveLine: false,
      }}
    />
  );
}
