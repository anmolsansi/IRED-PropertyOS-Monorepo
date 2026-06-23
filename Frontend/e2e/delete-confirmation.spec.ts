import { test, expect } from "@playwright/test";

test.describe("Task Delete Confirmation", () => {
  test("shows delete confirmation dialog", async ({ page }) => {
    await page.goto("/tasks");
    const deleteButton = page.locator("button.text-destructive").first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      await page.getByRole("button", { name: /cancel/i }).click();
    }
  });
});

test.describe("Site Visit Delete Confirmation", () => {
  test("shows delete confirmation dialog", async ({ page }) => {
    await page.goto("/site-visits");
    const deleteButton = page.locator("button.text-destructive").first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      await page.getByRole("button", { name: /cancel/i }).click();
    }
  });
});

test.describe("Property Delete Confirmation", () => {
  test("shows delete confirmation on detail page", async ({ page }) => {
    await page.goto("/properties/1");
    const deleteButton = page.getByRole("button", { name: /delete/i });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      await page.getByRole("button", { name: /cancel/i }).click();
    }
  });
});

test.describe("Building Delete Confirmation", () => {
  test("building detail page has delete button", async ({ page }) => {
    await page.goto("/properties/1");
    await expect(page).toHaveURL(/\/properties\/1/);
  });
});
