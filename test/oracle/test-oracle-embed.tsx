import { OracleEmbed } from "@oracle";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { useEffect, useState } from "react";
import { getApidbNames } from "@utils/utils";
import { SpinningLoader } from "@ui-components";

function OracleEmbedTest() {
  const [apiKeyNames, setApiKeyNames] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [useSystemTheme, setUseSystemTheme] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    async function setup() {
      const keyNames = await getApidbNames(
        import.meta.env.VITE_API_ENDPOINT,
        import.meta.env.VITE_TOKEN
      );
      setApiKeyNames(keyNames);
      setLoading(false);
    }

    setup();
  }, []);

  useEffect(() => {
    if (!useSystemTheme) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    
    // Set initial value
    setDarkMode(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [useSystemTheme]);

  return (
    <div className={`h-screen ${darkMode ? "dark" : ""}`}>
      <button
        onClick={() => {
          setUseSystemTheme(false);
          setDarkMode(!darkMode);
        }}
        className="fixed top-4 right-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm hover:shadow-md transition-all"
      >
        {darkMode ? "☀️ Light" : "🌙 Dark"} {useSystemTheme && "(System)"}
      </button>
      {loading ? (
        <SpinningLoader />
      ) : (
        <OracleEmbed
          apiEndpoint={import.meta.env.VITE_API_ENDPOINT}
          token={import.meta.env.VITE_TOKEN}
          initialKeyNames={apiKeyNames}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <OracleEmbedTest />
);
