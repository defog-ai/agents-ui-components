import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import AnalysisBlock from "./custom-blocks/AnalysisBlock";

// make a copy and filter out table key from defaultblockspecs
const blockSpecsWithoutTable = { ...defaultBlockSpecs };
delete blockSpecsWithoutTable.table;

const customBlockSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...blockSpecsWithoutTable,
    analysis: AnalysisBlock,
  },
});

export { customBlockSchema };
