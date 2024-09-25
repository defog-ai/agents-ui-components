/// <reference lib="dom"/>

import { test, expect } from "@playwright/test";
import { openAsBlob, readFileSync } from "fs";
import { resolve } from "path";
import {
  askQuestionUsingSearchBar,
  setSqlOnly,
  uploadFileOnNullTab,
} from "../utils";

const excelFileName = "restaurants.xlsx";
const csvFileName = "coffee exports.csv";
const dirname = process.cwd();

const excelBuffer = readFileSync(
  resolve(import.meta.dirname, `../assets/${excelFileName}`)
).toJSON().data;

const csvBuffer = readFileSync(
  resolve(import.meta.dirname, `../assets/${csvFileName}`)
).toJSON().data;

test("can upload csvs", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await uploadFileOnNullTab(page, csvBuffer, csvFileName);

  // expect a toast message:
  // "Table coffee exports parsed, now generating descriptions for columns!"
  expect(
    await page.getByText(
      "Table coffee exports parsed, now generating descriptions for columns!"
    )
  ).toBeVisible();

  // now wait for the exact matching "coffee exports" button to show up
  // and click it when it does
  await page
    .getByTestId("db-selection")
    .getByText("coffee exports", { exact: true })
    .click({ timeout: 20000 });

  // check the "view data structure" and "preview data" tabs to make sure they have something
  // in view data strucure, we will look for the "filter tables" placeholder in the dropdown
  // in preview data, we will look for "select table" label for the single select

  await page.getByText("View data structure").click();
  await expect(page.getByPlaceholder("Filter tables")).toBeVisible();

  await page.getByRole("tab").getByText("Preview data").click();
  await expect(page.getByText("Select table")).toBeVisible();

  // go back to the analysis tab, by clicking the tab
  await page.getByRole("tab").getByText("Analysis").click();

  // now the usual
  // note that we don't need to do the sqlOnly stuff because we don't even show the toggle for csvs/excel files
  await askQuestionUsingSearchBar(
    page,
    "show me total exports by country by year"
  );

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
