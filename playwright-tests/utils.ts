import { test, expect } from "@playwright/test";
import type { Page } from "playwright";

/**
 * Selects the first api key name in the dropdown. Errors if no api key names are found.
 *
 * @example
 * await selectApiKeyName(page);
 */
export async function selectApiKeyName(page: Page) {
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
export async function setSqlOnly(page: Page, sqlOnly: boolean = true) {
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
export async function askQuestionUsingSearchBar(
  page: Page,
  question: string = "show me 5 rows from the business table"
) {
  await page.getByPlaceholder("Type your question here").click();
  await page.getByPlaceholder("Type your question here").fill(question);

  await page.getByRole("button", { name: "Ask" }).click();
}

/**
 * Uploads a file to the page using the file input element on the null-state/blank tab.
 *
 */
export async function uploadFileOnNullTab(
  page: Page,
  fileBuffer: Buffer,
  fileName: string
) {
  const dataTransfer = await page.evaluateHandle(
    async ({ fileBuffer, localFileName, localFileType }) => {
      const dt = new DataTransfer();

      const file = new File([new Uint8Array(fileBuffer)], localFileName, {
        type: localFileType,
      });

      dt.items.add(file);
      return dt;
    },
    {
      fileBuffer: fileBuffer,
      localFileName: fileName,
      localFileType: "text/csv",
    }
  );

  // Now dispatch
  await page.dispatchEvent("div[data-testid='file-drop']", "drop", {
    dataTransfer,
  });
}
