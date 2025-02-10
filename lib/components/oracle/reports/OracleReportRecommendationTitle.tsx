import {
  NodeViewContent,
  mergeAttributes,
  Node,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import React, { useContext, useRef, useState, useEffect } from "react";
import { Drawer } from "@ui-components";
import { OracleAnalysisDrawerWithFollowOn } from "./OracleAnalysisDrawerWithFollowOn";
import { OracleReportContext } from "../OracleReportContext";
import { createRoot, Root } from "react-dom/client";

interface RecommendationTitleAttrs {
  analysis_reference: string;
  idx: number;
}

const RecommendationTitleComponent = ({ node }: NodeViewProps) => {
  const attrs = node.attrs as RecommendationTitleAttrs;
  const ctx = useContext(OracleReportContext);

  const analysisIds = useRef(
    ctx.executiveSummary?.recommendations?.[attrs.idx]?.analysis_reference || []
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRoot = useRef<Root | null>(null);
  const drawerRootId = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    /**
     * This is probably the worst thing I've ever done in my life to get a thing to work.
     * This is to prevent tiptap taking over everything about hte drawer we render
     * (because this is all a child of the editor)
     * Tiptap taking over seems to disable all text selection on this element somehow.
     * Seems to be an issue for others as well: https://github.com/ueberdosis/tiptap/issues/4036
     *
     * We have to create a new div, and append it to the body.
     * Then we create a new Root instance and mount it to the new div.
     * Then we render the component to the new div.
     * This also errors out if we try to unmount the Root instance
     * after we've already rendered the component to it.
     * Because some race condition happens where react is still trying to render the component
     * while being unmounted.
     */
    try {
      if (!drawerRoot.current) {
        const newDiv = document.createElement("div");
        newDiv.id = drawerRootId.current;
        document.body.appendChild(newDiv);
        drawerRoot.current = createRoot(newDiv);
      }

      drawerRoot.current.render(
        <OracleReportContext.Provider value={ctx}>
          <Drawer
            rootClassNames="analysis-follow-on-drawer"
            visible={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
            }}
            placement="left"
            title={<span className="dark:text-white">Relevant analyses</span>}
            width={600}
          >
            <OracleAnalysisDrawerWithFollowOn
              initialAnalysisIds={analysisIds.current}
              recommendationIdx={attrs.idx}
            />
          </Drawer>
        </OracleReportContext.Provider>
      );
    } catch (e) {
      console.log(e);
    }
  }, [drawerOpen]);

  useEffect(() => {
    return () => {
      if (drawerRoot.current) {
        try {
          drawerRoot.current.unmount();
        } finally {
          // definitely delete the dom node though. sorry react :(
          const node = document.getElementById(drawerRootId.current);
          if (node) {
            node.remove();
          }
        }
      }
    };
  }, []);

  return (
    <NodeViewWrapper className="react-component not-prose underline underline-offset-2 group">
      <div
        className="relative font-bold text-lg cursor-pointer"
        onClick={() => {
          setDrawerOpen(true);
        }}
      >
        <NodeViewContent />
        <span className="text-gray-400 text-sm font-light dark:text-gray-200">
          ✨ Dig Deeper
        </span>
      </div>
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
