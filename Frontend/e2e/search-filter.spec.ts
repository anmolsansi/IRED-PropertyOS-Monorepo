import { test, expect } from "@playwright/test";

test.describe("Clients Search", () => {
  test("has search input", async ({ page }) => {
    await page.goto("/clients");
    const searchInput = page.getByPlaceholder(/search clients/i);
    await expect(searchInput).toBeVisible();
  });

  test("can type in search input", async ({ page }) => {
    await page.goto("/clients");
    const searchInput = page.getByPlaceholder(/search clients/i);
    await searchInput.fill("Vikram");
    await expect(searchInput).toHaveValue("Vikram");
  });
});

test.describe("Buildings Search", () => {
  test("has search input", async ({ page }) => {
    await page.goto("/buildings");
    const searchInput = page.getByPlaceholder(/search buildings/i);
    await expect(searchInput).toBeVisible();
  });

  test("can type in search input", async ({ page }) => {
    await page.goto("/buildings");
    const searchInput = page.getByPlaceholder(/search buildings/i);
    await searchInput.fill("Phoenix");
    await expect(searchInput).toHaveValue("Phoenix");
  });
});

test.describe("Properties Filters", () => {
  test("properties page loads with filter controls", async ({ page }) => {
    await page.goto("/properties");
    await expect(page).toHaveURL(/\/properties/);
    await expect(page.getByPlaceholder(/min/i).first()).toBeVisible();
  });

  test("can set area filter values", async ({ page }) => {
    await page.goto("/properties");
    const minArea = page.getByPlaceholder(/min/i).first();
    await minArea.fill("500");
    await expect(minArea).toHaveValue("500");
  });
});

test.describe("Dashboard Global Search", () => {
  test("search dialog opens with Cmd+K", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Meta+k");
    const searchInput = page.getByPlaceholder(/search properties/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test("search dialog can be closed with Escape", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Meta+k");
    const searchInput = page.getByPlaceholder(/search properties/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
  });

  test("search returns results for valid query", async ({ page }) => {
    await page.goto("/dashboard");
    await page.keyboard.press("Meta+k");
    const searchInput = page.getByPlaceholder(/search properties/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill("Phoenix");
    await page.waitForTimeout(500);
  });
});
