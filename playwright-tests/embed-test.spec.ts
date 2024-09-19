import { test, expect } from "@playwright/test";
import type { Page } from "playwright";

/**
 * Selects the first api key name in the dropdown. Errors if no api key names are found.
 *
 * @example
 * await selectApiKeyName(page);
 */
async function selectApiKeyName(page: Page) {
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
async function setSqlOnly(page: Page, sqlOnly: boolean = true) {
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
 * Asks a question using the search bar.
 *
 * @example
 * await askQuestionUsingSearchBar(page);
 *
 * await askQuestionUsingSearchBar(page, "show me my sales data");
 *
 */
async function askQuestionUsingSearchBar(
  page: Page,
  question: string = "show me 5 rows from the business table"
) {
  await page.getByPlaceholder("Type your question here").click();
  await page.getByPlaceholder("Type your question here").fill(question);

  await page.getByRole("button", { name: "Ask" }).click();
}

test("can select api key name", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await selectApiKeyName(page);
});

test("can ask one sql-only question", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await selectApiKeyName(page);

  await setSqlOnly(page, true);

  await askQuestionUsingSearchBar(page);

  const requestPromise = page.waitForRequest((request) =>
    request.url().includes("/generate_step")
  );

  // start waiting for to the network response for `/generate_step`
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/generate_step")
  );

  // wait 3 seconds for the clarifier button to appear, then move on
  await page.waitForTimeout(3000);

  // click the clarify submit button
  const buttonClarify = page.getByRole("button", {
    name: "Click here or press enter to",
  });

  if ((await buttonClarify.count()) > 0) {
    await buttonClarify.click();
  }

  // now wait for the response
  const request = await requestPromise;
  const response = await responsePromise;

  expect(response.ok()).toBe(true);

  const resData = await response.json();

  // ensure that the correct sql_only was sent to the server
  expect(request.postDataJSON().sql_only).toBe(true);

  // make sure we see the sql/code tab
  // TODO: is there a better way to test this?
  await expect(page.getByText("SQL/Code")).toBeVisible();

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();
});

test("can ask one advanced question", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await selectApiKeyName(page);

  await setSqlOnly(page, false);

  await askQuestionUsingSearchBar(page);

  const requestPromise = page.waitForRequest((request) =>
    request.url().includes("/generate_step")
  );

  // start waiting for to the network response for `/generate_step`
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/generate_step")
  );

  // wait 3 seconds for the clarifier button to appear, then move on
  await page.waitForTimeout(3000);

  // click the clarify submit button
  const buttonClarify = page.getByRole("button", {
    name: "Click here or press enter to",
  });

  if ((await buttonClarify.count()) > 0) {
    await buttonClarify.click();
  }

  // now wait for the response
  const request = await requestPromise;
  const response = await responsePromise;

  expect(response.ok()).toBe(true);

  // ensure that the correct sql_only was sent to the server
  expect(request.postDataJSON().sql_only).toBe(false);

  // make sure we see the sql/code tab
  // TODO: is there a better way to test this?
  expect(await page.getByText("SQL/Code")).toBeVisible();

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();
});
