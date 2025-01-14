import { Button } from "@ui-components";
import { twMerge } from "tailwind-merge";

export function StepReRun({
  onClick = (...args) => {},
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
