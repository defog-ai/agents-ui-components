import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import AnalysisBlock from "./customBlocks/AnalysisBlock";
import TableChartBlock from "./customBlocks/TableChartBlock";

// make a copy and filter out table key from defaultblockspecs
const blockSpecsWithoutTable = { ...defaultBlockSpecs };
delete blockSpecsWithoutTable.table;

const customBlockSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...blockSpecsWithoutTable,
    analysis: AnalysisBlock,
    "table-chart": TableChartBlock,
  },
});

export { customBlockSchema };
