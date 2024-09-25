import { test, expect } from "@playwright/test";
import {
  selectApiKeyName,
  setSqlOnly,
  askQuestionUsingSearchBar,
  fullyTestSQLOnlyQuestionForNonTempDb,
  clickFollowOnQuestion,
} from "../utils";

test("can select api key name", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await selectApiKeyName(page);
});

test("can ask one sql-only question, then follow-on question", async ({
  page,
}) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

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

test("can ask one advanced question with send email usage", async ({
  page,
}) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await selectApiKeyName(page);

  await setSqlOnly(page, false);

  await askQuestionUsingSearchBar(
    page,
    "show me 5 rows and send an email to manas@defog.ai"
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

  // wait for 10 seconds for both steps to complete and done to become true
  while (!done && performance.now() - startTime < 10000) {
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
