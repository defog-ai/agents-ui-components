// a place to display various things avaialble to this user for the doc
// for example analyses, or other things
// expected they should be able to drag and drop these things into the doc

import React, { useContext, useEffect, useRef, useState } from "react";
import { Input } from "antd";
import { AgentConfigContext } from "../context/AgentContext";
import ErrorBoundary from "../common/ErrorBoundary";

export function AnalysisList() {
  const agentConfigContext = useContext(AgentConfigContext);
  const analysesRef = useRef(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    agentConfigContext.val.analyses
      .filter((d) => d && d.user_question)
      .map((analysis, i) => {
        let dom = analysesRef.current.querySelector(
          `#analysis-list-${analysis.analysis_id}`
        );

        dom.addEventListener("dragstart", (e) => {
          e.dataTransfer.clearData();
          e.dataTransfer.setData(
            "text/html",
            // all data-PROP_NAME attributes will go into the block.props.PROP_NAME. (make sure to define the propSchema in the block spec)
            // remember that attributes here are going to be lowercased and camelCased
            // so "analysis-id" becomes "analysisId"
            // your prop should be "analysisId"
            `<div data-content-type="analysis" data-analysis-id="${analysis.analysis_id}"></div>`
          );
        });
      });
  }, [agentConfigContext]);

  return (
    <ErrorBoundary>
      <div id="analysis-list-sidebar" ref={analysesRef} className="sidebar">
        <Input
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Filter your old analysis"
        />
        <div className="sidebar-content">
          {(agentConfigContext?.val?.analyses || [])
            .filter((d) => d && d.user_question !== "")
            .filter((d) => d && d?.user_question?.includes(searchText))
            .map((analysis, i) => (
              <div
                draggable="true"
                key={analysis.analysis_id}
                id={`analysis-list-${analysis.analysis_id}`}
                className="analysis-list-sidebar-item"
              >
                <span>{analysis.user_question}</span>
              </div>
            ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
