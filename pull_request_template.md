**Checklist:**

- **Breaking changes:** Do you have any breaking changes?
- **Regression:** Are there any regressions?

--

### PUT YOUR PR DETAILS HERE

--

<details>
  <summary>Instructions for reviewers</summary>

**For testing components:**

- Run `pnpm run dev` in your terminal
- Open `http://localhost:5173` in your browser, and select one of the components to see it in action.

Corresponding code for all those pages is inside `test/` folder.

Docs can be accessed via `pnpm run storybook` and visiting `http://localhost:6006`.

NOTE: Make sure to change the email to yours if testing the advanced mode. Look in basic-tests.spec.ts and replace manas@defog.ai with your email.

To run all tests in a backround browser: npx playwright test

To manually run tests: npx playwright test --ui

How to test with your own csv/excel files:

Paste the files into the playwright-tests/assets folders, and change the two variables: csvFileName and excelFileName inside playwright-tests/full-embed-tests/file-upload.spec.ts.
