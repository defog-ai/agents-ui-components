# agents-ui-components

Contains a bunch of reusable agent components.

This uses our [ui-components](https://github.com/defog-ai/ui-components) repo as a submodule.

## Usage

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

Now you can go into `test/Doc.jsx` or `test/QueryDataPage.jsx` to see your components! Any changes you make to your code inside `lib/` will be reflected immediately.

When done with improvements/edits, push to this repo and (maybe) notify others that they would need to run `git pull` in their repos in case they're using this code.
