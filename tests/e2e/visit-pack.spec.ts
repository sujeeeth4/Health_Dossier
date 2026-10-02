import { expect, test } from "@playwright/test";

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

async function addRecord(
  page: import("@playwright/test").Page,
  title: string,
  date: string,
) {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add a record", exact: true }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: `${title}.pdf`,
    mimeType: "application/pdf",
    buffer: samplePdf,
  });
  await page.getByPlaceholder("e.g. Annual blood test").fill(title);
  await page.getByRole("dialog").locator('input[type="date"]').fill(date);
  await page
    .getByRole("checkbox", { name: /I compared these details/ })
    .check();
  await page.getByRole("button", { name: "Save record" }).click();
}

test("builds a private visit pack from summary sections and selected records", async ({
  page,
}) => {
  await page.goto("/summary");
  await page.getByRole("button", { name: "Create my health summary" }).click();
  await page.getByLabel("Full name").fill("Asha Rao");
  await page.getByLabel("Date of birth").fill("1994-04-12");
  await page.getByLabel("Blood type").selectOption("O+");
  await page.getByLabel("Allergies").fill("Penicillin");
  await page.getByLabel("Ongoing conditions").fill("Asthma");
  await page.getByLabel("Care notes").fill("Prefers morning appointments.");
  await page.getByRole("button", { name: "Save summary" }).click();

  await addRecord(page, "Annual blood test", "2025-06-12");
  await addRecord(page, "Chest scan", "2024-11-02");
  await page.getByRole("link", { name: "Visit pack", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Prepare a visit pack" }),
  ).toBeVisible();
  await expect(page.getByLabel("Visit pack preview")).toContainText("Asha Rao");
  await expect(page.getByLabel("Visit pack preview")).toContainText(
    "Annual blood test",
  );
  await expect(page.getByLabel("Visit pack preview")).toContainText(
    "Chest scan",
  );
  await expect(page.getByLabel("Visit pack preview")).not.toContainText(
    "Prefers morning appointments.",
  );

  await page.getByLabel("Reason for visit").fill("Respiratory follow-up");
  await page.getByLabel("Doctor or clinic").fill("Dr Mehta");
  await page.getByRole("checkbox", { name: /Care notes/ }).check();
  await page.getByRole("checkbox", { name: /Chest scan/ }).uncheck();

  await expect(page.getByLabel("Visit pack preview")).toContainText(
    "Respiratory follow-up",
  );
  await expect(page.getByLabel("Visit pack preview")).toContainText("Dr Mehta");
  await expect(page.getByLabel("Visit pack preview")).toContainText(
    "Prefers morning appointments.",
  );
  await expect(page.getByLabel("Visit pack preview")).not.toContainText(
    "Chest scan",
  );
  await expect(
    page.getByRole("button", { name: "Print / save as PDF" }),
  ).toBeEnabled();
});
