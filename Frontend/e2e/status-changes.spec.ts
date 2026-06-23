import { test, expect } from "@playwright/test";

test.describe("Task Status Changes", () => {
  test("task list page shows content", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole("button", { name: /add task/i })).toBeVisible();
  });
});

test.describe("Site Visit Status Changes", () => {
  test("site visit list shows content", async ({ page }) => {
    await page.goto("/site-visits");
    await expect(page).toHaveURL(/\/site-visits/);
    await expect(page.getByRole("button", { name: /schedule visit/i })).toBeVisible();
  });
});

test.describe("Follow-up Status Changes", () => {
  test("follow-up list shows content", async ({ page }) => {
    await page.goto("/follow-ups");
    await expect(page).toHaveURL(/\/follow-ups/);
    await expect(page.getByRole("button", { name: /add follow-up/i })).toBeVisible();
  });
});

test.describe("Deal Pipeline View", () => {
  test("deals page shows view toggle", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/deals/);
    await expect(page.getByRole("button", { name: /list view|pipeline view/i })).toBeVisible();
  });

  test("deals page can switch views", async ({ page }) => {
    await page.goto("/deals");
    const toggleButton = page.getByRole("button", { name: /list view|pipeline view/i });
    await toggleButton.click();
    await page.waitForTimeout(300);
  });
});

test.describe("Approval Status", () => {
  test("approvals page loads", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/approvals/);
  });
});
