import { OraclePublicReport } from "@oracle";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { useState, useEffect } from "react";

function PublicReportViewer() {
  const [uuid, setUuid] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [useSystemTheme, setUseSystemTheme] = useState<boolean>(true);

  // Extract UUID from the URL path
  useEffect(() => {
    const path = window.location.pathname;
    const uuidMatch = path.match(/\/oracle\/public\/report\/([^/]+)/);
    
    if (uuidMatch && uuidMatch[1]) {
      setUuid(uuidMatch[1]);
    } else {
      // Fallback to URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const uuidParam = urlParams.get('uuid');
      if (uuidParam) {
        setUuid(uuidParam);
      }
    }
  }, []);

  useEffect(() => {
    if (!useSystemTheme) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);

    // Set initial value
    setDarkMode(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [useSystemTheme]);

  // Form submission handler
  const handleUuidSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUuid = formData.get('uuid') as string;
    if (newUuid) {
      setUuid(newUuid);
      // Update URL without reloading the page
      const url = new URL(window.location.href);
      url.searchParams.set('uuid', newUuid);
      window.history.pushState({}, '', url);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <button
        onClick={() => {
          setUseSystemTheme(false);
          setDarkMode(!darkMode);
        }}
        className="rounded-full fixed z-[100] top-2 right-2 p-2 bg-gray-600 dark:bg-gray-700 shadow-sm hover:shadow-md transition-all"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>

      {!uuid ? (
        <div className="flex flex-col items-center justify-center h-screen p-4">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Oracle Public Report Viewer</h1>
          <form onSubmit={handleUuidSubmit} className="flex flex-col gap-4 w-full max-w-md">
            <div>
              <label htmlFor="uuid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report UUID</label>
              <input 
                type="text" 
                id="uuid" 
                name="uuid" 
                placeholder="Enter report UUID..." 
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                required
              />
            </div>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              View Report
            </button>
          </form>
        </div>
      ) : (
        <OraclePublicReport
          // In development, the component will prepend /api to the URL
          apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
          publicUuid={uuid}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <PublicReportViewer />
);