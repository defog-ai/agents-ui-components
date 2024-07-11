/**
 * Lays out the chart body, x and y axis in a nice flexbox layout.
 * @component
 * @param {object} props - The props of the component
 * @param {object} props.chartBody - The chart body to render
 * @param {object} props.yAxis - The y-axis to render
 * @param {object} props.xAxis - The x-axis to render
 *
 */
export function ChartLayout({ chartBody = null, yAxis = null, xAxis = null }) {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-row grow">
        <div className="relative w-28 grow">{yAxis}</div>
        <div className="h-full w-full relative ">{chartBody}</div>
      </div>

      {/* chart body + the x axis */}
      <div className="flex flex-row w-full mt-4">
        <div className="relative w-28 grow"></div>
        <div className="w-full h-full relative grow border-t">{xAxis}</div>
      </div>
    </div>
  );
}
