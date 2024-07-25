# agents-ui-components

Contains a bunch of reusable agent components.

This uses our [ui-components](https://github.com/defog-ai/ui-components) repo as a submodule.

For the following docs, you may want to keep this figure in mind (The text labels are component names)
<img width="974" alt="image" src="https://github.com/user-attachments/assets/0b361c8c-2b42-4f5e-8075-5fbc945a958b">

## Main components

The two main components you will use are:

1. `DefogAnalysisAgentStandalone`: This allows for you to ask questions/run analysis/toggle agent/sql-only with a _specific database_. This will not let you change db. The "Standalone" in the name means that this can work outside of a "doc", which is where agents were initially designed to be used. This is a standalone agent that can be used in any page.

```jsx
// expects these to be specified
<DefogAnalysisAgentStandalone
  token
  devMode
  keyName
  apiEndpoint
  ...
  // will be explained below
  analysisTreeManager = ...
  ...
/>
```

2. `QueryDataScaffolding`: This is purely a scaffolding component. Think of it as a "layout" component. This provides selectors of databases, and csv upload button. It renders the top bar you see above, and everything inside the tag (`children`) is rendered underneath the bar.

```jsx
<QueryDataScaffolding
    defaultSelectedDb={selectedDbName}
    availableDbs={availableDbs.map((d) => d.name)}
    onDbChange={(selectedDbName) => ...}
    ...
>
    // may be DefogAnalysisAgentStandalone or any other custom component
    <Content>
</QueryDataScaffolding>
```

The usual use case for the above is:

```jsx
<QueryDataScaffolding
    defaultSelectedDb={selectedDbName}
    availableDbs={availableDbs.map((d) => d.name)}
    onDbChange={(selectedDbName) => ...}
    ...
>
    <DefogAnalysisAgentStandalone
       ...
    />
</QueryDataScaffolding>
```

## Managers

This repo uses a bunch of "managers", both to manage agent/layout related use cases (`analysisManager.js` and `analysisTreeManager.js`), and things like websockets via `websocket-manager.js`.

`analysisManager.js`: manages a single analysis. It maintains the analysis data, and provides functions to send and receive the data from the server for each step in an analysis. This is used in `AnalysisAgent.jsx`

`analysisTreeManager.js`: manages a tree of multiple analyses. It can create a new initial/dummy/blank analysis object, which can then be used to create an analysis. You can see this being done in `AnalysisTreeViewer.jsx`

`websocket-manager.js`: Wrapper around a normal websocket providing convenience functions to send and receive messages. This is used in `analysisManager.js` to send and receive messages from the server.

## A note about AnalysisTreeManager and DefogAnalysisAgentStandalone

By default, `DefogAnalysisAgentStandalone` will start off with a fresh blank tree with no analyses. If you want to pass it an existing tree, then create your analysisTreeManager object separately, and pass it to `DefogAnalysisAgentStandalone` as a prop. That way, even when that component is unmounted/destroyed, your tree manager will remain intact.

```jsx
const analysisTreeManager = AnalysisTreeManager({}, "Manufacturing")
<DefogAnalysisAgentStandalone
  ...
  analysisTreeManager={analysisTreeManager}
  ...
  />
```

## Code usage examples

If you want to replicate the main front end experience you can find on self-hosted and the website, the basic process is as follows (for a full example, you can look at the [QueryData](https://github.com/defog-ai/defog-self-hosted/blob/main/frontend/components/agents/QueryData.jsx#L34C10-L34C24) component in defog-self-hosted):

1. We first create three tabs using our `Tabs` component.

```jsx

const [selectedDbKeyName, setSelectedDbKeyName] = useState(null)

const tabs = [
    {
        name: "Analysis",
        content: <DefogAnalysisAgentStandalone
            ...
            analysisTreeManager={selectedDb.analysisTreeManager}
            keyName={selectedDbKeyName}
        />
    },
    {
        name: "Metadata",
        // this is usually a simple table component
        content: <...>
    },
    {
        name: "Preview data",
        // this is usually a simple table component
        content: <...>
    }
]
```

2. To change the `selectedDb` state variable above, we can use QueryDataScaffolding which gives us db selection UI and onChange methods.

```jsx
const availableDbs = [
    {
        name: "Manufacturing",
        keyName: "Manufacturing",
        isTemp: false,
        metadata: null,
        data: {},
        metadataFetchingError: false,
        // save managers because we don't want to lose all analyses
        // when db changes
        analysisTreeManager: AnalysisTreeManager({}, "Manufacturing"),
    },
    {
        name: "db2",
        tables: ["table3", "table4"]
        isTemp: false,
        metadata: null,
        data: {},
        metadataFetchingError: false,
        analysisTreeManager: AnalysisTreeManager({}, "Manufacturing"),
    }
]

<QueryDataScaffolding
    defaultSelectedDb={selectedDbName}
    availableDbs={availableDbs.map((d) => d.name)}
    onDbChange={(selectedDbName) => setSelectedDbName(selectedDbName)}
    ...
>
    <Tabs tabs={tabs} />
</QueryDataScaffolding>
```

## Repo Usage

Because this isn't a published library, the intended usage currently is as a git submodule. To set that up in your repo, do:

1. `git submodule add https://github.com/defog-ai/agents-ui-components`

This will cause the folder to be added as a submodule and also your .gitmodules to be created/updated in your repo.

To get the latest code from inside a submodule, run git pull inside the submodule folder.

Note: to get all the styles working, you will also have to do these imports in your code:

For docs:
`import "@blocknote/mantine/style.css";`

For all other stuff:
`import agents-ui-components/lib/styles/index.scss`

## Developing/Testing

All component source files live inside `lib/`.

To "Test" this folder aka actually see your components, the stuff is inside `test/`

Test locally using the following commands in project root:

1. `npm i`
2. `npm run dev`
3. Open `localhost:5173/` in your browser

We have two pages so far: query-data and doc. Mimicing, as far as possible, the main front end experience.

Now you can go into `test/test-doc.jsx` or `test/test-query.jsx` to see your components! Any changes you make to your code inside `lib/` will be reflected immediately.

When done with improvements/edits, push to this repo and (maybe) notify others that they would need to run `git pull` in their repos in case they're using this code.
