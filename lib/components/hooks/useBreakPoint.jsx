import React, { useEffect, useState } from "react";
import { useWindowSize } from "./useWindowSize";

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * A hook that returns the current breakpoint.
 * @returns {string} The current breakpoint.
 *
 * @example
 * // Logs the current breakpoint.
 * function MyComponent() {
 *   const breakpoint = useBreakPoint();
 *   console.log(breakpoint);
 *   return <div>Current breakpoint: {breakpoint}</div>;
 * }
 */
export function useBreakPoint() {
  const [breakpoint, setBreakpoint] = useState("lg");
  const [width] = useWindowSize();

  useEffect(() => {
    if (width < breakpoints.sm) {
      setBreakpoint("xs");
    } else if (width < breakpoints.md) {
      setBreakpoint("sm");
    } else if (width < breakpoints.lg) {
      setBreakpoint("md");
    } else if (width < breakpoints.xl) {
      setBreakpoint("lg");
    } else {
      setBreakpoint("xl");
    }
  }, [width]);

  return breakpoint;
}
