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
  defaultAgentConfig,
  GlobalAgentContext,
  RelatedAnalysesContext,
} from "../context/GlobalAgentContext";
import { getAllAnalyses, getToolboxes } from "../utils/utils";
import { DocSidebars } from "./DocSidebars";
import { ReactiveVariablesContext } from "./ReactiveVariablesContext";
import { ReactiveVariableNode } from "./custom-tiptap/ReactiveVariableNode";
import { ReactiveVariableMention } from "./custom-tiptap/ReactiveVariableMention";
import setupBaseUrl from "../utils/setupBaseUrl";
import { setupWebsocketManager } from "../utils/websocket-manager";
import { customBlockSchema } from "./createCustomBlockSchema";
import { filterSuggestionItems } from "@blocknote/core";
import { getCustomSlashMenuItems } from "./createCustomSlashMenuItems";
import { BlockNoteView } from "@blocknote/mantine";
import { SpinningLoader } from "../../ui-components/lib/main";

export function Doc({
  docId,
  user,
  token,
  apiEndpoint,
  keyName,
  devMode,
  config = {},
}) {
  const partyEndpoint = apiEndpoint;
  const recentlyViewedEndpoint = setupBaseUrl({
    protocol: "http",
    path: "add_to_recently_viewed_docs",
    apiEndpoint: apiEndpoint,
  });

  const [yjsSynced, setYjsSynced] = useState(false);

  const [socketsConnected, setSocketsConnected] = useState(false);

  const [agentConfig, setAgentConfig] = useState(
    Object.assign({}, defaultAgentConfig, {
      config: {
        ...defaultAgentConfig.config,
        ...config,
      },
    })
  );

  const [reactiveContext, setReactiveContext] = useState(
    useContext(ReactiveVariablesContext)
  );

  const [relatedAnalysesContext, setRelatedAnalysesContext] = useState(
    useContext(RelatedAnalysesContext)
  );

  // this is the main socket manager for the agent
  const [mainSocketManager, setMainSockerManager] = useState(null);
  // this is for editing tool inputs/outputs
  const [toolSocketManager, setToolSocketManager] = useState(null);
  // this is for handling re runs of tools
  const [reRunManager, setReRunManager] = useState(null);

  useEffect(() => {
    async function setup() {
      // setup user items
      const items = agentConfig.userItems;
      const analyses = await getAllAnalyses(keyName, apiEndpoint);

      if (analyses && analyses.success) {
        items.analyses = analyses.analyses;
      }
      const toolboxes = await getToolboxes(token, apiEndpoint);
      if (toolboxes && toolboxes.success) {
        items.toolboxes = toolboxes.toolboxes;
      }

      const urlToConnect = setupBaseUrl({
        protocol: "ws",
        path: "ws",
        apiEndpoint: apiEndpoint,
      });
      const mainMgr = await setupWebsocketManager(urlToConnect);
      setMainSockerManager(mainMgr);

      const rerunMgr = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/step_rerun")
      );

      setReRunManager(rerunMgr);

      const toolSocketManager = await setupWebsocketManager(
        urlToConnect.replace("/ws", "/edit_tool_run"),
        (d) => console.log(d)
      );

      setToolSocketManager(toolSocketManager);

      setSocketsConnected(true);

      setAgentConfig({
        ...agentConfig,
        userItems: items,
        socketManagers: {
          mainManager: mainMgr,
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
      if (mainSocketManager && mainSocketManager.close) {
        mainSocketManager.close();
        // also stop the timeout
        mainSocketManager.clearSocketTimeout();
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

  return yjsSynced && socketsConnected ? (
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
          value={{ val: agentConfig, update: setAgentConfig }}
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
    <div className="w-full h-screen flex flex-col justify-center items-center ">
      <div className="mb-2 text-gray-400 text-sm">
        {yjsSynced ? "Connecting to servers" : "Syncing document"}
      </div>
      <SpinningLoader classNames="w-5 h-5 text-gray-500" />
    </div>
  );
}

export default Doc;
