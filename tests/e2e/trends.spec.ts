import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

function dateMonthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

async function addMeasurement(
  page: Page,
  value: string,
  measuredAt: string,
) {
  await page.getByRole("button", { name: "Add measurement", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Metric name/).fill("HbA1c");
  await dialog.getByLabel(/^Value/).fill(value);
  await dialog.getByLabel(/^Unit/).fill("%");
  await dialog.getByLabel(/Measurement date/).fill(measuredAt);
  await dialog.getByLabel(/Lower reference/).fill("4");
  await dialog.getByLabel(/Upper reference/).fill("5.7");
  await dialog.getByRole("button", { name: "Add measurement" }).click();
}

async function addRecord(page: Page) {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: "trend-source.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf,
  });
  await page.getByPlaceholder("e.g. Annual blood test").fill("Trend source report");
  await page.getByRole("checkbox", { name: /I compared these details/ }).check();
  await page.getByRole("button", { name: "Save record" }).click();
}

test("creates, groups, charts, edits, filters, and deletes reviewed measurements", async ({
  page,
}) => {
  await page.goto("/trends");
  await expect(page.getByText("Your trends begin with one reviewed value")).toBeVisible();
  await addMeasurement(page, "5.2", dateMonthsAgo(2));
  await addMeasurement(page, "6.2", dateMonthsAgo(1));

  const card = page.locator(".trend-card-grid button").filter({ hasText: "HbA1c" });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("6.2");
  await expect(card).toContainText("Above supplied range");
  await expect(page.getByRole("img", { name: /HbA1c, 2 readings/ })).toBeVisible();
  await expect(page.locator(".trend-table tbody tr")).toHaveCount(2);

  await page.getByLabel(/Edit HbA1c/).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Value/).fill("5.5");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(card).toContainText("5.5");
  await expect(card).toContainText("Within supplied range");

  await page.getByLabel("Date range").selectOption("3");
  await expect(page.locator(".trend-table tbody tr")).toHaveCount(2);
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByLabel(/Delete HbA1c/).last().click();
  await expect(page.locator(".trend-table tbody tr")).toHaveCount(1);
});

test("links a measurement to its original record and retains provenance after deletion", async ({
  page,
}) => {
  await addRecord(page);
  await page.getByRole("button", { name: "Trend source report", exact: true }).click();
  await page.getByRole("link", { name: "Track a value" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Source record")).toContainText("Trend source report");
  await dialog.getByLabel(/Metric name/).fill("TSH");
  await dialog.getByLabel(/^Value/).fill("2.4");
  await dialog.getByLabel(/^Unit/).fill("µIU/mL");
  await dialog.getByRole("button", { name: "Add measurement" }).click();
  await expect(page.getByRole("link", { name: /Trend source report/ })).toHaveAttribute(
    "href",
    /\/api\/files\//,
  );

  await page.goto("/records");
  await page.getByRole("button", { name: "Trend source report", exact: true }).click();
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Remove" }).click();
  await page.goto("/trends");
  await expect(page.getByText("Record removed")).toBeVisible();
  await expect(page.getByText("Trend source report")).toBeVisible();
});

test("rejects invalid measurement writes without changing the dossier", async ({ page }) => {
  await page.goto("/trends");
  await expect(page.getByText("Your trends begin with one reviewed value")).toBeVisible();
  const valid = {
    name: "HbA1c",
    value: 5.5,
    unit: "%",
    measuredAt: dateMonthsAgo(0),
    category: "Laboratory",
    notes: "",
  };
  for (const body of [
    { ...valid, measuredAt: "2999-01-01" },
    { ...valid, referenceLow: 8, referenceHigh: 7 },
    { ...valid, sourceRecordId: "missing-record" },
  ]) {
    const status = await page.evaluate(async (value) => {
      const response = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      return response.status;
    }, body);
    expect(status).toBe(400);
  }
  await page.reload();
  await expect(page.getByText("Your trends begin with one reviewed value")).toBeVisible();
});

test("includes only deliberately selected metrics in the Visit Pack", async ({ page }) => {
  await page.goto("/trends");
  await addMeasurement(page, "5.4", dateMonthsAgo(0));
  await page.goto("/visit-pack");
  await expect(page.getByRole("heading", { name: /Selected health trends/ })).toHaveCount(0);
  await page.getByRole("checkbox", { name: /HbA1c · %/ }).check();
  await expect(page.getByRole("heading", { name: "Selected health trends (1)" })).toBeVisible();
  await expect(page.locator(".pack-trends")).toContainText("5.4 %");
  await page.getByRole("checkbox", { name: /HbA1c · %/ }).uncheck();
  await expect(page.getByRole("heading", { name: /Selected health trends/ })).toHaveCount(0);
});

test.describe("mobile trends", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps dashboard and entry controls inside the viewport", async ({ page }) => {
    await page.goto("/trends");
    await addMeasurement(page, "5.4", dateMonthsAgo(0));
    await expect(page.getByRole("heading", { name: "Health trends" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
