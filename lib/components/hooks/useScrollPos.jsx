import React, { useEffect, useState } from "react";

/**
 * A hook that returns the current scroll position.
 * @returns {number} The current scroll position.
 *
 * @example
 * // Logs the current scroll position.
 * function MyComponent() {
 *  const scrollPos = useScrollPos();
 *  console.log(scrollPos);
 * return <div>Scroll position: {scrollPos}</div>;
 * }
 */
export function useScrollPos() {
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPos(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return scrollPos;
}
