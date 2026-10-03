import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

async function addRecord(
  page: import("@playwright/test").Page,
  title: string,
  date: string,
) {
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

async function createCollection(
  page: import("@playwright/test").Page,
  name: string,
  description: string,
) {
  await page
    .getByRole("button", { name: "New collection", exact: true })
    .click();
  await page.getByPlaceholder("e.g. Heart health").fill(name);
  await page
    .getByPlaceholder("What belongs in this collection?")
    .fill(description);
  await page
    .getByPlaceholder(
      "Keep questions, context, or details about this care journey.",
    )
    .fill("Bring this to the next appointment.");
  await page.getByRole("button", { name: "Create collection" }).click();
}

test("collections support timelines, multiple membership, detaching, and safe deletion", async ({
  page,
}) => {
  await page.goto("/records");
  await addRecord(page, "Older heart report", "2022-03-10");
  await addRecord(page, "Recent heart scan", "2025-08-19");

  await page.getByRole("link", { name: "Collections", exact: true }).click();
  await createCollection(
    page,
    "Heart health",
    "Scans and reports for cardiology visits.",
  );
  await page.getByRole("link", { name: /Heart health/ }).click();
  await page.getByRole("button", { name: "Manage records" }).click();
  await page.getByRole("checkbox", { name: /Older heart report/ }).check();
  await page.getByRole("checkbox", { name: /Recent heart scan/ }).check();
  await page.getByRole("button", { name: "Save records" }).click();

  await expect(
    page.getByRole("region", { name: "Collection records from 2025" }),
  ).toContainText("Recent heart scan");
  await expect(
    page.getByRole("region", { name: "Collection records from 2022" }),
  ).toContainText("Older heart report");
  const originalPage = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open Recent heart scan" }).click();
  await (await originalPage).close();
  const downloadedFile = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Recent heart scan" })
    .click();
  expect((await downloadedFile).suggestedFilename()).toBe(
    "Recent heart scan.pdf",
  );
  await page.reload();
  await expect(
    page.getByText("Bring this to the next appointment."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Description")
    .fill("Cardiology records and follow-up notes.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Cardiology records and follow-up notes."),
  ).toBeVisible();

  await page.getByRole("link", { name: "All collections" }).click();
  await createCollection(
    page,
    "Annual checkup",
    "Routine yearly health records.",
  );
  await page.getByRole("link", { name: /Annual checkup/ }).click();
  await page.getByRole("button", { name: "Manage records" }).click();
  await page.getByRole("checkbox", { name: /Recent heart scan/ }).check();
  await page.getByRole("button", { name: "Save records" }).click();

  await page.getByRole("link", { name: "Records", exact: true }).click();
  await page
    .getByRole("button", { name: "Recent heart scan", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Heart health" }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Annual checkup" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();

  await page.getByRole("link", { name: "Collections", exact: true }).click();
  await page.getByRole("link", { name: /Heart health/ }).click();
  await page.getByRole("button", { name: "Manage records" }).click();
  await page.getByRole("checkbox", { name: /Recent heart scan/ }).uncheck();
  await page.getByRole("button", { name: "Save records" }).click();
  await expect(page.getByText("Recent heart scan")).toHaveCount(0);

  await page.getByRole("link", { name: "Records", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Recent heart scan", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Collections", exact: true }).click();
  await page.getByRole("link", { name: /Annual checkup/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete this collection" }).click();
  await expect(
    page.getByRole("heading", { name: "Care collections" }),
  ).toBeVisible();
  await expect(page.getByText("Annual checkup")).toHaveCount(0);
  await page.getByRole("link", { name: "Records", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Recent heart scan", exact: true }),
  ).toBeVisible();
});
