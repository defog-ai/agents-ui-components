"use client";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import React, { useState, Fragment, useContext, useEffect } from "react";
import { createEditorConfig } from "./createEditorConfig";
import * as Y from "yjs";
import YPartyKitProvider from "y-partykit/provider";
import { CustomFormattingToolbar } from "./CustomFormattingToolbar";
import DocNav from "./DocNav";
import {
  GlobalAgentContext,
  RelatedAnalysesContext,
} from "../context/GlobalAgentContext";
import { getAllAnalyses, getToolboxes } from "../utils/utils";
import { DocSidebars } from "./DocSidebars";
import { ReactiveVariablesContext } from "./ReactiveVariablesContext";
import { ReactiveVariableNode } from "./customTiptap/ReactiveVariableNode";
import { ReactiveVariableMention } from "./customTiptap/ReactiveVariableMention";
import setupBaseUrl from "../utils/setupBaseUrl";
import { setupWebsocketManager } from "../utils/websocket-manager";
import { customBlockSchema } from "./createCustomBlockSchema";
import { filterSuggestionItems } from "@blocknote/core";
import { getCustomSlashMenuItems } from "./createCustomSlashMenuItems";
import { BlockNoteView } from "@blocknote/mantine";

// remove the last slash from the url
export function Doc({ docId = null, user = null, token = null, apiEndpoint = null }) {
  const partyEndpoint = apiEndpoint;
  const recentlyViewedEndpoint = setupBaseUrl(
    protocol="http",
    path="add_to_recently_viewed_docs",
    apiEndpoint=apiEndpoint,
  );

  const [loading, setLoading] = useState(true);
  const [globalAgentContext, setGlobalAgentContext] = useState(
    useContext(GlobalAgentContext)
  );

  const [reactiveContext, setReactiveContext] = useState(
    useContext(ReactiveVariablesContext)
  );

  const [relatedAnalysesContext, setRelatedAnalysesContext] = useState(
    useContext(RelatedAnalysesContext)
  );

  // this is the main socket manager for the agent
  const [socketManager, setSocketManager] = useState(null);
  // this is for editing tool inputs/outputs
  const [toolSocketManager, setToolSocketManager] = useState(null);
  // this is for handling re runs of tools
  const [reRunManager, setReRunManager] = useState(null);

  useEffect(() => {
    async function setup() {
      // setup user items
      const items = globalAgentContext.userItems;
      const analyses = await getAllAnalyses();

      if (analyses && analyses.success) {
        items.analyses = analyses.analyses;
      }
      const toolboxes = await getToolboxes(token);
      if (toolboxes && toolboxes.success) {
        items.toolboxes = toolboxes.toolboxes;
      }

      const urlToConnect = setupBaseUrl(protocol="ws", path="ws", apiEndpoint=apiEndpoint,);
      const mgr = await setupWebsocketManager(urlToConnect);
      setSocketManager(mgr);

      const rerunMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/step_rerun")
      );

      setReRunManager(rerunMgr);

      const toolSocketManager = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/edit_tool_run"),
        (d) => console.log(d)
      );
      setToolSocketManager(toolSocketManager);

      setGlobalAgentContext({
        ...globalAgentContext,
        userItems: items,
        socketManagers: {
          mainManager: mgr,
          reRunManager: rerunMgr,
          toolSocketManager: toolSocketManager,
        },
      });

      // add to recently viewed docs for this user
      await fetch(recentlyViewedEndpoint, {
        method: "POST",
        body: JSON.stringify({
          doc_id: docId,
          token: token,
        }),
      });
    }

    setup();

    return () => {
      if (socketManager && socketManager.close) {
        socketManager.close();
        // also stop the timeout
        socketManager.clearSocketTimeout();
      }
      if (reRunManager && reRunManager.close) {
        reRunManager.close();
        reRunManager.clearSocketTimeout();
      }
      if (toolSocketManager && toolSocketManager.close) {
        toolSocketManager.close();
        toolSocketManager.clearSocketTimeout();
      }
    };
  }, []);

  const yjsDoc = new Y.Doc();

  const yjsProvider = new YPartyKitProvider(partyEndpoint, docId, yjsDoc, {
    params: {
      doc_id: docId,
      token: token,
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

  window.editor = editor;
  editor.token = token;
  editor.user = user;
  window.reactiveContext = reactiveContext;

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
    setLoading(false);
  });

  return !loading ? (
    <RelatedAnalysesContext.Provider
      value={{
        val: relatedAnalysesContext,
        update: setRelatedAnalysesContext,
      }}
    >
      <ReactiveVariablesContext.Provider
        value={{ val: reactiveContext, update: setReactiveContext }}
      >
        <GlobalAgentContext.Provider
          value={{ val: globalAgentContext, update: setGlobalAgentContext }}
        >
          <DocNav token={token} currentDocId={docId}></DocNav>
          <div className="content">
            <div className="editor-container max-w-full">
              <BlockNoteView
                editor={editor}
                theme={"light"}
                formattingToolbar={false}
                slashMenu={false}
              >
                <FormattingToolbarController
                  editor={editor}
                  formattingToolbar={CustomFormattingToolbar}
                />
                <SuggestionMenuController
                  editor={editor}
                  triggerCharacter="/"
                  getItems={async (query) =>
                    filterSuggestionItems(
                      getCustomSlashMenuItems(editor),
                      query
                    )
                  }
                />
              </BlockNoteView>
            </div>
            <DocSidebars />
          </div>
        </GlobalAgentContext.Provider>
      </ReactiveVariablesContext.Provider>
    </RelatedAnalysesContext.Provider>
  ) : (
    <h5>Loading your document...</h5>
  );
}

export default Doc;
