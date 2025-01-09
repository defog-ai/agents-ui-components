import React, { useEffect, useState } from "react";

/**
 * A hook that returns the current window size.
 * @returns {[number, number]} The current window size in px.
 * @example
 * // Logs the current window size.
 * function MyComponent() {
 *   const [width, height] = useWindowSize();
 *   console.log(width, height);
 *   return <div>Window size: {width}x{height}</div>;
 * }
 */
export function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
}
