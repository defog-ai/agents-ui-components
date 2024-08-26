import { Select } from "antd";
import * as d3 from "d3";

const { Option, OptGroup } = Select;

const COLOR_SCHEMES = {
  categorical: [
    "category10",
    "accent",
    "dark2",
    "paired",
    "pastel1",
    "pastel2",
    "set1",
    "set2",
    "set3",
    "tableau10",
  ],
  diverging: [
    "brbg",
    "prgn",
    "piyg",
    "puor",
    "rdbu",
    "rdgy",
    "rdylbu",
    "rdylgn",
    "spectral",
  ],
};

const ColorSchemeSelector = ({ value, onChange }) => {
  const getColorScheme = (scheme) => {
    const schemeKey = `scheme${scheme.charAt(0).toUpperCase() + scheme.slice(1)}`;
    const interpolatorKey = `interpolate${scheme.charAt(0).toUpperCase() + scheme.slice(1)}`;

    if (d3[schemeKey]) {
      return d3[schemeKey];
    } else if (d3[interpolatorKey]) {
      return d3[interpolatorKey];
    }
    return null;
  };

  const renderColorPreview = (scheme) => {
    const colorScheme = getColorScheme(scheme);
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
      <h3 className="mb-2 input-label">Color Scheme</h3>
      <Select value={value} style={{ width: "100%" }} onChange={onChange}>
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
