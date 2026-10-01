import { expect, test } from "@playwright/test";

const samplePdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n");

async function addRecord(page: import("@playwright/test").Page, title: string, sensitive = false) {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add a record", exact: true }).click();
  await page.getByLabel("Choose medical document").setInputFiles({ name: `${title}.pdf`, mimeType: "application/pdf", buffer: samplePdf });
  await page.getByPlaceholder("e.g. Annual blood test").fill(title);
  if (sensitive) await page.getByRole("checkbox", { name: /Mark as sensitive/ }).check();
  await page.getByRole("button", { name: "Save record" }).click();
}

test("grants, audits, persists, and revokes scoped doctor access", async ({ page }) => {
  await addRecord(page, "Annual blood test");
  await addRecord(page, "Private counselling note", true);

  await page.getByRole("link", { name: "Sharing", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sharing & access" })).toBeVisible();
  await page.getByRole("button", { name: "Share records" }).click();

  const sensitiveRecord = page.getByRole("checkbox", { name: /Private counselling note/ });
  await expect(sensitiveRecord).toBeDisabled();
  await expect(page.getByText("1 records selected")).toBeVisible();
  await page.getByRole("checkbox", { name: /Review sensitive records/ }).check();
  await sensitiveRecord.check();
  await page.getByText("View and contribute", { exact: true }).click();
  await page.getByLabel("Access expires").selectOption("7-days");
  await page.getByRole("button", { name: "Grant access" }).click();

  await expect(page.getByText("Access granted to Dr Ananya Mehta.")).toBeVisible();
  await expect(page.getByText("View and contribute", { exact: true })).toBeVisible();
  await expect(page.getByText("7 days", { exact: true })).toBeVisible();
  await expect(page.getByText("2 records", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Simulate view" }).click();
  await expect(page.getByText("Demo view added to the activity log.")).toBeVisible();
  await expect(page.getByText("2 selected records viewed")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Dr Ananya Mehta", { exact: true }).first()).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(page.getByText("Access revoked for Dr Ananya Mehta.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No active access" })).toBeVisible();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await expect(page.getByText("Access revoked for Dr Ananya Mehta", { exact: true })).toBeVisible();
});
