import { OracleEmbed } from "@oracle";
import ReactDOM from "react-dom/client";
import "../../lib/styles/index.scss";

function OracleEmbedTest() {
  return (
    <div className="h-screen">
      <OracleEmbed apiEndpoint={import.meta.env.VITE_API_ENDPOINT} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <OracleEmbedTest />
);
