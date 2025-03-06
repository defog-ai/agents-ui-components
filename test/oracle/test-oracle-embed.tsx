import { OracleEmbed } from "@oracle";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { useEffect, useState } from "react";
import { getApidbNames } from "@utils/utils";
import { SpinningLoader } from "@ui-components";

function OracleEmbedTest() {
  const [dbNames, setDbNames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [useSystemTheme, setUseSystemTheme] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    async function setup() {
      const dbNames = await getApidbNames(
        import.meta.env.VITE_API_ENDPOINT,
        import.meta.env.VITE_TOKEN
      );
      setDbNames(dbNames);
      setLoading(false);
    }

    setup();
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

  return (
    <div className={`h-screen ${darkMode ? "dark" : ""}`}>
      <button
        onClick={() => {
          setUseSystemTheme(false);
          setDarkMode(!darkMode);
        }}
        className="rounded-full fixed z-[100] top-2 right-2 p-2 bg-gray-600 dark:bg-gray-700 shadow-sm hover:shadow-md transition-all"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
      {loading ? (
        <SpinningLoader />
      ) : (
        <OracleEmbed
          apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
          token={import.meta.env.VITE_TOKEN}
          initialDbNames={dbNames}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <OracleEmbedTest />
);
