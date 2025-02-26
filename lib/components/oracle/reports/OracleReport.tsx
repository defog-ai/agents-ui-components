import { useEffect, useState } from "react";
import { SpinningLoader } from "@ui-components";
import {
  extensions,
  commentManager,
  OracleNav,
  OracleReportComment,
  OracleReportContext,
  fetchAndParseReportData,
  SQLAnalysis,
  ReportData,
} from "@oracle";
import { EditorProvider } from "@tiptap/react";
import { Tabs, Table } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";
import { ChartContainer } from "../../observable-charts/ChartContainer";

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
  const [analyses, setAnalyses] = useState<SQLAnalysis[]>([]);
  const [comments, setComments] = useState<OracleReportComment[]>([]);

  const [mdx, setMDX] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const setup = async (reportId: string, keyName: string) => {
      try {
        // don't fetch if either the report is not done
        // or if it's being revised and we already have the MDX
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
        data.analyses && setAnalyses(data.analyses);
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
    <OracleReportContext.Provider
      value={{
        apiEndpoint: apiEndpoint,
        tables: tables,
        multiTables: {},
        images: {},
        analyses: analyses,
        executiveSummary: null,
        reportId: reportId,
        keyName: keyName,
        token: token,
        commentManager: commentManager({
          apiEndpoint: apiEndpoint,
          reportId: reportId,
          keyName: keyName,
          token: token,
          initialComments: comments,
        }),
      }}
    >
      <div className="flex gap-4">
        <div className="flex-1 relative oracle-report-ctr">
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
        </div>
        {/* include analyses at the side */}
        <div className="w-[600px]">
          <Tabs
            tabs={analyses
              .filter((analysis) => analysis.error === "")
              .map((analysis) => ({
                name: analysis.question,
                content: (
                  <Tabs
                    tabs={[
                      {
                        name: "Table",
                        content: (
                          <Table
                            columns={analysis.columns}
                            rows={analysis.rows}
                            columnHeaderClassNames="py-2"
                            skipColumns={["index"]}
                          />
                        ),
                      },
                      {
                        name: "Chart",
                        content: (
                          <ErrorBoundary>
                            <ChartContainer
                              rows={analysis.rows}
                              columns={analysis.columns}
                              initialQuestion={analysis.question}
                              initialOptionsExpanded={false}
                            />
                          </ErrorBoundary>
                        ),
                      },
                    ]}
                  />
                ),
              }))}
          />
        </div>
      </div>
    </OracleReportContext.Provider>
  );
}
