import { EditorProvider } from "@tiptap/react";
import { AnalysisParsed, OracleReportContext } from "../OracleReportContext";
import {
  ANALYSIS_STATUS,
  analysisExtensions,
  getReportAnalysis,
  parseMDX,
} from "../oracleUtils";
import { useContext, useEffect, useState } from "react";
import { SpinningLoader } from "@ui-components";
import ErrorBoundary from "../../common/ErrorBoundary";

const toSentenceCase = (str: string) => {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1);
};

interface OracleAnalysisProps {
  analysisId: string;
  recommendationIdx?: number | null;
}

export const OracleAnalysis = ({ analysisId }: OracleAnalysisProps) => {
  const [analysisStatus, setAnalysisStatus] = useState<string>("Loading");
  const [error, setError] = useState<string | null>(null);
  const { apiEndpoint, reportId, keyName, token } =
    useContext(OracleReportContext);

  const [analysisData, setAnalysisData] = useState<AnalysisParsed | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    async function getStatus() {
      let latestStatus: string;
      try {
        const data = await getReportAnalysis(
          apiEndpoint,
          reportId,
          keyName,
          token,
          analysisId
        );

        latestStatus = data.status + "";

        clearTimeout(timeout);

        if (
          latestStatus.toUpperCase() !== ANALYSIS_STATUS.DONE &&
          latestStatus.toUpperCase() !== ANALYSIS_STATUS.ERROR
        ) {
          timeout = setTimeout(getStatus, 1000);
          // @ts-ignore
          setAnalysisData({
            ...data,
          });
        } else {
          // @ts-ignore
          setAnalysisData({
            ...data,
            ...parseMDX(
              data.mdx,
              data.analysis_json?.artifacts?.fetched_table_csv
                ?.artifact_content,
              data.analysis_json?.working?.generated_sql,
              data.analysis_json?.generated_qn
            ),
          });
        }

        setAnalysisStatus(toSentenceCase(latestStatus));
      } catch (e: any) {
        setError(e.message);
        console.error(e);
      }
    }

    if (analysisId && !analysisData) {
      getStatus();
    }

    return () => clearTimeout(timeout);
  }, []);

  if (error) {
    return (
      <div
        data-analysis-id={analysisId}
        className="rounded-lg border dark:border-gray-500 drop-shadow-md bg-white dark:bg-gray-800 text-center p-4 text-rose-500"
      >
        {error}
      </div>
    );
  }

  if (
    analysisStatus.toUpperCase() !== ANALYSIS_STATUS.DONE &&
    analysisStatus.toUpperCase() !== ANALYSIS_STATUS.ERROR
  ) {
    return (
      <div
        data-analysis-id={analysisId}
        className="rounded-lg border dark:border-gray-500 drop-shadow-md dark:bg-gray-800 text-gray-500 bg-white p-4 min-h-20"
      >
        <div className="oracle-report-tiptap dark:prose-invert prose prose-base mx-auto p-2 mb-12 md:mb-0 focus:outline-none [&_.react-multitable-container]:lg:mx-0">
          <h3 className="text-xl text-gray-900 dark:text-white font-semibold text-left mb-2">
            {toSentenceCase(analysisData?.analysis_json?.title)}
          </h3>
          <div className="text-center my-8 text-sm text-gray-600 dark:text-gray-300">
            <SpinningLoader classNames="m-0 mb-2" />
            <div> {analysisStatus || "Exploring..."}</div>
          </div>
        </div>
      </div>
    );
  }

  if (analysisStatus === ANALYSIS_STATUS.ERROR) {
    return (
      <div
        data-analysis-id={analysisId}
        className="text-red-500 p-4 rounded-lg border dark:border-gray-500 drop-shadow-md dark:bg-gray-800 border-red-200 bg-red-50"
      >
        <h3 className="text-xl text-gray-900 dark:text-white font-semibold text-left mb-2">
          {toSentenceCase(analysisData?.analysis_json?.title)}
        </h3>
        <span className="text-sm text-rose-500">
          There was an error running this analysis
        </span>
      </div>
    );
  }

  if (!analysisData || !analysisData.mdx) {
    return (
      <div
        data-analysis-id={analysisId}
        className="text-red-500 p-4 rounded-lg border dark:border-gray-500 border-red-200 bg-red-50"
      >
        No analysis content available
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        data-analysis-id={analysisId}
        key={analysisData?.mdx}
        className="rounded-lg border dark:border-gray-500 drop-shadow-md bg-white dark:bg-gray-800 py-4"
      >
        <OracleReportContext.Provider
          value={{
            apiEndpoint: apiEndpoint,
            tables: analysisData?.tables || {},
            multiTables: analysisData?.multiTables || {},
            images: analysisData?.images || {},
            token: token,
            keyName,
            reportId,
            analysisIds: [],
            executiveSummary: {
              title: "",
              introduction: "",
              recommendations: [],
            },
            extra: { title: analysisData?.analysis_json?.title },
          }}
        >
          <EditorProvider
            extensions={analysisExtensions}
            content={analysisData?.mdx || ""}
            immediatelyRender={false}
            editable={false}
            editorProps={{
              attributes: {
                class:
                  "prose prose-base max-w-none dark:prose-invert mx-auto p-2 mb-12 md:mb-0 focus:outline-none [&_.react-multitable-container]:lg:mx-0 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:my-2 [&>ul]:my-2 [&>li]:my-1 [&>*]:text-gray-900 dark:[&>*]:text-gray-100",
              },
            }}
          />
        </OracleReportContext.Provider>
      </div>
    </ErrorBoundary>
  );
};
