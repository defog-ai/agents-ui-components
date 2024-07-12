import React, { Fragment, useEffect, useRef } from "react";

export default function ChartImage({ apiEndpoint, images = [] }) {
  const imgRefs = useRef(images.map(() => null));

  return (
    <div className="chart-images-ctr">
      {images.map((image, i) => (
        <img
          ref={(ref) => (imgRefs.current[i] = ref)}
          src={
            `${apiEndpoint}/get_assets?path=` +
            encodeURIComponent(image.path)
          }
          key={i}
          alt={"Loading image"}
        />
      ))}
    </div>
  );
}
