import { Select, Tooltip, Space } from "antd";
import * as d3 from "d3";
import { ChartManagerContext } from "../ChartManagerContext";
import { useContext } from "react";
import { getColorScheme } from "../plotUtils.ts";
import { Info } from "lucide-react";

const { Option, OptGroup } = Select;

const COLOR_SCHEMES = {
  categorical: ["Category10", "Paired", "Set2", "Tableau10"],
  diverging: ["PuOr", "Spectral"],
};

const ColorSchemeSelector = ({ value, onChange }) => {
  const chartManager = useContext(ChartManagerContext);
  const { selectedColumns } = chartManager.config;

  const colorBy = selectedColumns.fill;

  const renderColorPreview = (scheme) => {
    const { colorScheme } = getColorScheme(scheme);
    if (!colorScheme) return null;

    let colors;
    const numColors = 5;

    if (Array.isArray(colorScheme)) {
      // It's a discrete color scheme
      colors = colorScheme.slice(0, numColors);
    } else if (typeof colorScheme === "function") {
      // It's a color interpolator
      if (COLOR_SCHEMES.diverging.includes(scheme)) {
        const divergingScale = d3
          .scaleDiverging(colorScheme)
          .domain([0, (numColors - 1) / 2, numColors - 1]);
        colors = Array.from({ length: numColors }, (_, i) => divergingScale(i));
      } else {
        // Fallback for unknown scheme types
        colors = Array.from({ length: numColors }, (_, i) =>
          colorScheme(i / (numColors - 1))
        );
      }
    } else {
      return null;
    }

    return (
      <div style={{ display: "flex", marginRight: "8px" }}>
        {colors.map((color, index) => (
          <div
            key={index}
            style={{
              width: "12px",
              height: "12px",
              backgroundColor: color,
              marginRight: "2px",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <Space className="w-full mb-2" align="center" justify="space-between">
        <h3 className="w-full m-0 input-label">Color Scheme</h3>
      </Space>
      <Select
        value={value}
        style={{ width: "100%" }}
        onChange={onChange}
        // disabled={!colorBy}
      >
        <OptGroup label="Categorical">
          {COLOR_SCHEMES.categorical.map((scheme) => (
            <Option key={scheme} value={scheme}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {renderColorPreview(scheme)}
                {scheme}
              </div>
            </Option>
          ))}
        </OptGroup>

        <OptGroup label="Diverging">
          {COLOR_SCHEMES.diverging.map((scheme) => (
            <Option key={scheme} value={scheme}>
              <div style={{ display: "flex", alignItems: "center" }}>
                {renderColorPreview(scheme)}
                {scheme}
              </div>
            </Option>
          ))}
        </OptGroup>
      </Select>
    </div>
  );
};

export default ColorSchemeSelector;
