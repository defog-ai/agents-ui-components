import { DefogAnalysisAgentStandalone } from "../lib/main"

function App() {
  return (
    <div className="w-full">
      <DefogAnalysisAgentStandalone
        analysisId={"test"}
        token={"123"}
        devMode={false}
        keyName="analysis" />
    </div>
  )
}

export default App;
