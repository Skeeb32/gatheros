import { test, expect } from "@playwright/test";
test("marketplace search and free filter work", async ({ page }) => {
  await page.goto("/explore");
  await expect(
    page.getByRole("heading", { name: "Good things happen together." }),
  ).toBeVisible();
  await expect(page.getByText("Sample events")).toBeVisible();
  await page.getByRole("button", { name: "Free to join", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sunday, a little slower." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Golden hour, good company." }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "All experiences", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search events" })
    .fill("no-such-event");
  await expect(page.getByText("No events match your search.")).toBeVisible();
});
test("event checkout calculates quantity and rejects demo purchases", async ({
  page,
}) => {
  await page.goto("/e/summer-socials/golden-hour-social");
  await page.getByLabel("Guests").selectOption("2");
  await expect(page.getByText("$88", { exact: true })).toBeVisible();
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Guest");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("demo");
});
test("organizer can navigate tools and demo never persists changes", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Create event", exact: true }).click();
  await page.getByLabel("Event title").fill("My new gathering");
  await page.getByLabel("URL slug").fill("my-new-gathering");
  await page.getByLabel("Starts (UTC)").fill("2027-08-01T18:00");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Demo mode");
  await page.goto(
    "/dashboard/events/10000000-0000-4000-8000-000000000001/check-in",
  );
  await page.getByLabel("Ticket code").fill("a".repeat(64));
  await page.getByRole("button", { name: "Check in guest" }).click();
  await expect(page.getByRole("status")).toContainText("Demo mode");
});
test("auth and confirmation explain next steps", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.com");
  await page.getByLabel("Password", { exact: true }).fill("demo-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Configure Supabase");
  await page.goto("/checkout/success");
  await expect(
    page.getByText("This page alone does not confirm your purchase.", {
      exact: false,
    }),
  ).toBeVisible();
});
test("mobile layout does not overflow", async ({ page }) => {
  await page.goto("/explore");
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  await page.goto("/dashboard");
  const dash = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dash.document).toBeLessThanOrEqual(dash.viewport);
});
