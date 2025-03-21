import { useCallback, useRef } from "react";

/**
 * Hook for managing URL item ID
 */
export const useUrlItemId = () => {
  // Get item_id from URL
  const getItemIdFromUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const itemIdParam = urlParams.get("item_id");

      if (itemIdParam) {
        // Try to convert to number if it's numeric
        const numericId = Number(itemIdParam);
        const itemId = !isNaN(numericId) ? numericId.toString() : itemIdParam;
        return itemId;
      }
      return null;
    }
    return null;
  }, []);

  // Store the URL item ID
  const initialItemId = getItemIdFromUrl();
  const urlItemIdRef = useRef(initialItemId);

  // Function to update URL with item_id
  const updateUrlWithItemId = useCallback((itemId: string | number | null) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (itemId !== null) {
        // Ensure itemId is string
        const itemIdStr = String(itemId);
        url.searchParams.set("item_id", itemIdStr);
      } else {
        url.searchParams.delete("item_id");
      }
      window.history.pushState({}, "", url.toString());
    }
  }, []);

  return { urlItemIdRef, updateUrlWithItemId };
};