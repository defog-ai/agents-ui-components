import { OracleReportContext } from "../OracleReportContext";
import { deleteAnalysis, generateNewAnalysis } from "../oracleUtils";
import { Input } from "@ui-components";
import { useContext, useRef, useState } from "react";
import { OracleAnalysis } from "./OracleAnalysis";
import { Popconfirm } from "@ui-components";
import { Trash } from "lucide-react";

/**
 * Renders a follow-on analysis component that displays a list of analyses
 * and provides an input for generating new analyses.
 */
export function OracleAnalysisFollowOn({
  initialAnalysisIds = [],
  recommendationIdx = 0,
}: {
  initialAnalysisIds: string[];
  recommendationIdx: number;
}) {
  const [loading, setLoading] = useState<boolean>(false);

  const ctr = useRef(null);

  const { apiEndpoint, reportId, keyName, token } =
    useContext(OracleReportContext);

  const [analysisIds, setAnalysisIds] = useState<string[]>(initialAnalysisIds);

  return (
    <div>
      <div
        className="flex flex-col bg-gray-100 dark:bg-gray-600 p-4 gap-4 pb-28"
        ref={ctr}
      >
        {analysisIds.map((analysisId: string) => {
          return (
            <div className="relative" key={analysisId}>
              <Popconfirm
                title="Are you sure?"
                okText="Yes"
                cancelText="No"
                onConfirm={async () => {
                  await deleteAnalysis(
                    apiEndpoint,
                    reportId,
                    analysisId,
                    recommendationIdx,
                    keyName,
                    token
                  );

                  setAnalysisIds(analysisIds.filter((id) => id !== analysisId));
                }}
              >
                <div className="z-10 absolute top-[-20px] rounded-md text-gray-400 hover:text-rose-500 dark:bg-gray-800 dark:hover:text-rose-300 cursor-pointer transition-none">
                  <Trash className="w-4 h-4 transition-none" />
                </div>
              </Popconfirm>
              <OracleAnalysis analysisId={analysisId} />
            </div>
          );
        })}
      </div>
      <div className="sticky h-0 bottom-0 overflow-visible">
        <Input
          disabled={loading}
          rootClassNames="bg-gray-50 rounded-lg border border-gray-300 shadow-custom overflow-hidden p-2 h-20 absolute w-10/12 bottom-4 left-0 right-0 mx-auto mb-1 dark:bg-gray-700 dark:border-gray-800"
          inputClassNames="h-9 border-b-2 border-b-gray-300/50 dark:bg-gray-800 dark:text-white dark:border-none"
          onPressEnter={(e) => {
            if (!e.currentTarget.value) return;

            try {
              setLoading(true);
              const analysisId = crypto.randomUUID();

              generateNewAnalysis(
                apiEndpoint,
                reportId,
                analysisId,
                recommendationIdx,
                keyName,
                token,
                e.currentTarget.value,
                analysisIds
              ).then((d) => {
                console.log(d);
                setAnalysisIds([...analysisIds, analysisId]);
              });

              //   .then((d) => {
              //     const newAnalysis: AnalysisParsed = {
              //       analysis_id: analysisId,
              //       mdx: d.mdx,
              //       tables: d.tables || {},
              //       multiTables: d.multiTables || {},
              //       images: d.images || {},
              //       analysis_json: d.analysis,
              //     };

              //     setAnalyses([...analyses, newAnalysis]);

              //     setLoading(false);

              //   })
              //   .catch((e) => {
              //     console.error(e);
              //     setLoading(false);
              //   });
            } catch (error) {
              console.error(error);
              setLoading(false);
            } finally {
              setLoading(false);
            }
          }}
          placeholder="Explore further"
        />
        <div className="text-xs dark:text-gray-400 text-gray-800/40 absolute bottom-8 w-10/12 left-0 right-0 mx-auto px-3 z-10">
          <span>Type and Press Enter to start a new analysis</span>
        </div>
      </div>
    </div>
  );
}
