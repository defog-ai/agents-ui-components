import { EditorProvider } from "@tiptap/react";
import { AnalysisParsed, OracleReportContext } from "../OracleReportContext";
import {
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
  const { apiEndpoint, reportId, dbName, token } =
    useContext(OracleReportContext);

  const [analysisData, setAnalysisData] = useState<AnalysisParsed | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    async function getStatus() {
      try {
        const data = await getReportAnalysis(
          apiEndpoint,
          reportId,
          dbName,
          token,
          analysisId
        );

        clearTimeout(timeout);

        // @ts-ignore
        setAnalysisData({
          ...data,
          ...parseMDX(
            data.mdx,
            data.analysis_json?.artifacts?.fetched_table_csv?.artifact_content,
            data.analysis_json?.working?.generated_sql,
            data.analysis_json?.generated_qn
          ),
        });

        setAnalysisStatus("done");
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
            dbName,
            reportId,
            analyses: [],
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
