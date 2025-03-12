"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageManager,
  MessageManagerContext,
  MessageMonitor,
  Modal,
  SingleSelect,
  SpinningLoader,
} from "@ui-components";
import {
  AnalysisTree,
  AnalysisTreeManager,
} from "../analysis-tree-viewer/analysisTreeManager";
import { MetadataTabContent } from "./MetadataTabContent";
// import { PreviewDataTabContent } from "../../defog-analysis-agent-embed/tab-content/PreviewDataTabContent";
import {
  createQueryDataEmbedConfig,
  QueryDataEmbedContext,
} from "../../context/QueryDataEmbedContext";
import ErrorBoundary from "../../../../lib/components/common/ErrorBoundary";
import { AnalysisTreeViewer } from "../analysis-tree-viewer/AnalysisTreeViewer";
import { getMetadata } from "@utils/utils";
import { Tab, Tabs } from "../../../../lib/components/core-ui/Tabs";
import { CreateNewProject } from "../../../../lib/components/common/CreateNewProject";

interface EmbedProps {
  /**
   * The hashed password.
   */
  token: string;
  /**
   * Whether the search bar is draggable
   */
  searchBarDraggable?: boolean;
  /**
   * Whether to hide the raw analysis of results.
   */
  hideRawAnalysis?: boolean;
  /**
   * The list of charts that *will be hidden*.
   */
  hiddenCharts?: Array<string>;
  /**
   * Whether to hide the SQL/Code tab.
   */
  hideSqlTab?: boolean;
  /**
   * Whether to hide the "view data structure" and "preview data" tabs.
   */
  hidePreviewTabs?: boolean;
  /**
   * The API endpoint to use for the requests. Default is https://demo.defog.ai.
   */
  apiEndpoint: string;

  /**
   * Initial project names.
   */
  initialProjectList: { name: string; predefinedQuestions: string[] }[];
  /**
   * Whether to allow addition to dashboards.
   */
  /**
   * Callback for when the analysis tree changes for a particular project. Will be called on addition or removal of analyses.
   */
  onTreeChange: (projectName: string, tree: AnalysisTree) => void;
  /**
   * An object of initial trees to populate the UI with.
   */
  initialTrees: { [ProjectName: string]: {} };
}

export function QueryDataEmbed({
  apiEndpoint,
  token,
  initialProjectList = [],
  initialTrees = {},
  hideRawAnalysis = false,
  hiddenCharts = [],
  hideSqlTab = false,
  hidePreviewTabs = false,
  searchBarDraggable = false,
  onTreeChange = (...args) => {},
}: EmbedProps) {
  const [initialised, setInitialised] = useState(false);

  const [embedConfig, setEmbedConfig] = useState(
    createQueryDataEmbedConfig({
      token,
      hideRawAnalysis,
      hiddenCharts,
      hideSqlTab,
      hidePreviewTabs,
      apiEndpoint,
    })
  );

  embedConfig.updateConfig = (updates) => {
    setEmbedConfig((prev) => ({ ...prev, ...updates }));
  };

  /**
   * We set this to a random string every time.
   * Just to prevent conflicts with uploaded files.
   */
  const { current: newProjectName } = useRef<string>(
    crypto.randomUUID().toString()
  );

  const [projectList, setProjectList] = useState<
    {
      name: string;
      predefinedQuestions: string[];
      metadata?: any;
    }[]
  >(initialProjectList);

  const trees = useRef(
    initialProjectList.reduce((acc, project) => {
      acc[project.name] = {
        projectName: project.name,
        predefinedQuestions: project.predefinedQuestions,
        treeManager: AnalysisTreeManager(initialTrees[project.name] || {}),
      };

      return acc;
    }, {})
  );

  const [selectedProject, setSelectedProject] = useState(null);

  const { current: message } = useRef(MessageManager());

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function setupMetadata() {
      const fetchedMetadata = {};
      for await (const project of projectList) {
        if (project.name === newProjectName) continue;
        try {
          const metadata = await getMetadata(apiEndpoint, token, project.name);
          fetchedMetadata[project.name] = metadata;
        } catch (error) {
          console.error(error);
          fetchedMetadata[project.name] = null;
        }
      }

      const newprojectList = projectList.map((d) => {
        return {
          ...d,
          metadata: fetchedMetadata[d.name],
        };
      });

      setSelectedProject(newprojectList[0]);

      setProjectList(newprojectList);

      setInitialised(true);
    }

    setupMetadata();
  }, []);

  const selector = useMemo(() => {
    if (!selectedProject || !initialised) return null;
    return (
      <SingleSelect
        label="Select database"
        popupClassName="!max-w-full"
        rootClassNames="mb-2"
        value={selectedProject?.name}
        allowClear={false}
        placeholder="Select Database"
        allowCreateNewOption={false}
        options={[
          {
            value: newProjectName,
            label: "Upload new",
          },
        ].concat(
          projectList.map((project) => ({
            value: project.name,
            label: project.name,
          }))
        )}
        onChange={(v: string) => {
          const matchingProject = projectList.find(
            (project) => project.name === v
          );
          if (v === newProjectName) {
            setModalOpen(true);
          } else {
            setSelectedProject(matchingProject || projectList[0]);
          }
        }}
      />
    );
  }, [selectedProject, projectList]);

  const wasUploaded = useRef<string | null>(null);

  useEffect(() => {
    if (wasUploaded.current) {
      setSelectedProject(
        projectList.find((project) => project.name === wasUploaded.current) ||
          projectList[0]
      );
      wasUploaded.current = null;
    }
  }, [projectList]);

  const treeContent = useMemo(() => {
    if (!selectedProject || !initialised) return null;

    return (
      <ErrorBoundary>
        <AnalysisTreeViewer
          defaultSidebarOpen={true}
          beforeTitle={selector}
          searchBarDraggable={searchBarDraggable}
          projectName={selectedProject.name}
          metadata={selectedProject.metadata}
          analysisTreeManager={trees.current[selectedProject.name].treeManager}
          autoScroll={true}
          predefinedQuestions={selectedProject.predefinedQuestions || []}
          onTreeChange={(projectName, tree) => {
            try {
              onTreeChange(projectName, tree);
            } catch (e) {
              console.error(e);
            }
          }}
        />
      </ErrorBoundary>
    );
  }, [selectedProject, selector, initialised]);

  const dataStructureContent = useMemo(() => {
    if (!selectedProject || !initialised) return null;
    return <MetadataTabContent metadata={selectedProject.metadata} />;
  }, [projectList, selectedProject, initialised, selector]);

  const tabs = useMemo<Tab[]>(() => {
    return [
      {
        name: "Query",
        content: treeContent,
      },
      {
        name: "View data structure",
        content: dataStructureContent,
      },
    ];
  }, [treeContent, dataStructureContent]);

  const newProjectCreator = useMemo(() => {
    return (
      <CreateNewProject
        apiEndpoint={apiEndpoint}
        token={token}
        onProjectCreated={async (projectName) => {
          try {
            trees.current = {
              ...trees.current,
              [projectName]: {
                projectName: projectName,
                treeManager: AnalysisTreeManager(),
              },
            };

            const metadata = await getMetadata(apiEndpoint, token, projectName);

            setProjectList((prev) => [
              ...prev,
              {
                name: projectName,
                predefinedQuestions: [
                  "What are the tables available?",
                  "Show me 5 rows",
                ],
                metadata,
              },
            ]);

            message.success(
              "Database uploaded successfully, access it by the name: " +
                projectName
            );

            wasUploaded.current = projectName;
          } catch (error) {
            message.error(error);
          } finally {
            setModalOpen(false);
          }
        }}
      />
    );
  }, [projectList]);

  return (
    <MessageManagerContext.Provider value={message}>
      <MessageMonitor rootClassNames={"absolute left-0 right-0"} />
      <QueryDataEmbedContext.Provider value={embedConfig}>
        <div className="relative w-full h-full p-2">
          {initialised ? (
            projectList?.length ? (
              <Tabs
                size="small"
                tabs={tabs}
                vertical={true}
                contentClassNames="p-0 mt-2 sm:mt-0 bg-white dark:bg-gray-800"
                defaultTabClassNames="p-0 sm:mt-0 h-full"
                selectedTabHeaderClasses={(nm) =>
                  nm === "Tree" ? "bg-transparent" : ""
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {newProjectCreator}
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SpinningLoader />
            </div>
          )}
          <Modal
            contentClassNames="h-full"
            title="Upload new database"
            open={modalOpen}
            footer={false}
            onCancel={() => setModalOpen(false)}
          >
            {newProjectCreator}
          </Modal>
        </div>
      </QueryDataEmbedContext.Provider>
    </MessageManagerContext.Provider>
  );
}
