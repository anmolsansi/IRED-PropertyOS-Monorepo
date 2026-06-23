import { test, expect } from "@playwright/test";

test.describe("Properties", () => {
  test("lists properties page loads", async ({ page }) => {
    await page.goto("/properties");
    await expect(page).toHaveURL(/\/properties/);
  });

  test("can open property create form", async ({ page }) => {
    await page.goto("/properties/new");
    await expect(page).toHaveURL(/\/properties\/new/);
  });

  test("can open property create form and fill text fields", async ({ page }) => {
    await page.goto("/properties/new");
    await expect(page).toHaveURL(/\/properties\/new/);

    // Fill the building name text field
    await page.getByPlaceholder("e.g. Phoenix Marketcity").fill("Test Tower");
    await expect(page.getByPlaceholder("e.g. Phoenix Marketcity")).toHaveValue("Test Tower");
  });

  test("shows property detail page", async ({ page }) => {
    await page.goto("/properties/1");
    await expect(page).toHaveURL(/\/properties\/1/);
  });
});

test.describe("Buildings", () => {
  test("buildings page loads", async ({ page }) => {
    await page.goto("/buildings");
    await expect(page).toHaveURL(/\/buildings/);
  });
});

test.describe("Floors", () => {
  test("floors page loads", async ({ page }) => {
    await page.goto("/floors");
    await expect(page).toHaveURL(/\/floors/);
  });
});
