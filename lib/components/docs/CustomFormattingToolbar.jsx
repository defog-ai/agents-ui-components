import { useState, Fragment } from "react";
import {
  BasicTextStyleButton,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  TextAlignButton,
  useBlockNoteEditor,
  useEditorSelectionChange,
} from "@blocknote/react";
import "@blocknote/core/style.css";
import { aiBlocks } from "../utils/utils";

export const CustomFormattingToolbar = () => {
  const [showToolBar, setShowToolBar] = useState(true);
  const editor = useBlockNoteEditor();

  useEditorSelectionChange(() => {
    setShowToolBar(
      aiBlocks.indexOf(editor.getTextCursorPosition()?.block?.type) === -1 &&
        editor.getSelection() !== undefined
    );
  }, editor);

  return showToolBar ? (
    <FormattingToolbar>
      {/* <BlockTypeDropdown /> */}
      {/*Default button to toggle bold.*/}
      <BasicTextStyleButton basicTextStyle={"bold"} />
      {/*Default button to toggle italic.*/}
      <BasicTextStyleButton basicTextStyle={"italic"} />
      {/*Default button to toggle underline.*/}
      <BasicTextStyleButton basicTextStyle={"underline"} />
      <BasicTextStyleButton basicTextStyle={"strike"} />

      <TextAlignButton textAlignment={"left"} />
      <TextAlignButton textAlignment={"center"} />
      <TextAlignButton textAlignment={"right"} />

      <ColorStyleButton />
      {/* <NestBlockButton />
      <UnnestBlockButton /> */}

      <CreateLinkButton />
    </FormattingToolbar>
  ) : null;
};
