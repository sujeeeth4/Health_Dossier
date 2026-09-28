import { expect, test } from "@playwright/test";

test("theme choice persists across pages and can be changed in settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: /Explore the demo/i }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Patient Organize reports/i }).click();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await page.getByRole("button", { name: /Settings/i }).click();
  const settingsThemeToggle = page.locator(".theme-toggle:not(.theme-toggle-compact)");
  await expect(settingsThemeToggle).toHaveAttribute("aria-label", "Switch to light mode");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".theme-toggle-compact").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("patient sharing controls the doctor view and revocation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Explore the demo/i }).first().click();
  await page.getByRole("button", { name: /Patient Organize reports/i }).click();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await expect(page.getByText("Development demo. Do not upload real patient information.")).toBeVisible();

  await page.getByRole("button", { name: /Reports library/i }).click();
  await page.getByPlaceholder("Search reports, doctors, conditions...").fill("wellness blood");
  await expect(page.getByText("1 report found")).toBeVisible();
  await page.getByRole("button", { name: /Annual wellness blood panel/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Original document");
  await page.getByRole("button", { name: "Close report" }).click();

  await page.getByRole("button", { name: /Sharing & access/i }).click();
  await page.getByLabel("Select Annual wellness blood panel").check();
  await page.getByText("View & contribute", { exact: true }).first().click();
  await page.getByRole("button", { name: /Grant demo access/i }).click();
  await expect(page.getByText("1 active")).toBeVisible();

  await page.getByRole("button", { name: /Switch role/i }).click();
  await page.getByRole("button", { name: /Doctor View authorized history/i }).click();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await page.getByRole("button", { name: /Authorized patients/i }).click();
  await expect(page.getByRole("heading", { name: "Medical timeline" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Annual wellness blood panel/i })).toBeVisible();
  await page.getByRole("navigation", { name: "Demo navigation" }).getByRole("button", { name: /Add clinical record/i }).click();
  await page.getByPlaceholder("Fictional follow-up note").fill("Fictional follow-up note");
  await page.getByPlaceholder("Enter a fictional clinical note for the demo").fill("Fictional clinical contribution for the demo journey.");
  await page.getByRole("button", { name: /Add fictional record/i }).click();

  await page.getByRole("button", { name: /Switch role/i }).click();
  await page.getByRole("button", { name: /Patient Organize reports/i }).click();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await page.getByRole("button", { name: /Activity/i }).click();
  await expect(page.getByText("Clinical note contributed")).toBeVisible();
  await page.getByRole("button", { name: /Sharing & access/i }).click();
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
});

test("reviewing extracted metadata leaves the fictional original unchanged", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: /Patient Organize reports/i }).click();
  await page.getByRole("button", { name: /Continue with Google/i }).click();
  await page.getByRole("navigation", { name: "Demo navigation" }).getByRole("button", { name: /Add a report/i }).click();
  await page.getByRole("button", { name: /Use built-in fictional sample/i }).click();
  await expect(page.getByText("Review extracted information")).toBeVisible();
  await expect(page.locator(".sample-document h3")).toHaveText("Routine check-up report");
  await page.getByLabel("Document title *").fill("Corrected fictional title");
  await page.getByRole("button", { name: /Save reviewed report/i }).click();
  await page.getByRole("button", { name: /Corrected fictional title/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Corrected fictional title");
  await expect(page.locator(".sample-document h3")).toHaveText("Routine check-up report");
});
