# agents-ui-components

## Quickstart

### Usage

Run `npm run storybook` and go to the Quickstart page for instructions.

### Test things locally

First, do:

```
npm i
npm run storybook
```

Now, create a `.env` file in your root directory with the following content, where `HASHED_PASSWORD` and `API_ENDPOINT` are replaced by actual values.

```
VITE_TOKEN="HASHED_PASSWORD?"
VITE_API_ENDPOINT="API_ENDPOINT"
```

To quickly see what the different form of our agents look like, run `npm run storybook`.

Now open `http://localhost:6006/` in your browser (if it doesn't open automatically).

You will get several options in the left sidebar. Pick and and play around. Corresponding code for all those pages is inside `test/` folder.

### Publishing to npm

First, create a build with `npm run build`. This will automatically create a `dist` folder.
Then, run `npm run publish`

### Viewing docs

Run `npm run storybook` to see detailed documentation.
