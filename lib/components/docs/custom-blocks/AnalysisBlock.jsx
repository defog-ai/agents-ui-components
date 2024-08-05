import { createReactBlockSpec } from "@blocknote/react";
import { createGlobalStyle } from "styled-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { AnalysisAgent } from "../../agent/analysis/AnalysisAgent";

function createAnalysisBlockCss(blockId) {
  return createGlobalStyle`div [data-id="${blockId}"] {
  margin: 0.2em 0 !important;
}`;
}

const AnalysisBlock = createReactBlockSpec(
  {
    type: "analysis",
    propSchema: {
      analysisId: {
        default: null,
      },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const GlobalStyle = createAnalysisBlockCss(block.id);

      return (
        <ErrorBoundary>
          <GlobalStyle />
          <AnalysisAgent
            analysisId={block.props.analysisId}
            rootClassNames={
              "w-full mb-4 [&_.analysis-content]:min-h-96 shadow-md analysis-" +
              block.props.analysisId
            }
            onManagerDestroyed={(mgr, id) => {
              // delete thsi block
              editor.removeBlocks([block.id]);
            }}
          />
        </ErrorBoundary>
      );
    },
  }
);

export default AnalysisBlock;
