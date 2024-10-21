import { test, expect } from "@playwright/test";
import {
  selectApiKeyName,
  setSqlOnly,
  askQuestionUsingSearchBar,
  fullyTestSQLOnlyQuestionForNonTempDb,
  fullyTestSQLOnlyQuestionForTempDb,
  clickFollowOnQuestion,
  uploadFileOnNullTab,
  FILE_TYPES,
  visitPage,
} from "../utils";
import { readFileSync } from "fs";
import { resolve } from "path";

test.describe("Observable Charts", () => {
  test("should change date format", async ({ page }) => {
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
        .locator(".ant-select-selection-item", { hasText: "inflow" })
        .count()) > 0;

    if (!isSelected) {
      await page.locator(".ant-select-item", { hasText: "inflow" }).click();
    }

    isSelected =
      (await page
        .locator(".ant-select-selection-item", { hasText: "outflow" })
        .count()) > 0;

    if (!isSelected) {
      await page.locator(".ant-select-item", { hasText: "outflow" }).click();
    }

    // make sure they're selected
    expect(
      await page.locator(".ant-select-selection-item", {
        hasText: "inflow",
      })
    ).toHaveCount(1);

    expect(
      await page.locator(".ant-select-selection-item", {
        hasText: "outflow",
      })
    ).toHaveCount(1);

    await page.waitForTimeout(5000);

    // now we shuold expect both inflow and outflow to be selected

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

    expect(
      expectedTicks.every((tick) => ticksOnScreen.indexOf(tick) >= 0)
    ).toBe(true);

    expect(
      expectedTicks.every((tick) => ticksOnScreen.indexOf(tick) >= 0)
    ).toBe(true);

    await page.locator("#rc-tabs-1-tab-2").getByRole("img").click();

    await page.getByPlaceholder("Select or enter format").click();
    await page.getByText("YYYY-MM-DD").click();

    // Check the new date format on the chart
    const newExpectedTicks = [
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

    const newTicksOnScreen = await page
      .getByLabel("x-axis tick label")
      .locator("text")
      .allTextContents();

    expect(
      newExpectedTicks.every((tick) => newTicksOnScreen.indexOf(tick) >= 0)
    ).toBe(true);
  });

  test.beforeEach(async ({ page }) => {
    await visitPage(page, {
      url: "http://localhost:5173/test/agent-embed/",
      waitForRequest: "/get_api_key_names",
    });
    await selectApiKeyName(page);
    await askQuestionUsingSearchBar(
      page,
      "show me 10 rows with first 3 columns from the data"
    );
    await page.getByText("Chart").click();
  });

  test("should render default chart", async ({ page }) => {
    await expect(
      page.locator("svg").filter({ hasText: " --plot" })
    ).toBeVisible();
  });

  test("should change chart type", async ({ page }) => {
    // Test changing chart type
    await page.getByText("Line").click();
    await expect(
      page.locator("svg").filter({ hasText: " --plot" })
    ).toBeVisible();

    await page.getByText("Bar").click();
    await expect(
      page.locator("svg").filter({ hasText: " --plot" })
    ).toBeVisible();
  });

  test("should select axes", async ({ page }) => {
    await page.getByLabel("close-circle").locator("svg").click();

    // Click the dropdown to open it
    await page.locator("#rc_select_0").click();

    await page.waitForSelector(".ant-select-item-option", {
      state: "visible",
      timeout: 5000,
    });

    // Get all the visible options
    const options = await page.locator(".ant-select-item-option").all();
    // Choose a random option
    const randomIndex = Math.floor(Math.random() * options.length);
    await options[randomIndex].click();

    // Wait for the chart to update
    await page.waitForTimeout(1000);

    await expect(
      page.locator("svg").filter({ hasText: " --plot" })
    ).toBeVisible();
  });

  test("should handle faulty data and empty axis", async ({ page }) => {
    // Upload a CSV file with garbage data
    const csvFileName = "garbage_data.csv";
    const tableName = csvFileName.split(".")[0];

    await page.goto("http://localhost:5173/test/agent-embed/");

    const csvBuffer = readFileSync(
      resolve(import.meta.dirname, `../assets/${csvFileName}`)
    ).toJSON().data;

    await uploadFileOnNullTab(page, csvBuffer, csvFileName, FILE_TYPES.CSV);

    // Wait for the table to be parsed
    await expect(
      page.getByText(
        `Table ${tableName} parsed, now generating descriptions for columns!`
      )
    ).toBeVisible();

    // Select the table
    await page
      .getByTestId("db-tab")
      .getByText(tableName, { exact: true })
      .click({ timeout: 20000 });

    await page
      .getByRole("button", { name: "Show me any 5 rows from the" })
      .click();
    await page.getByRole("tab", { name: "Chart" }).click();
    await expect(page.getByLabel("fx-axis tick label")).toContainText(
      "invalid_date"
    );
    await page.getByLabel("close-circle").locator("svg").click();
    await expect(page.getByLabel("Chart")).toContainText(
      "Please select X and Y axes to display the chart."
    );
  });
});
