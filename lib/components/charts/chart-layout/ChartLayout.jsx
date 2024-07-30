/**
 * @typedef {object} ChartLayoutProps - The props of the component
 * @property {object} chartBody - The chart body to render
 * @property {object} yAxis - The y-axis to render
 * @property {object} xAxis - The x-axis to render
 *
 */

/**
 * Lays out the chart body, x and y axis in a nice flexbox layout.
 * @param {ChartLayoutProps} props - The props of the component
 * */
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
