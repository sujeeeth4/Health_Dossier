import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

async function addRecord(page: import("@playwright/test").Page) {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: "backup-report.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf,
  });
  await page.getByPlaceholder("e.g. Annual blood test").fill("Backup original");
  await page.getByRole("checkbox", { name: /I compared these details/ }).check();
  await page.getByRole("button", { name: "Save record" }).click();
}

test("exports, inspects, merges, replaces, and rolls back an encrypted dossier", async ({
  page,
}) => {
  await addRecord(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Backup & recovery" })).toBeVisible();
  const exportCard = page.locator(".settings-card").filter({
    has: page.getByRole("heading", { name: "Export encrypted backup" }),
  });
  await exportCard.getByLabel("Backup passphrase").fill("StrongBackup123");
  await exportCard.getByLabel("Confirm passphrase").fill("StrongBackup123");
  const download = page.waitForEvent("download");
  await exportCard.getByRole("button", { name: "Create encrypted backup" }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toMatch(/\.hdbak$/);
  const archivePath = await downloaded.path();
  expect(archivePath).toBeTruthy();
  await expect(page.getByText("Encrypted backup created and downloaded.")).toBeVisible();

  await page.goto("/records");
  await page.getByRole("button", { name: "Backup original", exact: true }).click();
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByPlaceholder("e.g. Annual blood test").fill("Current version");
  await page.getByRole("button", { name: "Save changes" }).click();

  await page.goto("/settings");
  const restoreCard = page.locator(".settings-card").filter({
    has: page.getByRole("heading", { name: "Inspect and restore" }),
  });
  await restoreCard.locator('input[type="file"]').setInputFiles(archivePath!);
  await restoreCard.getByLabel("Backup passphrase").fill("StrongBackup123");
  await restoreCard.getByRole("button", { name: "Inspect backup" }).click();
  await expect(page.getByRole("heading", { name: "Validated backup" })).toBeVisible();
  await expect(page.getByText(/keep 1 current conflicts/i)).toBeVisible();
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Merge backup" }).click();
  await expect(page.getByText("Backup merged. Current conflicts were kept.")).toBeVisible();

  await page.goto("/records");
  await expect(page.getByRole("button", { name: "Current version", exact: true })).toBeVisible();

  await page.goto("/settings");
  await restoreCard.locator('input[type="file"]').setInputFiles(archivePath!);
  await restoreCard.getByLabel("Backup passphrase").fill("StrongBackup123");
  await restoreCard.getByRole("button", { name: "Inspect backup" }).click();
  await page.getByText("Replace complete dossier", { exact: true }).click();
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Replace dossier" }).click();
  await expect(page.getByText("The dossier was replaced from the encrypted backup.")).toBeVisible();

  await page.goto("/records");
  await expect(page.getByRole("button", { name: "Backup original", exact: true })).toBeVisible();
  await page.goto("/doctor/login");
  await page.getByRole("button", { name: /Use the verified demo account/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Dr Ananya Mehta" }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Roll back" }).first().click();
  await expect(page.getByText("Recovery snapshot restored.")).toBeVisible();
  await page.goto("/records");
  await expect(page.getByRole("button", { name: "Current version", exact: true })).toBeVisible();
});

test.describe("mobile backup settings", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps backup controls inside the viewport", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Backup & recovery" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create encrypted backup" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
