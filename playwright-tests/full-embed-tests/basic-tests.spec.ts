import { test, expect } from "@playwright/test";
import {
  selectApiKeyName,
  setSqlOnly,
  askQuestionUsingSearchBar,
  fullyTestSQLOnlyQuestionForNonTempDb,
  clickFollowOnQuestion,
  visitPage,
} from "../utils";

const testEmail = process.env.VITE_TEST_EMAIL_ID;

test("can select api key name", async ({ page }) => {
  await visitPage(page, {
    url: "http://localhost:5173/test/agent-embed/",
    waitForRequest: "/get_api_key_names",
  });

  await selectApiKeyName(page);
});

test("can ask one sql-only question, then follow-on question", async ({
  page,
}) => {
  await visitPage(page, {
    url: "http://localhost:5173/test/agent-embed/",
    waitForRequest: "/get_api_key_names",
  });

  await selectApiKeyName(page);

  await setSqlOnly(page, true);

  await fullyTestSQLOnlyQuestionForNonTempDb({ page });

  const selectedFollowOnQuestion = await clickFollowOnQuestion(page);

  // now ask the above question using the search bar
  await fullyTestSQLOnlyQuestionForNonTempDb({
    page,
    question: selectedFollowOnQuestion,
    questionCountToExpectAfterAsking: 2,
  });
});

test("check history management. can store history in local storage, and can clear it. sql-only. asks follow-on question", async ({
  page,
}) => {
  await visitPage(page, {
    url: "http://localhost:5173/test/agent-embed/",
    waitForRequest: "/get_api_key_names",
  });

  await selectApiKeyName(page);

  await setSqlOnly(page, true);

  const { question } = await fullyTestSQLOnlyQuestionForNonTempDb({ page });

  const selectedFollowOnQuestion = await clickFollowOnQuestion(page);

  // now ask the above question using the search bar
  await fullyTestSQLOnlyQuestionForNonTempDb({
    page,
    question: selectedFollowOnQuestion,
    questionCountToExpectAfterAsking: 2,
  });

  // now refresh the page
  // and re select api key
  // and look for side bar

  await page.reload();

  await page.waitForResponse(
    (response) => response.url().includes("/get_api_key_names"),
    { timeout: 10000 }
  );

  await selectApiKeyName(page);

  // find items inside .sidebar which match the question and selectedFollowOnQuestion
  // and expect them to be visible
  const sidebar = await page.locator(".sidebar");
  expect(await sidebar.getByText(question)).toBeVisible();
  expect(await sidebar.getByText(selectedFollowOnQuestion)).toBeVisible();

  // count of .history-items to be 2
  expect(
    await sidebar.locator(".history-item:not(.dummy-analysis)").count()
  ).toBe(2);

  // find the clear button
  await page.getByTitle("Clear history").click();

  // expect history to have disappeared
  // count of .history-items to be 0
  expect(
    await sidebar.locator(".history-item:not(.dummy-analysis)").count()
  ).toBe(0);

  // page refresh to ensure that local storage was also deleted
  await page.reload();

  await selectApiKeyName(page);

  // expect history to have disappeared
  // count of .history-items to be 0
  expect(
    await sidebar.locator(".history-item:not(.dummy-analysis)").count()
  ).toBe(0);
});

test("can ask one advanced question with send email usage", async ({
  page,
}) => {
  return true;
  await visitPage(page, {
    url: "http://localhost:5173/test/agent-embed/",
    waitForRequest: "/get_api_key_names",
  });

  await selectApiKeyName(page);

  await setSqlOnly(page, false);

  await askQuestionUsingSearchBar(
    page,
    `show me 5 rows and send an email to ${testEmail}`
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

  let done = false;
  let totalSteps = 0;

  page.on("request", (request) => {
    if (request.url().includes("/generate_step")) {
      // ensure that the correct sql_only was sent to the server
      expect(request.postDataJSON().sql_only).toBe(false);
    }
  });

  page.on("response", async (response) => {
    if (response.url().includes("/generate_step")) {
      const resData = await response.json();
      totalSteps++;
      if (resData.done) {
        done = true;
      }
    }
  });

  // wait for done to become true
  const startTime = performance.now();

  // wait for 20 seconds for both steps to complete and done to become true
  while (!done && performance.now() - startTime < 20000) {
    await page.waitForTimeout(1000);
  }

  // once out of the while loop,
  // expect done to be true
  // and expect steps to be 2
  expect(totalSteps).toBe(2);
  expect(done).toBe(true);

  // make sure we see the sql/code tab
  expect(await page.getByText("SQL/Code")).toBeVisible();

  // click on the analysis tab
  await page.locator("nav.divide-x div").nth(2).click();

  // make sure that we see an element with a `divide-y` class
  expect(await page.locator("table.divide-y").first()).toBeVisible();
});
