import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

const samplePdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
);

async function createDoctor(page: import("@playwright/test").Page) {
  await page.goto("/doctor/signup");
  await page.getByLabel("Full name").fill("Dr Maya Sen");
  await page.getByLabel("Work email").fill("maya.sen@clinic.in");
  await page.getByLabel("Password", { exact: true }).fill("Clinic123");
  await page.getByLabel("Confirm password").fill("Clinic123");
  await page.getByRole("button", { name: "Professional details" }).click();
  await page.getByLabel("Specialty").fill("Endocrinology");
  await page.getByLabel("Clinic or hospital").fill("Harbour Clinic");
  await page.getByLabel("Medical council").fill("Karnataka Medical Council");
  await page.getByLabel("Registration number").fill("KMC 90210");
  await page.getByRole("button", { name: "Review details" }).click();
  await expect(page.getByText("Simulated verification only")).toBeVisible();
  await page.getByRole("button", { name: "Verify and create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Dr Maya Sen" }),
  ).toBeVisible();
}

async function addRecord(page: import("@playwright/test").Page) {
  await page.goto("/records");
  await page.getByRole("button", { name: "Add your first record" }).click();
  await page.getByLabel("Choose medical document").setInputFiles({
    name: "thyroid-panel.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf,
  });
  await page.getByPlaceholder("e.g. Annual blood test").fill("Thyroid panel");
  await page
    .getByRole("checkbox", { name: /I compared these details/ })
    .check();
  await page.getByRole("button", { name: "Save record" }).click();
}

test("doctor signup connects patient grants to the protected access inbox", async ({
  page,
}) => {
  await page.goto("/doctor");
  await expect(page).toHaveURL(/\/doctor\/login$/);

  await createDoctor(page);
  await expect(page.getByText("No active patient access")).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/doctor\/login$/);

  await addRecord(page);
  await page.goto("/sharing");
  await page.getByRole("button", { name: "Share records" }).click();
  await page.getByText("Dr Maya Sen", { exact: true }).click();
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page.getByText("Access granted to Dr Maya Sen.")).toBeVisible();

  await page.goto("/doctor/login");
  await page.getByLabel("Work email").fill("maya.sen@clinic.in");
  await page.getByLabel("Password").fill("Clinic123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Dr Maya Sen" }),
  ).toBeVisible();
  await expect(page.getByText("Thyroid panel", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("thyroid-panel.pdf");
  await page.getByRole("dialog").getByText("Close", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("thyroid-panel.pdf");

  await page.goto("/sharing");
  await expect(page.getByText("Thyroid panel viewed")).toBeVisible();
  await expect(page.getByText("Thyroid panel downloaded")).toBeVisible();
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Revoke access" }).click();

  await page.goto("/doctor");
  await expect(page.getByText("No active patient access")).toBeVisible();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await expect(page.getByText("Thyroid panel", { exact: true })).toHaveCount(0);
});

test("doctor signup validates passwords and duplicate professional identity", async ({
  page,
}) => {
  await page.goto("/doctor/signup");
  await page.getByLabel("Full name").fill("Dr Duplicate");
  await page.getByLabel("Work email").fill("ananya.mehta@healthdossier.demo");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("different");
  await page.getByRole("button", { name: "Professional details" }).click();
  await expect(page.getByText(/Use at least 8 characters/)).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill("Doctor456");
  await page.getByLabel("Confirm password").fill("Doctor456");
  await page.getByRole("button", { name: "Professional details" }).click();
  await page.getByLabel("Specialty").fill("Cardiology");
  await page.getByLabel("Clinic or hospital").fill("City Care Hospital");
  await page
    .getByLabel("Medical council")
    .fill("Telangana State Medical Council");
  await page.getByLabel("Registration number").fill("NEW 12345");
  await page.getByRole("button", { name: "Review details" }).click();
  await page.getByRole("button", { name: "Verify and create account" }).click();
  await expect(
    page.getByText("An account already uses this email address."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByLabel("Work email").fill("duplicate.registration@clinic.in");
  await page.getByRole("button", { name: "Professional details" }).click();
  await page.getByLabel("Registration number").fill("TSMC 48291");
  await page.getByRole("button", { name: "Review details" }).click();
  await page.getByRole("button", { name: "Verify and create account" }).click();
  await expect(
    page.getByText("This medical registration is already in use."),
  ).toBeVisible();
});

test("doctor submits a consultation note and the patient accepts it into the dossier", async ({
  page,
}) => {
  await addRecord(page);
  await page.goto("/sharing");
  await page.getByRole("button", { name: "Share records" }).click();
  await page.getByText("View and contribute", { exact: true }).click();
  await page.getByRole("button", { name: "Grant access" }).click();

  await page.goto("/doctor/login");
  await page
    .getByRole("button", { name: /Use the verified demo account/ })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Add consultation note" })
    .click();
  await page.getByLabel("Note title").fill("Thyroid follow-up consultation");
  await page.getByLabel("Linked shared record (optional)").selectOption({
    label: "Thyroid panel",
  });
  await page
    .getByLabel("Assessment")
    .fill("Thyroid markers are stable and symptoms are improving.");
  await page
    .getByLabel("Recommendations")
    .fill("Continue the current care plan and monitor symptoms.");
  await page.getByLabel("Suggested tests (optional)").fill("Repeat TSH");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Consultation note sent for patient review."),
  ).toBeVisible();
  await expect(page.getByText("Awaiting review")).toBeVisible();
  await page
    .getByRole("button", { name: "Add consultation note" })
    .click();
  await page.getByLabel("Note title").fill("Unapproved treatment note");
  await page.getByLabel("Assessment").fill("A second clinical assessment.");
  await page
    .getByLabel("Recommendations")
    .fill("A recommendation the patient may reject.");
  await page.getByRole("button", { name: "Submit for review" }).click();

  await page.goto("/sharing");
  await expect(
    page.getByText("Thyroid follow-up consultation", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(
    page.getByText("Access revoked for Dr Ananya Mehta."),
  ).toBeVisible();
  await expect(
    page.getByText("Thyroid follow-up consultation", { exact: true }),
  ).toBeVisible();
  const acceptedCard = page
    .locator(".patient-contribution-list article")
    .filter({ hasText: "Thyroid follow-up consultation" });
  await acceptedCard.getByRole("button", { name: "Review note" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Thyroid markers are stable",
  );
  await page.getByRole("button", { name: "Accept into dossier" }).click();
  await expect(
    page.getByText("Doctor note accepted into your dossier."),
  ).toBeVisible();
  await expect(
    page.getByText("Consultation note accepted: Thyroid follow-up consultation"),
  ).toBeVisible();
  const rejectedCard = page
    .locator(".patient-contribution-list article")
    .filter({ hasText: "Unapproved treatment note" });
  await rejectedCard.getByRole("button", { name: "Review note" }).click();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(
    page.getByText("Doctor note rejected and kept out of your clinical views."),
  ).toBeVisible();
  await expect(
    page.getByText("Consultation note rejected: Unapproved treatment note"),
  ).toBeVisible();

  await page.goto("/records");
  await page.getByRole("button", { name: "Timeline" }).click();
  await expect(page.getByText("Unapproved treatment note")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Thyroid follow-up consultation",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(/Accepted doctor note/i);
  await page
    .getByRole("dialog")
    .getByText("Close", { exact: true })
    .click();

  await page.goto("/visit-pack");
  await expect(
    page.getByRole("heading", { name: "Accepted doctor notes (1)" }),
  ).toBeVisible();
  await expect(
    page.getByText("Thyroid follow-up consultation", { exact: true }),
  ).toBeVisible();

  await page.goto("/doctor");
  await expect(page.getByText("No active patient access")).toBeVisible();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await expect(page.getByText("Thyroid panel", { exact: true })).toHaveCount(0);
});

test("view-only access cannot submit doctor contributions", async ({ page }) => {
  await addRecord(page);
  await page.goto("/sharing");
  await page.getByRole("button", { name: "Share records" }).click();
  await page.getByRole("button", { name: "Grant access" }).click();

  await page.goto("/doctor/login");
  await page
    .getByRole("button", { name: /Use the verified demo account/ })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome, Dr Ananya Mehta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add consultation note" }),
  ).toHaveCount(0);
  const response = await page.evaluate(async () => {
    const shares = (await (
      await fetch("/api/data?action=shares")
    ).json()) as Array<{ id: string }>;
    const request = await fetch("/api/contributions?scope=doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shareId: shares[0].id,
        title: "Should fail",
        consultationDate: new Date().toISOString().slice(0, 10),
        assessment: "Not permitted",
        recommendations: "Not permitted",
        suggestedTests: "",
      }),
    });
    return request.status;
  });
  expect(response).toBe(403);
});

test.describe("mobile doctor portal", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("signs in and keeps the inbox within the mobile viewport", async ({
    page,
  }) => {
    await page.goto("/doctor/login");
    await page.getByLabel("Work email").fill("ananya.mehta@healthdossier.demo");
    await page.getByLabel("Password").fill("incorrect1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByText("The email or password is incorrect."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Use the verified demo account/ })
      .click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Welcome, Dr Ananya Mehta" }),
    ).toBeVisible();
    await expect(page.getByText("No active patient access")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Welcome, Dr Ananya Mehta" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
