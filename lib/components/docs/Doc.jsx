"use client";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import React, { useState } from "react";
import { createEditorConfig } from "./createEditorConfig";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";
import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import DocNav from "./DocNav";
import { DocSidebars } from "./DocSidebars";
import { ReactiveVariableNode } from "./custom-tiptap/ReactiveVariableNode";
import { ReactiveVariableMention } from "./custom-tiptap/ReactiveVariableMention";
import setupBaseUrl from "../utils/setupBaseUrl";
import { customBlockSchema } from "./createCustomBlockSchema";
import { filterSuggestionItems } from "@blocknote/core";
import { getCustomSlashMenuItems } from "./createCustomSlashMenuItems";
import { BlockNoteView } from "@blocknote/mantine";
import { Setup } from "../context/Setup";
import { SpinningLoader } from "@ui-components";

/**
 * @typedef {Object} DocProps
 * @property {string} docId - Document ID.
 * @property {string} user - User email/name.
 * @property {string} token - Token aka hashed password. NOT api key.
 * @property {string} apiEndpoint - API endpoint.
 * @property {string} keyName - Api key name.
 * @property {boolean} devMode - Whether it is in development mode.
 * @property {boolean} isTemp - Whether it is a temporary DB aka CSV upload
 * @property {Object} metadata - Database's metadata information. Only used in case of CSV uploads.
 * @property {boolean} showAnalysisUnderstanding - Poorly named. Whether to show "analysis understanding" aka description of the results created by a model under the table.
 * @property {boolean} showCode - Whether to show tool code.
 * @property {boolean} allowDashboardAdd - Whether to allow addition to dashboards.
 * @property {boolean} sqlOnly - Whether the analysis is SQL only.
 * */

/**
 * Main document component.
 * @param {DocProps} props - Component
 * @returns {JSX.Element} - JSX element.
 *
 * @example
 * <Doc
 *  devMode={false}
 *  docId={docId}
 *  user={"admin"}
 *  token={...}
 *  ...
 * />
 */
export function Doc({
  docId,
  user,
  token,
  showAnalysisUnderstanding = true,
  showCode = true,
  allowDashboardAdd = true,
  keyName = "",
  isTemp = false,
  devMode = false,
  apiEndpoint = "https://demo.defog.ai",
  metadata = null,
  sqlOnly = false,
  sqliteConn = null,
  disableMessages = false,
}) {
  const partyEndpoint = apiEndpoint;
  const recentlyViewedEndpoint = setupBaseUrl({
    protocol: "http",
    path: "add_to_recently_viewed_docs",
    apiEndpoint: apiEndpoint,
  });

  const [yjsSynced, setYjsSynced] = useState(false);

  const yjsDoc = new Y.Doc();

  const yjsProvider = new YPartyKitProvider(partyEndpoint, docId, yjsDoc, {
    params: {
      docId: docId,
      token: token,
      keyName: keyName,
    },
    protocol: "ws",
  });

  const editor = useCreateBlockNote({
    ...createEditorConfig(null, yjsDoc, yjsProvider, token),
    placeholders: {
      default: "Type /analysis to start",
    },
    schema: customBlockSchema,
    _tiptapOptions: {
      extensions: [ReactiveVariableNode, ReactiveVariableMention],
    },
  });

  editor.token = token;
  editor.user = user;
  editor.devMode = devMode;
  editor.apiEndpoint = apiEndpoint;
  editor.keyName = keyName;

  editor.onEditorContentChange(() => {
    try {
      // get first text block
      const textBlocks = editor.document.filter((d) =>
        d?.content?.length ? d?.content[0]?.text : false
      );

      let pageTitle;
      if (!textBlocks?.length || textBlocks[0].content[0].text === "")
        pageTitle = "Untitled document";
      else pageTitle = textBlocks[0].content[0].text;

      // set page title using the first editor block
      document.title = pageTitle;
      yjsDoc.getMap("document-title").set("title", document.title);
    } catch (err) {
      console.log(err);
    }
  });

  yjsProvider.on("sync", () => {
    setYjsSynced(true);
  });

  return yjsSynced ? (
    <Setup
      token={token}
      user={user}
      apiEndpoint={apiEndpoint}
      devMode={devMode}
      showAnalysisUnderstanding={showAnalysisUnderstanding}
      showCode={showCode}
      allowDashboardAdd={allowDashboardAdd}
      sqliteConn={sqliteConn}
      disableMessages={disableMessages}
      loaderRootClassNames="h-screen"
      onSetupComplete={async () => {
        // add to recently viewed docs for this user
        await fetch(recentlyViewedEndpoint, {
          method: "POST",
          body: JSON.stringify({
            doc_id: docId,
            token: token,
          }),
        });
      }}
    >
      <DocNav
        token={token}
        currentDocId={docId}
        keyName={keyName}
        apiEndpoint={apiEndpoint}
      ></DocNav>
      <div className="content">
        <div className="editor-container max-w-full">
          <BlockNoteView
            editor={editor}
            theme={"light"}
            formattingToolbar={false}
            slashMenu={false}
          >
            <FormattingToolbarController
              formattingToolbar={CustomFormattingToolbar}
            />
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={async (query) =>
                filterSuggestionItems(getCustomSlashMenuItems(editor), query)
              }
            />
          </BlockNoteView>
        </div>
        <DocSidebars />
      </div>
    </Setup>
  ) : (
    <div className="w-full h-screen flex flex-col justify-center items-center ">
      <div className="mb-2 text-gray-400 text-sm">Syncing document</div>
      <SpinningLoader classNames="w-5 h-5 text-gray-500" />
    </div>
  );
}

export default Doc;
