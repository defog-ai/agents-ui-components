import {
  NodeViewContent,
  mergeAttributes,
  Node,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import React, { useContext, useRef, useState } from "react";
import { Drawer } from "@ui-components";
import { OracleAnalysisFollowOn } from "./OracleAnalysisFollowOn";
import { OracleReportContext } from "../OracleReportContext";
import { createPortal } from "react-dom";

interface RecommendationTitleAttrs {
  analysis_reference: string;
  idx: number;
}

const RecommendationTitleComponent = ({ node, view }: NodeViewProps) => {
  const attrs = node.attrs as RecommendationTitleAttrs;
  const recommendationIdx = useRef(attrs.idx);

  const { executiveSummary } = useContext(OracleReportContext);

  const analysisIds = useRef(
    executiveSummary?.recommendations?.[recommendationIdx.current]
      ?.analysis_reference || []
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <NodeViewWrapper className="react-component not-prose underline underline-offset-2 group">
      <div
        className="relative font-bold text-lg cursor-pointer"
        onClick={() => setDrawerOpen(true)}
      >
        <NodeViewContent />
        <span className="text-gray-400 text-sm font-light dark:text-gray-200">
          ✨ Dig Deeper
        </span>
      </div>
      {createPortal(
        <Drawer
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          title={<span className="dark:text-white">Relevant analyses</span>}
          width={600}
        >
          <OracleAnalysisFollowOn
            initialAnalysisIds={analysisIds.current}
            recommendationIdx={recommendationIdx.current}
          />
        </Drawer>,
        view.dom.parentElement
      )}
    </NodeViewWrapper>
  );
};

export const RecommendationTitle = Node.create({
  name: "recommendationTitle",
  group: "block",
  content: "text*",
  addAttributes() {
    return {
      analysis_reference: {
        default: "",
        isRequired: true,
      },
      idx: {
        default: 100000,
        isRequired: true,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "oracle-recommendation-title",
        getAttrs: (attrs) => {
          return {
            analysis_reference: attrs["analysis_reference"],
            idx: attrs["idx"],
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["oracle-recommendation-title", mergeAttributes(HTMLAttributes), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(RecommendationTitleComponent);
  },
});
