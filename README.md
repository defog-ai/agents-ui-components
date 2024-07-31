# agents-ui-components

The repo has five exports:
1. `@defogdotai/agents-ui-components/agent`: Agents related components.
2. `@defogdotai/agents-ui-components/core-ui`: Core UI components like Buttons, Tables, Tabs, Single select, etc.
3. `@defogdotai/agents-ui-components/tool-editor`: Tool editing components. used by our self hosted product.
4. `@defogdotai/agents-ui-components/doc`: Components for blocknote based docs, used by the self hosted product.
5. `@defogdotai/agents-ui-components/css`: Css styles for all the above. have to be imported separately in all cases.

The reason for both style separation and for export splitting, is nextjs. Agent components use document/window objects heavily, and keeping them in the same export as other components will make us unable to import the other components without using `next/dynamic` as well.

## Managers

This repo uses a bunch of "managers", both to manage agent/layout related use cases (`analysisManager.js` and `analysisTreeManager.js`), and things like websockets via `websocket-manager.js`.

`analysisManager.js`: manages a single analysis. It maintains the analysis data + tool run data, and provides functions to send and receive the data from the server for each step in an analysis. This is used in `AnalysisAgent.jsx`.

`analysisTreeManager.js`: manages a tree of multiple analyses. It can create a new initial/dummy/blank analysis object, which can then be used to create an analysis. You can see this being done in `AnalysisTreeViewer.jsx`. As long as a tree exists, it stores the analysis that area created and their respective analysisManagers. This prevents repeated requests for data/tool run data.

`websocket-manager.js`: Wrapper around a normal websocket providing convenience functions to send and receive messages. This is used in `analysisManager.js` to send and receive messages from the server.
