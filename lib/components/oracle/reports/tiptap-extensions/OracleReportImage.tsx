import {
  mergeAttributes,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  Node,
} from "@tiptap/react";
import { useContext, useEffect, useState } from "react";
import { OracleReportContext } from "../../utils";
import { SpinningLoader } from "@ui-components";
import { getReportImage } from "../../utils";

function OracleReportImage({ node }: NodeViewProps) {
  const { apiEndpoint, images, dbName, reportId, token } =
    useContext(OracleReportContext);

  const { src, alt } = images[node.attrs.id as string] || {};

  const [base64, setBase64] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImage() {
      try {
        const encoded = await getReportImage(
          apiEndpoint,
          reportId,
          dbName,
          token,
          src
        );
        setError(null);

        setBase64("data:image/png;base64," + encoded);
      } catch (e) {
        console.error(e);
        setError("Error fetching image");
      }
    }

    fetchImage();
  }, []);

  return (
    <NodeViewWrapper className="react-component not-prose">
      {error ? (
        <div className="bg-rose-100 text-red text-center rounded-md p-2">
          {error}
        </div>
      ) : base64 ? (
        <img src={base64} alt={alt} />
      ) : (
        <SpinningLoader />
      )}
    </NodeViewWrapper>
  );
}

export const OracleReportImageExtension = Node.create({
  name: "oracle-image",
  group: "block",

  addAttributes() {
    return {
      id: {
        default: null,
        isRequired: true,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "oracle-image",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["oracle-image", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(OracleReportImage);
  },
});
