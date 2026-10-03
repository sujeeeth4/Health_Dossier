import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

test("add a record, find it after reload, edit details, download, and remove it", async ({
  page,
}) => {
  await page.goto("/records");
  await expect(
    page.getByRole("heading", { name: "Record library" }),
  ).toBeVisible();
  await expect(page.getByText("Your library starts here")).toBeVisible();

  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: "blood-test.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf,
  });
  await page
    .getByPlaceholder("e.g. Annual blood test")
    .fill("Annual blood test");
  await page
    .getByRole("checkbox", { name: /I compared these details/ })
    .check();
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("button", { name: "Annual blood test", exact: true }),
  ).toBeVisible();

  await page.reload();
  await page.getByPlaceholder("Search records").fill("blood test");
  await expect(
    page.getByRole("button", { name: "Annual blood test", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Annual blood test", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("blood-test.pdf");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page
    .getByPlaceholder("e.g. Annual blood test")
    .fill("Updated blood test");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByPlaceholder("Search records").fill("Updated");
  await expect(
    page.getByRole("button", { name: "Updated blood test", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Updated blood test", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Download" })
    .click();
  expect((await download).suggestedFilename()).toBe("blood-test.pdf");
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your library starts here")).toBeVisible();
});

test("timeline keeps year groups, age labels, and important markers after reload", async ({
  page,
}) => {
  await page.goto("/records");
  for (const [title, date, important] of [
    ["First checkup", "2021-05-20", false],
    ["Recent scan", "2024-08-15", true],
  ] as const) {
    await page.getByRole("button", { name: "Add a record" }).click();
    await page.getByLabel("Choose medical document").setInputFiles({
      name: `${title}.pdf`,
      mimeType: "application/pdf",
      buffer: samplePdf,
    });
    await page.getByPlaceholder("e.g. Annual blood test").fill(title);
    await page.getByRole("dialog").locator('input[type="date"]').fill(date);
    if (important)
      await page.getByRole("checkbox", { name: /Mark as important/ }).check();
    await page
      .getByRole("checkbox", { name: /I compared these details/ })
      .check();
    await page.getByRole("button", { name: "Save record" }).click();
  }
  await page.getByRole("button", { name: "Timeline" }).click();
  await page.getByLabel("Date of birth").fill("2000-07-01");
  await page.getByLabel("Date of birth").blur();
  await expect(
    page.getByRole("region", { name: "Records from 2024" }),
  ).toContainText("Age 24");
  await expect(
    page.getByRole("region", { name: "Records from 2021" }),
  ).toContainText("Age 20");
  await expect(
    page.getByRole("region", { name: "Records from 2024" }),
  ).toContainText("Important");
  await page.reload();
  await page.getByRole("button", { name: "Timeline" }).click();
  await expect(page.getByLabel("Date of birth")).toHaveValue("2000-07-01");
  await page.getByPlaceholder("Search records").fill("Recent");
  await expect(
    page.getByRole("region", { name: "Records from 2024" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Records from 2021" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Recent scan", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Recent scan.pdf");
});

test("reviews smart import suggestions before saving them", async ({
  page,
}) => {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: "annual-blood-panel.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf,
  });

  await expect(
    page.getByRole("heading", { name: "Review extracted details" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Annual blood test")).toHaveValue(
    "Annual Blood Panel",
  );
  await expect(page.getByLabel("Record type")).toHaveValue("Laboratory");
  await expect(
    page.getByPlaceholder("Where this record came from"),
  ).toHaveValue("Lotus Diagnostics");
  await expect(page.getByPlaceholder("e.g. Cardiology")).toHaveValue(
    "Pathology",
  );
  await expect(page.getByLabel(/Tests and notable values/)).toHaveValue(
    /HbA1c/,
  );

  const saveButton = page.getByRole("button", { name: "Save record" });
  await expect(saveButton).toBeDisabled();
  await page
    .getByPlaceholder("e.g. Annual blood test")
    .fill("Reviewed annual blood panel");
  await page
    .getByRole("checkbox", { name: /I compared these details/ })
    .check();
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await page
    .getByRole("button", { name: "Reviewed annual blood panel", exact: true })
    .click();
  const details = page.getByRole("dialog");
  await expect(details).toContainText("Verified against original");
  await expect(details).toContainText("HbA1c");
  await expect(details).toContainText("Corrections made during review");
  await expect(details).toContainText("Title");
});

test("moves existing IndexedDB records into the local backend", async ({
  page,
}) => {
  await page.goto("/records");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase("health-dossier-records");
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
    });
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("health-dossier-records", 5);
      request.onupgradeneeded = () => {
        for (const [name, options] of [
          ["records", { keyPath: "id" }],
          ["settings", undefined],
          ["collections", { keyPath: "id" }],
          ["shares", { keyPath: "id" }],
          ["share-events", { keyPath: "id" }],
          ["doctor-profiles", { keyPath: "id" }],
          ["doctor-credentials", { keyPath: "doctorId" }],
        ] as const) {
          request.result.createObjectStore(name, options);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("records", "readwrite");
      transaction.objectStore("records").put({
        id: "legacy-record",
        title: "Legacy blood report",
        type: "Laboratory",
        date: "2024-04-12",
        provider: "Old Clinic",
        notes: "",
        collectionIds: [],
        fileName: "legacy.pdf",
        fileType: "application/pdf",
        fileSize: 24,
        file: new Blob(["%PDF-1.4 legacy"], { type: "application/pdf" }),
        createdAt: new Date().toISOString(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(
    page.getByText("Browser records are ready to move"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move data to this Mac" }).click();
  await expect(
    page.getByRole("button", { name: "Legacy blood report", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Legacy blood report", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Browser records are ready to move")).toHaveCount(
    0,
  );
});

test("brand and permanent dark theme remain consistent across pages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Health Dossier home" }).first(),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: /Switch to .* mode/ }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("heading", { name: "Record library" }),
  ).toBeVisible();
});

test("phone sign-up advances through the code screen", async ({ page }) => {
  await page.goto("/signup");
  await page
    .getByRole("button", { name: "Continue with phone number" })
    .click();
  await page.getByPlaceholder("Your phone number").fill("9999999999");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Enter your code" }),
  ).toBeVisible();
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Record library" }),
  ).toBeVisible();
});

test("Apple option continues to the record library", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with Apple" }).click();
  await expect(
    page.getByRole("heading", { name: "Record library" }),
  ).toBeVisible();
});
