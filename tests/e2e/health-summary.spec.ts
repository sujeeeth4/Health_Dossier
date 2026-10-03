import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

test("create, view, and edit a health summary stored in the browser", async ({
  page,
}) => {
  await page.goto("/summary");
  await expect(
    page.getByRole("heading", { name: "Health summary" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create my health summary" }).click();

  await page.getByLabel("Full name").fill("Asha Rao");
  await page.getByLabel("Date of birth").fill("1994-04-12");
  await page.getByLabel("Blood type").selectOption("O+");
  await page.getByLabel("Allergies").fill("Penicillin\nPeanuts");
  await page.getByLabel("Ongoing conditions").fill("Asthma");
  await page.getByRole("button", { name: "Add your first medication" }).click();
  await page
    .getByRole("textbox", { name: "Medication", exact: true })
    .fill("Montelukast");
  await page.getByLabel("Dose").fill("10 mg");
  await page.getByLabel("Schedule").fill("Every evening");
  await page.getByLabel("Name", { exact: true }).fill("Dev Rao");
  await page.getByLabel("Relationship").fill("Brother");
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByLabel("Care notes").fill("Prefers morning appointments.");
  await page.getByRole("button", { name: "Save summary" }).click();

  await expect(page.getByText("Health summary saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asha Rao" })).toBeVisible();
  await expect(page.getByText("Blood type O+")).toBeVisible();
  await expect(page.getByText("Montelukast")).toBeVisible();
  await expect(page.getByText("9876543210")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Asha Rao" })).toBeVisible();
  await page.getByRole("button", { name: "Edit summary" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("Asha Rao");
  await expect(page.getByLabel("Allergies")).toHaveValue("Penicillin\nPeanuts");
  await page.getByLabel("Care notes").fill("Carries a rescue inhaler.");
  await page.getByRole("button", { name: "Save summary" }).click();
  await expect(page.getByText("Carries a rescue inhaler.")).toBeVisible();
});
