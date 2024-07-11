import { Button } from "../../../ui-components/lib/main";
import { twMerge } from "tailwind-merge";

export function ToolReRun({
  onClick = () => {},
  text = "Re run",
  loading = false,
  className = "tool-re-run",
}) {
  return (
    <Button disabled={loading} className={twMerge(className)} onClick={onClick}>
      <p>{text}</p>
    </Button>
  );
}
