import { OracleEmbed } from "@oracle";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";
import { useEffect, useState } from "react";
import { getApiKeyNames } from "@utils/utils";
import { SpinningLoader } from "@ui-components";

function OracleEmbedTest() {
  const [apiKeyNames, setApiKeyNames] = useState<string[]>([]);

  useEffect(() => {
    async function setup() {
      const keyNames = await getApiKeyNames(
        import.meta.env.VITE_API_ENDPOINT,
        import.meta.env.VITE_TOKEN
      );
      setApiKeyNames(keyNames);
    }

    setup();
  }, []);

  return (
    <div className="h-screen">
      {!apiKeyNames.length ? (
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
