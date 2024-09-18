import { test, expect } from "@playwright/test";

test("has api key names", async ({ page }) => {
  await page.goto("http://localhost:5173/test/agent-embed/");

  await page.getByPlaceholder("Select an option").nth(0).click();

  // make sure we have at leat one api key name
  expect(await page.getByRole("option").count(), {
    message: "No API Key names found",
  }).toBeGreaterThan(0);

  // select the first one
  await page.getByRole("option").nth(0).click();
});
