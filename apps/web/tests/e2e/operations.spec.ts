import { test, expect } from "@playwright/test";
async function navigate(page: import("@playwright/test").Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name, exact: true }).click();
}
test("dashboard uses real data and copilot cites event documents", async ({
  page,
}) => {
  await page.goto("/operations");
  await expect(
    page.getByRole("heading", { name: "Your event, in focus." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "How many VIP tickets are left?" })
    .click();
  await expect(page.locator(".ops-answer")).toContainText("16 available");
  await page
    .getByRole("button", { name: "Where should VIP attendees enter?" })
    .click();
  await expect(page.locator(".ops-answer")).toContainText("north entrance");
  await expect(page.locator(".ops-answer")).toContainText(
    "Venue & arrival guide",
  );
});
test("document uploads persist and can be retrieved", async ({ page }) => {
  await page.goto("/operations");
  await navigate(page, "Knowledge");
  await page.getByRole("button", { name: "Add document" }).click();
  const title = `Accessibility ${Date.now()}`;
  await page.getByLabel("Document title").fill(title);
  await page
    .getByLabel("Content", { exact: true })
    .fill("Quietroom access is available beside the west lobby.");
  await page.getByRole("button", { name: "Save to event" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.reload();
  await navigate(page, "Knowledge");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ask the copilot" })
    .fill("Where is quietroom access?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".ops-answer")).toContainText("west lobby");
});
test("copilot draft is reviewed and saved without sending", async ({
  page,
}) => {
  await page.goto("/operations");
  await page
    .getByRole("button", { name: "Write an event reminder email" })
    .click();
  await page.getByRole("button", { name: "Review & save draft" }).click();
  await page.getByLabel("Subject", { exact: true }).fill("A reviewed reminder");
  await page.getByRole("button", { name: "Save to event" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Email drafts");
  await expect(
    page.getByRole("heading", { name: "A reviewed reminder" }).first(),
  ).toBeVisible();
});
test("operations layout fits the viewport", async ({ page }) => {
  await page.goto("/operations");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("public waitlist signup persists", async ({ page }) => {
  await page.goto("/events/future-forward");
  await page.getByLabel("Your name").fill("Browser Guest");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`browser-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.getByRole("status")).toContainText("You’re on the list");
});
