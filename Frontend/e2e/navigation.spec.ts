import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("loads the dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("navigates to Properties list", async ({ page }) => {
    await page.goto("/properties");
    await expect(page).toHaveURL(/\/properties/);
  });

  test("navigates to Clients list", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/clients/);
  });

  test("navigates to Deals list", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/deals/);
  });

  test("navigates to Tasks list", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("navigates to Reports", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
  });

  test("navigates to Buildings", async ({ page }) => {
    await page.goto("/buildings");
    await expect(page).toHaveURL(/\/buildings/);
  });

  test("navigates to Floors", async ({ page }) => {
    await page.goto("/floors");
    await expect(page).toHaveURL(/\/floors/);
  });

  test("navigates to Map", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveURL(/\/map/);
  });
});
