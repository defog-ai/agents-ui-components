import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SpinningLoader } from "@ui-components";
import {
  extensions,
  commentManager,
  OracleNav,
  OracleReportComment,
  OracleReportContext,
  Summary,
  fetchAndParseReportData,
  ReportData,
  reportStatusManager,
} from "@oracle";
import { AgentConfigContext } from "@agent";
import { EditorProvider } from "@tiptap/react";

export function OracleReport({
  apiEndpoint,
  reportId,
  keyName,
  token,
  onReportParsed = () => {},
  onDelete = () => {},
}: {
  apiEndpoint: string;
  reportId: string;
  keyName: string;
  token: string;
  onDelete?: (reportId: string, apiKeyName: string) => void;
  onReportParsed?: (data: ReportData | null) => void;
}) {
  const [tables, setTables] = useState<any>({});
  const [multiTables, setMultiTables] = useState<any>({});
  const [images, setImages] = useState<any>({});
  const [analysisIds, setAnalysisIds] = useState<string[]>([]);
  const [comments, setComments] = useState<OracleReportComment[]>([]);

  const [mdx, setMDX] = useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<Summary | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const statusManager = useRef(
    reportStatusManager({
      apiEndpoint,
      reportId,
      keyName,
      token,
    })
  ).current;

  const status = useSyncExternalStore(
    statusManager.subscribeToStatusUpdates,
    statusManager.getStatus
  );

  useEffect(() => {
    statusManager.startPolling();
    return () => {
      statusManager.stopPolling();
    };
  }, []);

  const isBeingRevised = status?.startsWith("Revision in progress");

  useEffect(() => {
    if (status === "error") {
      setError("Error generating report");
    }
    if (status === "loading") {
      setLoading(true);
    }
  }, [status]);

  useEffect(() => {
    const setup = async (reportId: string, keyName: string) => {
      try {
        // don't fetch if either the report is not done
        // or if it's being revised and we already have the MDX
        if (
          !(status === "done" || (isBeingRevised && !mdx)) ||
          !reportId ||
          !keyName
        )
          return;

        setLoading(true);

        let data: ReportData;

        data = await fetchAndParseReportData(
          apiEndpoint,
          reportId,
          keyName,
          token
        );

        data.parsed.mdx && setMDX(data.parsed.mdx);
        data.parsed.tables && setTables(data.parsed.tables);
        data.parsed.multiTables && setMultiTables(data.parsed.multiTables);
        data.parsed.images && setImages(data.parsed.images);
        data.analysisIds && setAnalysisIds(data.analysisIds);
        data.summary && setExecutiveSummary(data.summary);
        data.comments && setComments(data.comments);

        onReportParsed && onReportParsed(data);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (reportId && keyName) {
      setup(reportId, keyName);
    }
  }, [reportId, keyName, status]);

  if (loading) {
    return (
      <div
        className={
          "w-full h-full min-h-60 flex flex-col justify-center items-center text-center rounded-md p-2"
        }
      >
        <div className="mb-2 text-sm text-gray-400 dark:text-gray-200">
          <SpinningLoader classNames="w-5 h-5" />
          Loading
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          "w-full h-full min-h-60 flex flex-col justify-center items-center bg-rose-100 dark:bg-rose-900 text-red text-center rounded-md p-2"
        }
      >
        <div className="mb-2 text-sm text-rose-500 dark:text-rose-400">
          {error}
        </div>
      </div>
    );
  }

  // if (!mdx && (status === "loading")) {
  //   return (
  //     <div
  //       className={
  //         "w-full h-full min-h-60 flex flex-col justify-center items-center"
  //       }
  //     >
  //       <div className="mb-2 text-sm text-gray-400 dark:text-gray-500">
  //         Fetching
  //       </div>
  //       <SpinningLoader classNames="w-5 h-5 text-gray-500 dark:text-gray-400" />
  //     </div>
  //   );
  // }

  return (
    // sad reality for getting the chart container to work
    // it makes a request to this api endpoint to edit the chart's config
    // which defaults to demo.defog.ai if not provided
    // (╯°□°)╯︵ ┻━┻
    <AgentConfigContext.Provider
      value={{
        // @ts-ignore
        val: { apiEndpoint: apiEndpoint || "" },
      }}
    >
      <OracleReportContext.Provider
        value={{
          apiEndpoint: apiEndpoint,
          tables: tables,
          multiTables: multiTables,
          images: images,
          analysisIds: analysisIds,
          executiveSummary: executiveSummary,
          reportId: reportId,
          keyName: keyName,
          token: token,
          reportStatusManager: statusManager,
          commentManager: commentManager({
            apiEndpoint: apiEndpoint,
            reportId: reportId,
            keyName: keyName,
            token: token,
            initialComments: comments,
          }),
        }}
      >
        <div className="relative oracle-report-ctr">
          {status === "done" || isBeingRevised ? (
            <EditorProvider
              extensions={extensions}
              content={mdx}
              immediatelyRender={false}
              editable={false}
              slotBefore={<OracleNav onDelete={onDelete} />}
              editorProps={{
                attributes: {
                  class:
                    "max-w-2xl oracle-report-tiptap relative prose prose-base dark:prose-invert mx-auto p-2 mb-12 md:mb-0 focus:outline-none *:cursor-default",
                },
              }}
            ></EditorProvider>
          ) : (
            <div className="w-full h-full min-h-60 flex flex-col justify-center items-center text-center rounded-md p-2">
              <div className="mb-2 text-sm text-gray-400 dark:text-gray-200">
                {status}
              </div>
            </div>
          )}
        </div>
      </OracleReportContext.Provider>
    </AgentConfigContext.Provider>
  );
}
