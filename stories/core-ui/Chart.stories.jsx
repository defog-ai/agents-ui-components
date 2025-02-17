import { parseData } from "../../lib/components/utils/utils.ts";
import csv from "./csv-sample.csv?raw";
import ChartContainer from "../../lib/components/observable-charts/ChartContainer.tsx";
import { AgentConfigContext } from "../../lib/components/context/AgentContext.tsx";
const { data: rows, columns } = parseData(csv);

console.log(csv, rows, columns);
function Wrapper(props) {
  console.log(props, import.meta.env.VITE_API_ENDPOINT);
  return (
    <AgentConfigContext.Provider
      value={{ val: { apiEndpoint: import.meta.env.VITE_API_ENDPOINT } }}
    >
      <ChartContainer {...props} />
    </AgentConfigContext.Provider>
  );
}

export default {
  title: "Core UI/Chart",
  component: Wrapper,
};

export const Primary = {
  args: { rows, columns },
};
