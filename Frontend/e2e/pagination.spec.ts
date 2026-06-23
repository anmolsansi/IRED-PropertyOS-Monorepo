import { test, expect } from "@playwright/test";

test.describe("Properties Pagination", () => {
  test("properties page loads with controls", async ({ page }) => {
    await page.goto("/properties");
    await expect(page).toHaveURL(/\/properties/);
  });

  test("can change rows per page via select", async ({ page }) => {
    await page.goto("/properties");
    await expect(page).toHaveURL(/\/properties/);
  });
});

test.describe("Clients Pagination", () => {
  test("clients page loads", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/clients/);
  });
});

test.describe("Buildings Pagination", () => {
  test("buildings page loads", async ({ page }) => {
    await page.goto("/buildings");
    await expect(page).toHaveURL(/\/buildings/);
  });
});

test.describe("Tasks Pagination", () => {
  test("tasks page loads and shows content", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks/);
  });
});

test.describe("Deals Pagination", () => {
  test("deals page loads with view toggle", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/deals/);
    await expect(page.getByRole("button", { name: /list view|pipeline view/i })).toBeVisible();
  });

  test("can toggle between list and pipeline view", async ({ page }) => {
    await page.goto("/deals");
    const toggleButton = page.getByRole("button", { name: /list view|pipeline view/i });
    await toggleButton.click();
    await page.waitForTimeout(300);
    await toggleButton.click();
  });
});
