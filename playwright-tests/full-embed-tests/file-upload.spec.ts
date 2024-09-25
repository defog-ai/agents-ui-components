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

  await uploadFileOnNullTab(page, csvBuffer, csvFileName, FILE_TYPES.CSV);

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
    .getByTestId("db-tab")
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

  await fullyTestSQLOnlyQuestionForTempDb({
    page,
    question: "show me total exports by country by year",
  });

  const followOnQuestion = await clickFollowOnQuestion(page);

  await fullyTestSQLOnlyQuestionForTempDb({
    page,
    question: followOnQuestion,
    questionCountToExpectAfterAsking: 2,
  });
});

test("can upload excel", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await uploadFileOnNullTab(page, excelBuffer, excelFileName, FILE_TYPES.EXCEL);

  // expect three toast messages:
  // "Table location parsed, now generating descriptions for columns!"
  // "Table geographic parsed, now generating descriptions for columns!"
  // "Table restaurant parsed, now generating descriptions for columns!"
  expect(
    await page.getByText(
      "Table location parsed, now generating descriptions for columns!"
    )
  ).toBeVisible({ timeout: 20000 });

  expect(
    await page.getByText(
      "Table geographic parsed, now generating descriptions for columns!"
    )
  ).toBeVisible({ timeout: 20000 });

  expect(
    await page.getByText(
      "Table restaurant parsed, now generating descriptions for columns!"
    )
  ).toBeVisible({ timeout: 20000 });

  // now wait for the exact matching "restaurants" button to show up
  // and click it when it does
  await page
    .getByTestId("db-tab")
    .getByText("restaurants", { exact: true })
    .click({ timeout: 20000 });

  // click view data structure tab
  // clik on the "Filter Tables" placeholder

  // And expect to see three options:
  // csv_location, csv_geographic, csv_restaurant
  await page.getByText("View data structure").click();
  await page.getByPlaceholder("Filter tables").click();

  await expect(
    page.getByRole("option").getByText("csv_location")
  ).toBeVisible();
  await expect(
    page.getByRole("option").getByText("csv_geographic")
  ).toBeVisible();
  await expect(
    page.getByRole("option").getByText("csv_restaurant")
  ).toBeVisible();

  // close the dropdown by clicking elsewhere
  await (
    await page.waitForSelector("body")
  ).click({ position: { x: 0, y: 0 } });

  // click on "Preview data" tab
  // expect to see "Select table" label
  await page.getByRole("tab").getByText("Preview data").click();
  await page.getByPlaceholder("Select table").click();

  await expect(
    page.getByRole("option").getByText("csv_location")
  ).toBeVisible();
  await expect(
    page.getByRole("option").getByText("csv_geographic")
  ).toBeVisible();
  await expect(
    page.getByRole("option").getByText("csv_restaurant")
  ).toBeVisible();

  // close the dropdown by clicking elsewhere
  await (
    await page.waitForSelector("body")
  ).click({ position: { x: 0, y: 0 } });

  // now to go analysis tab
  await page.getByRole("tab").getByText("Analysis").click();

  await fullyTestSQLOnlyQuestionForTempDb({
    page,
    question: "show me ratings by county",
  });
});
