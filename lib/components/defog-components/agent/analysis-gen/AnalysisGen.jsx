import React, {
  useContext,
  useEffect,
  Fragment,
  useMemo,
  useState,
} from "react";
import Clarify from "./Clarify";
import { ThemeContext } from "../../../../context/ThemeContext";
import { Select, Tabs, Input } from "antd";
import { GlobalAgentContext } from "../../../context/GlobalAgentContext";

const generationStages = ["clarify"];

const agentRequestNames = {
  clarify: "Refine",
};

const components = {
  clarify: Clarify,
};

export default function AnalysisGen({
  analysisData,
  // if the "current stage" is done or not
  stageDone = true,
  // if any stage is currently loading, disable submits on all stages
  currentStage = null,
  handleSubmit = () => {},
  globalLoading,
  searchRef = null,
  handleEdit = () => {},
}) {
  const { Search } = Input;
  const { theme } = useContext(ThemeContext);
  const globalAgentContext = useContext(GlobalAgentContext);
  const [toolboxSelection, setToolboxSelection] = useState(null);
  // const tabsRef = useRef(null);

  const [activeTab, setActiveTab] = useState(
    currentStage === "clarify" ? "1" : "2"
  );

  const [questionEdited, setQuestionEdited] = useState(false);

  useEffect(() => {
    setQuestionEdited(false);
  }, [analysisData]);

  useEffect(() => {
    setActiveTab(currentStage === "clarify" ? "1" : "2");
  }, [currentStage]);

  // tabs array for antd tabs
  const tabs = useMemo(
    () =>
      Object.keys(analysisData)
        .filter((d) => generationStages.indexOf(d) > -1 && analysisData[d])
        .map((stage, i) => {
          return {
            label: agentRequestNames[stage],
            key: String(i + 1),
            forceRender: true,
            children: (
              <div
                key={stage}
                className={
                  Object.keys(analysisData).indexOf(stage) > -1
                    ? "ready"
                    : "not-ready"
                }
              >
                {components[stage]
                  ? React.createElement(components[stage], {
                      data: analysisData[stage],
                      handleSubmit: (
                        ev,
                        stageInput = {},
                        submitSourceStage = null
                      ) => {
                        setActiveTab(String(i + 2 > 2 ? 2 : i + 2));

                        stageInput.toolboxes = toolboxSelection
                          ? [toolboxSelection]
                          : [];

                        return handleSubmit(ev, stageInput, submitSourceStage);
                      },
                      theme: theme,
                      allowDisable: false,
                      globalLoading: globalLoading,
                      stageDone: stage === currentStage ? stageDone : true,
                      isCurrentStage: stage === currentStage,
                      handleEdit,
                    })
                  : null}
              </div>
            ),
          };
        }),
    [
      currentStage,
      globalLoading,
      handleEdit,
      handleSubmit,
      analysisData,
      stageDone,
      theme,
    ]
  );
  const toolboxes = globalAgentContext.val.userItems.toolboxes || [];

  const memoDep = toolboxes.join(",");
  const toolboxDropdown = useMemo(() => {
    const options = toolboxes.map((tb) => ({
      label: tb,
      value: tb,
    }));

    if (!toolboxSelection && toolboxes.length) {
      setToolboxSelection(toolboxes[0]);
    } else if (!toolboxes.length) {
      setToolboxSelection(null);
    }

    return toolboxes.length ? (
      <Select
        options={options}
        size="small"
        defaultValue={toolboxes[0]}
        onChange={(val) => setToolboxSelection(val)}
        popupClassName="analysis-toolbox-dropdown"
      ></Select>
    ) : (
      <></>
    );
  }, [memoDep]);

  return (
    <div>
      <div className="analysis-gen-ctr">
        <div className="analysis-toolbox-selection-ctr">
          <div className="analysis-toolbox-selection-header">ASK DEFOG</div>
          {toolboxDropdown}
        </div>
        <div key={"user_question"} className="user-question-search-ctr">
          <Search
            onPressEnter={(ev) => handleSubmit(ev)}
            onChange={(ev) => {
              if (ev.target.value !== analysisData?.user_question) {
                setQuestionEdited(true);
              } else {
                setQuestionEdited(false);
              }
            }}
            onSearch={(ev) => {
              handleSubmit(ev, {
                toolboxes: toolboxSelection ? [toolboxSelection] : [],
              });
            }}
            ref={searchRef}
            disabled={globalLoading}
            placeholder="Ask a question"
            enterButton={currentStage === null ? "Start" : "Restart"}
            defaultValue={analysisData?.user_question}
          ></Search>
          {/* <span className="search-info-on-question-change">
            <InfoCircleOutlined style={{ marginRight: 5, marginLeft: 2 }} />
            If you want to get an exact match for a variable name instead of a
            LIKE query, please put double quotes around the variable that you
            want the exact match for.
          </span> */}
        </div>
        {currentStage !== null ? (
          <Tabs
            items={tabs}
            tabPosition="top"
            // activeKey={activeTab}
            // onTabClick={(key) => setActiveTab(key)}
          ></Tabs>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
