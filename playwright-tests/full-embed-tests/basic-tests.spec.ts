import { test, expect } from "@playwright/test";
import {
  selectApiKeyName,
  setSqlOnly,
  askQuestionUsingSearchBar,
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

  await askQuestionUsingSearchBar(page);

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

  // click on the first button with the class `follow-on-question`
  await page.getByTestId("follow-on-question").first().click();

  const selectedQuestionValue =
    (await page.getByTestId("follow-on-question").first().textContent()) || "";

  // expect the text in the search bar (id `main-searchbar`) to be the same as the button selected
  expect(page.getByTestId("main-searchbar")).toHaveValue(selectedQuestionValue);

  // click the ask button
  await page.getByRole("button", { name: "Ask" }).click();

  // ensure that we can skip the clarifier, if clarifier exists
  await expect(fetchingDataLocator.or(buttonClarifyLocator)).toBeVisible();

  if ((await buttonClarifyLocator.count()) > 0) {
    await buttonClarifyLocator.click();
  }

  // check that the request sent to the server has the correct user_question value
  const requestPromiseGenerate2 = page.waitForRequest((request) =>
    request.url().includes("/generate_step")
  );

  // check that the response from the server is successful
  const responsePromiseGenerate2 = page.waitForResponse((response) =>
    response.url().includes("/generate_step")
  );

  const requestGenerate2 = await requestPromiseGenerate2;
  const responseGenerate2 = await responsePromiseGenerate2;

  expect(requestGenerate2.postDataJSON().user_question).toBe(
    selectedQuestionValue
  );

  // ensure that previous_questions is not empty, and has a length of more than 0
  expect(
    requestGenerate2.postDataJSON().previous_questions.length
  ).toBeGreaterThan(0);

  expect(responseGenerate.ok()).toBe(true);

  const resGenerateData2 = await responseGenerate2.json();
  // ensure that the backend responded with a success
  expect(resGenerateData2.success).toBe(true);
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
