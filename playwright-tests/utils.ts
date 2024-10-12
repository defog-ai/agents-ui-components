import { test, expect } from "@playwright/test";
import type { Page } from "playwright";

export const FILE_TYPES = {
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  OLD_EXCEL: "application/vnd.ms-excel",
  CSV: "text/csv",
};

/**
 * Selects the first api key name in the dropdown. Errors if no api key names are found.
 *
 * @example
 * await selectApiKeyName(page);
 */
export async function selectApiKeyName(page: Page) {
  // either we see the dropdown, or we have a selector with data-db-selected-db=true
  const selectedDb = page.locator("[data-selected-db=true]");
  const dropdown = page.getByPlaceholder("Select an option");
  const tab = page.getByTestId("db-tab");

  await dropdown.or(selectedDb).first().click();

  // get number of keys by getting count of tabs
  const keyCount = await tab.count();

  expect(keyCount).toBeGreaterThan(0);

  // if there is no selected db, select the first one
  if ((await selectedDb.count()) === 0) {
    // select the first key
    // somehow .click() doesn't work here. dispatchEvent does.
    // relevant github issue:
    // https://github.com/microsoft/playwright/issues/13576
    await tab.first().dispatchEvent("click");
  }

  expect(await page.getByText("Quickstart")).toBeVisible({ timeout: 2000 });

  await page.waitForTimeout(1000);
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
  const searchBar = page
    .getByPlaceholder("Type your question here")
    // for follow on questions, the search bar has a different placeholder
    .or(page.getByPlaceholder("Type your next question here"));

  await searchBar.click();
  await searchBar.fill(question);

  await page.getByRole("button", { name: "Ask" }).click();

  // ensure that the search bar has been emptied after the click
  expect(await searchBar.inputValue()).toBeFalsy();
}

/**
 * NOTE: MEANT FOR SQL ONLY MODE IN NON-TEMP (AKA NOT UPLOADED FILES). DOES NOT CHECK STEP COUNTS.
 *
 * Asks a sql only question using the search bar, and checks that the response is successful.
 *
 * Then also monitors the follow on question generation.
 *
 * @returns object with the question asked, and follow on questions
 *
 * @example
 * await fullyTestSQLOnlyQuestionForNonTempDb(page);
 *
 * await fullyTestSQLOnlyQuestionForNonTempDb(page, "show me my sales data");
 */
export async function fullyTestSQLOnlyQuestionForNonTempDb({
  page,
  question = "show me 5 rows from the business table",
  questionCountToExpectAfterAsking = 1,
}: {
  /** the playwright page object */
  page: Page;
  /** the question to ask */
  question?: string;
  /** the number of questions to expect after we have asked this question */
  questionCountToExpectAfterAsking?: number;
}): Promise<{
  question: string;
  followOnQuestions: string[];
}> {
  const requestPromiseGenerate = page.waitForRequest((request) =>
    request.url().includes("/generate_step")
  );

  // start waiting for to the network response for `/generate_step`
  const responsePromiseGenerate = page.waitForResponse(
    (response) => response.url().includes("/generate_step"),
    { timeout: 10000 }
  );

  await askQuestionUsingSearchBar(page, question);

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
  const questionCountsOnPage = await page.getByText("SQL/Code").count();
  await expect(questionCountsOnPage).toBe(questionCountToExpectAfterAsking);

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();

  // monitor responses sent to the /generate_follow_on_questions endpoint
  const responsePromiseFollowOn = page.waitForResponse(
    (response) => response.url().includes("/generate_follow_on_questions"),
    { timeout: 10000 }
  );

  const responseFollowOn = await responsePromiseFollowOn;

  expect(responseFollowOn.ok()).toBe(true);

  const resFollowOnData = await responseFollowOn.json();

  // ensure that the backend responded with a success, and that a non-empty list of follow-on questions was returned
  expect(resFollowOnData.success).toBe(true);
  expect(resFollowOnData.follow_on_questions.length).toBeGreaterThan(0);

  return {
    question: question,
    followOnQuestions: resFollowOnData.follow_on_questions,
  };
}

/**
 * NOTE: MEANT FOR SQL ONLY MODE IN TEMP (AKA ONLY UPLOADED FILES). DOES NOT CHECK STEP COUNTS.
 *
 * Asks a sql only question using the search bar, checks generating query for the temp db is successful.
 *
 * Then checks if running that query was successful.
 *
 * Then also monitors the follow on question generation.
 *
 * @example
 * await fullyTestSQLOnlyQuestionForTempDb(page);
 *
 * await fullyTestSQLOnlyQuestionForTempDb(page, "show me my sales data");
 */
export async function fullyTestSQLOnlyQuestionForTempDb({
  page,
  question = "show me 5 rows from the business table",
  questionCountToExpectAfterAsking = 1,
}: {
  /** the playwright page object */
  page: Page;
  /** the question to ask */
  question?: string;
  /** the number of questions to expect after we have asked this question */
  questionCountToExpectAfterAsking?: number;
}) {
  // start waiting for to the network response for `/generate_query_csv`
  const responsePromiseGenerateCsvQuery = page.waitForResponse(
    (response) => response.url().includes("/generate_query_csv"),
    { timeout: 10000 }
  );

  const requestPromiseGenerateCsvQuery = page.waitForRequest((request) =>
    request.url().includes("/generate_query_csv")
  );
  await askQuestionUsingSearchBar(page, question);

  // we will either get a clarifier that says "Click here or press enter to"
  // or we will bypass the clarifier, and have a thing that says "fetching data"
  const fetchingDataLocator = page.getByText("Fetching data");

  // now wait for the response
  const requestGenerate = await requestPromiseGenerateCsvQuery;
  const responseGenerate = await responsePromiseGenerateCsvQuery;

  expect(responseGenerate.ok()).toBe(true);

  const resGenerateCsvQuery = await responseGenerate.json();

  // ensure that the correct sql_only was sent to the server
  // i.e., sql_only should be true in the payload sent to /generate_step
  expect(requestGenerate.postDataJSON().question).toBe(question);

  // ensure that the backend responded with a success
  expect(resGenerateCsvQuery.ran_successfully).toBe(true);
  expect(resGenerateCsvQuery.error).toBe(null);

  // make sure we see the sql/code tab
  // TODO: is there a better way to test this?
  const questionCountsOnPage = await page.getByText("SQL/Code").count();
  await expect(questionCountsOnPage).toBe(questionCountToExpectAfterAsking);

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();

  // monitor responses sent to the /generate_follow_on_questions endpoint
  const responsePromiseFollowOn = page.waitForResponse(
    (response) => response.url().includes("/generate_follow_on_questions"),
    { timeout: 10000 }
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
  fileName: string,
  fileType: string
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
      localFileType: fileType,
    }
  );

  // Now dispatch
  await page.dispatchEvent("div[data-testid='file-drop']", "drop", {
    dataTransfer,
  });
}

/**
 * Navigates to a specified URL and optionally waits for a specific request to complete.
 * After navigation, it selects an API key name.
 *
 * @param page - Playwright Page object
 * @param options - Configuration options for the page visit
 * @param options.url - The URL to navigate to (default: "http://localhost:5173/test/agent-embed/")
 * @param options.waitForRequest - The request to wait for (default: "/get_api_key_names")
 * @param options.timeout - Timeout in milliseconds for waiting for the response (default: 10000)
 * @returns Promise<void>
 * @throws Will throw an error if navigation fails or if the response wait times out
 */
export async function visitPage(
  page: Page,
  options: {
    url?: string;
    waitForRequest?: string | null;
    timeout?: number;
  } = {}
): Promise<void> {
  const {
    url = "http://localhost:5173/test/agent-embed/",
    waitForRequest = "/get_api_key_names",
    timeout = 10000,
  } = options;

  await page.goto(url);

  if (waitForRequest !== null) {
    await page.waitForResponse(
      (response) => response.url().includes(waitForRequest),
      { timeout }
    );
  }

  await selectApiKeyName(page);
}
