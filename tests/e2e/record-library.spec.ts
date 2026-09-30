import { expect, test } from "@playwright/test";

const samplePdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n");

test("add a record, find it after reload, edit details, download, and remove it", async ({ page }) => {
  await page.goto("/records");
  await expect(page.getByRole("heading", { name: "Record library" })).toBeVisible();
  await expect(page.getByText("Your library starts here")).toBeVisible();

  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({ name: "blood-test.pdf", mimeType: "application/pdf", buffer: samplePdf });
  await page.getByPlaceholder("e.g. Annual blood test").fill("Annual blood test");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(page.getByRole("button", { name: "Annual blood test", exact: true })).toBeVisible();

  await page.reload();
  await page.getByPlaceholder("Search records").fill("blood test");
  await expect(page.getByRole("button", { name: "Annual blood test", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Annual blood test", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("blood-test.pdf");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByPlaceholder("e.g. Annual blood test").fill("Updated blood test");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByPlaceholder("Search records").fill("Updated");
  await expect(page.getByRole("button", { name: "Updated blood test", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Updated blood test", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("blood-test.pdf");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your library starts here")).toBeVisible();
});

test("timeline keeps year groups, age labels, and important markers after reload", async ({ page }) => {
  await page.goto("/records");
  for (const [title, date, important] of [
    ["First checkup", "2021-05-20", false],
    ["Recent scan", "2024-08-15", true],
  ] as const) {
    await page.getByRole("button", { name: "Add a record" }).click();
    await page.getByLabel("Choose medical document").setInputFiles({ name: `${title}.pdf`, mimeType: "application/pdf", buffer: samplePdf });
    await page.getByPlaceholder("e.g. Annual blood test").fill(title);
    await page.getByRole("dialog").locator('input[type="date"]').fill(date);
    if (important) await page.getByRole("checkbox", { name: /Mark as important/ }).check();
    await page.getByRole("button", { name: "Save record" }).click();
  }
  await page.getByRole("button", { name: "Timeline" }).click();
  await page.getByLabel("Date of birth").fill("2000-07-01");
  await page.getByLabel("Date of birth").blur();
  await expect(page.getByRole("region", { name: "Records from 2024" })).toContainText("Age 24");
  await expect(page.getByRole("region", { name: "Records from 2021" })).toContainText("Age 20");
  await expect(page.getByRole("region", { name: "Records from 2024" })).toContainText("Important");
  await page.reload();
  await page.getByRole("button", { name: "Timeline" }).click();
  await expect(page.getByLabel("Date of birth")).toHaveValue("2000-07-01");
  await page.getByPlaceholder("Search records").fill("Recent");
  await expect(page.getByRole("region", { name: "Records from 2024" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Records from 2021" })).toHaveCount(0);
  await page.getByRole("button", { name: "Recent scan", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Recent scan.pdf");
});

test("brand and theme remain usable across pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Health Dossier home" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "Record library" })).toBeVisible();
});


test("phone sign-up advances through the code screen", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with phone number" }).click();
  await page.getByPlaceholder("Your phone number").fill("9999999999");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Record library" })).toBeVisible();
});

test("Apple option continues to the record library", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with Apple" }).click();
  await expect(page.getByRole("heading", { name: "Record library" })).toBeVisible();
});
