import { test, expect } from "@playwright/test";
import type { Page } from "playwright";

/**
 * Selects the first api key name in the dropdown. Errors if no api key names are found.
 *
 * @example
 * await selectApiKeyName(page);
 */
export async function selectApiKeyName(page: Page) {
  await page.getByPlaceholder("Select an option").first().click();

  const numKeys = await page.getByRole("option").count();

  expect(numKeys).toBeGreaterThan(0);

  // select the first one
  await page.getByRole("option").first().click();

  expect(await page.getByText("Quickstart")).toBeVisible();
}

/**
 * Sets the sql-only toggle to the target state.
 * Errors if the toggle cannot be set to the target state after 2 click attempts.
 *
 * @example
 * await setSqlOnly(page, true);
 */
export async function setSqlOnly(page: Page, sqlOnly: boolean = true) {
  let done = false;
  // ideally we should be able to get to any state in <= 2 clicks
  let attempts = 0;

  while (!done && attempts <= 2) {
    // if sqlOnly boolean is true, then the button's aria-checked should be false
    // if sqlOnly boolean is false, then the button's aria-checked should be true
    const isChecked =
      (await page.getByLabel("Advanced").getAttribute("aria-checked")) ===
      "true";

    if ((sqlOnly && !isChecked) || (!sqlOnly && isChecked)) {
      done = true;
      break;
    }

    await page.getByLabel("Advanced").click();

    attempts++;

    if (attempts >= 2) {
      // ideally we should be able to get to any state in <= 2 clicks
      throw new Error(
        `Could not set toggle to target state. Check if the button is visible and clickable. Target state was sqlOnly = ${sqlOnly} so the toggle's target checked state was ${!sqlOnly}`
      );
    }
  }
}

/**
 * Simply puts in a question in the search bar and clicks the ask button.
 */
export async function askQuestionUsingSearchBar(
  page: Page,
  question: string = "show me 5 rows from the business table"
) {
  await page.getByPlaceholder("Type your question here").click();
  await page.getByPlaceholder("Type your question here").fill(question);

  await page.getByRole("button", { name: "Ask" }).click();
}

/**
 * NOTE: MEANT FOR SQL ONLY MODE. DOES NOT CHECK STEP COUNTS.
 *
 * Asks a sql only question using the search bar, and checks that the response is successful.
 *
 * Then also monitors the follow on question generation.
 *
 * @example
 * await testSQLQuestionFull(page);
 *
 * await testSQLQuestionFull(page, "show me my sales data");
 *
 */
export async function fullyTestSQLOnlyQuestion(
  page: Page,
  question: string = "show me 5 rows from the business table"
) {
  await askQuestionUsingSearchBar(page, question);

  const requestPromiseGenerate = page.waitForRequest((request) =>
    request.url().includes("/generate_step")
  );

  // start waiting for to the network response for `/generate_step`
  const responsePromiseGenerate = page.waitForResponse((response) =>
    response.url().includes("/generate_step")
  );

  // we will either get a clarifier that says "Click here or press enter to"
  // or we will bypass the clarifier, and have a thing that says "fetching data"
  const fetchingDataLocator = page.getByText("Fetching data");

  // click the clarify submit button
  const buttonClarifyLocator = page.getByRole("button", {
    name: "Click here or press enter to",
  });

  await expect(fetchingDataLocator.or(buttonClarifyLocator)).toBeVisible();

  if ((await buttonClarifyLocator.count()) > 0) {
    await buttonClarifyLocator.click();
  }

  // now wait for the response
  const requestGenerate = await requestPromiseGenerate;
  const responseGenerate = await responsePromiseGenerate;

  expect(responseGenerate.ok()).toBe(true);

  const resGenerateData = await responseGenerate.json();

  // ensure that the correct sql_only was sent to the server
  // i.e., sql_only should be true in the payload sent to /generate_step
  expect(requestGenerate.postDataJSON().sql_only).toBe(true);

  // ensure that the backend responded with a success
  expect(resGenerateData.success).toBe(true);

  // make sure we see the sql/code tab
  // TODO: is there a better way to test this?
  await expect(page.getByText("SQL/Code")).toBeVisible();

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();

  // monitor responses sent to the /generate_follow_on_questions endpoint
  const responsePromiseFollowOn = page.waitForResponse((response) =>
    response.url().includes("/generate_follow_on_questions")
  );

  const responseFollowOn = await responsePromiseFollowOn;

  expect(responseFollowOn.ok()).toBe(true);

  const resFollowOnData = await responseFollowOn.json();

  // ensure that the backend responded with a success, and that a non-empty list of follow-on questions was returned
  expect(resFollowOnData.success).toBe(true);
  expect(resFollowOnData.follow_on_questions.length).toBeGreaterThan(0);
}

export async function clickFollowOnQuestion(page: Page) {
  // click on the first button with the class `follow-on-question`
  await page.getByTestId("follow-on-question").first().click();

  const selectedQuestionValue =
    (await page.getByTestId("follow-on-question").first().textContent()) || "";

  // expect the text in the search bar (id `main-searchbar`) to be the same as the button selected
  expect(page.getByTestId("main-searchbar")).toHaveValue(selectedQuestionValue);

  return selectedQuestionValue;
}

/**
 * Uploads a file to the page using the file input element on the null-state/blank tab.
 *
 */
export async function uploadFileOnNullTab(
  page: Page,
  fileBuffer: Buffer,
  fileName: string
) {
  const dataTransfer = await page.evaluateHandle(
    async ({ fileBuffer, localFileName, localFileType }) => {
      const dt = new DataTransfer();

      const file = new File([new Uint8Array(fileBuffer)], localFileName, {
        type: localFileType,
      });

      dt.items.add(file);
      return dt;
    },
    {
      fileBuffer: fileBuffer,
      localFileName: fileName,
      localFileType: "text/csv",
    }
  );

  // Now dispatch
  await page.dispatchEvent("div[data-testid='file-drop']", "drop", {
    dataTransfer,
  });
}
