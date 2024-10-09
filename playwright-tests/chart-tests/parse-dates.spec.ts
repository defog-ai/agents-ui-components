/// <reference lib="dom"/>

import { test, expect } from "@playwright/test";
import { openAsBlob, readFileSync } from "fs";
import { resolve } from "path";
import {
  clickFollowOnQuestion,
  fullyTestSQLOnlyQuestionForTempDb,
  setSqlOnly,
  uploadFileOnNullTab,
  FILE_TYPES,
} from "../utils";

const dateFormatFiles = {
  "yyyy-mm-dd": "cash_flows.csv",
  "m/d/yy": "catalog.csv",
};
const dirname = process.cwd();

test("yyyy-mm-dd", async ({ page }) => {
  const csvFileName = dateFormatFiles["yyyy-mm-dd"];
  const tableName = csvFileName.split(".")[0];

  await page.goto("http://localhost:5173/test/agent-embed/");

  const csvBuffer = readFileSync(
    resolve(import.meta.dirname, `../assets/${csvFileName}`)
  ).toJSON().data;

  await uploadFileOnNullTab(page, csvBuffer, csvFileName, FILE_TYPES.CSV);

  // expect a toast message:
  // "Table coffee exports parsed, now generating descriptions for columns!"
  expect(
    await page.getByText(
      `Table ${tableName} parsed, now generating descriptions for columns!`
    )
  ).toBeVisible();

  // now wait for the exact matching "coffee exports" button to show up
  // and click it when it does
  await page
    .getByTestId("db-tab")
    .getByText(tableName, { exact: true })
    .click({ timeout: 20000 });

  await fullyTestSQLOnlyQuestionForTempDb({
    page,
    question: "show me cash inflows and outflows by month",
  });

  // wait for the edit_chart request
  const editChartRequestPromise = page.waitForRequest((request) =>
    request.url().includes("/edit_chart")
  );

  // make sure the "Chart" tab is visible and click it
  await page.getByRole("tab").getByText("Chart").click();

  // wait for editChart request to complete and give a response before we click bar chart
  const editChartResponse = await page.waitForResponse(
    (response) => response.url().includes("/edit_chart"),
    { timeout: 10000 }
  );

  // get the bar chart button
  await page.getByText("Bar").click();

  // variable is for both horizontal and vertical axes.
  // select the second one
  await page.getByText("Variable").nth(1).click();

  // click the ant-select-item that fuzzy matches "inflow" and "outflow"
  // (SQLite might change the column names so have to do a non exact match here)
});
