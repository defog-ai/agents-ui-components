import { parseData } from "../../lib/components/utils/utils.ts";
import csv from "./csv-sample.csv?raw";
import ChartContainer from "../../lib/components/observable-charts/ChartContainer.tsx";
import { QueryDataEmbedContext } from "../../lib/components/context/QueryDataEmbedContext.tsx";
const { data: rows, columns } = parseData(csv);

function Wrapper(props) {
  return (
    <QueryDataEmbedContext.Provider
      value={{ val: { apiEndpoint: import.meta.env.VITE_API_ENDPOINT } }}
    >
      <ChartContainer {...props} />
    </QueryDataEmbedContext.Provider>
  );
}

export default {
  title: "Core UI/Chart",
  component: Wrapper,
};

export const Primary = {
  args: { rows, columns },
};
