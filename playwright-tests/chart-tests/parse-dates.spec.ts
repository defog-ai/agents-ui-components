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

const dirname = process.cwd();

test("yyyy-mm-dd - cash-flows", async ({ page }) => {
  const csvFileName = "cash_flows.csv";
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

  await page.locator(".y-axis-selector").click();

  // click the ant-select-item that fuzzy matches "inflow" and "outflow"
  // (SQLite might change the column names so have to do a non exact match here)
  // but only if they're not selected already
  let isSelected =
    (await page
      .locator(".ant-select-selection-item", { hasText: "cash_inflow" })
      .count()) > 0;

  if (!isSelected) {
    await page.locator(".ant-select-item", { hasText: "cash_inflow" }).click();
  }

  isSelected =
    (await page
      .locator(".ant-select-selection-item", { hasText: "cash_outflow" })
      .count()) > 0;

  if (!isSelected) {
    await page.locator(".ant-select-item", { hasText: "cash_outflow" }).click();
  }

  // make sure they're selected
  expect(
    await page.locator(".ant-select-selection-item", { hasText: "cash_inflow" })
  ).toHaveCount(1);

  expect(
    await page.locator(".ant-select-selection-item", {
      hasText: "cash_outflow",
    })
  ).toHaveCount(1);

  await page.waitForTimeout(5000);

  // now we shuold expect both cash_inflow and cash_outflow to be selected

  // now we can check the actual chart
  // look for all the fx-axis (we facet in a bar chart) ticks to contain the following entries:
  const expectedTicks = [
    "2023-10-31",
    "2023-11-30",
    "2023-12-31",
    "2024-01-31",
    "2024-02-29",
    "2024-03-31",
    "2024-04-30",
    "2024-05-31",
    "2024-06-30",
    "2024-07-31",
    "2024-08-31",
    "2024-09-30",
  ];

  const ticksOnScreen = await page
    .getByLabel("fx-axis tick label")
    .locator("text")
    .allTextContents();

  expect(expectedTicks.every((tick) => ticksOnScreen.indexOf(tick) >= 0)).toBe(
    true
  );
});
