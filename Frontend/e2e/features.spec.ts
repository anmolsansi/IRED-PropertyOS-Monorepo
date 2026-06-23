import { test, expect } from "@playwright/test";

test.describe("Map View", () => {
  test("map page loads", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveURL(/\/map/);
  });
});

test.describe("Reports", () => {
  test("reports page loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
  });
});

test.describe("Approvals", () => {
  test("approvals page loads", async ({ page }) => {
    await page.goto("/approvals");
    await expect(page).toHaveURL(/\/approvals/);
  });

  test("approval detail page loads", async ({ page }) => {
    await page.goto("/approvals/1");
    await expect(page).toHaveURL(/\/approvals\/1/);
  });
});

test.describe("Media", () => {
  test("media page loads", async ({ page }) => {
    await page.goto("/media");
    await expect(page).toHaveURL(/\/media/);
  });
});

test.describe("Activity", () => {
  test("activity page loads", async ({ page }) => {
    await page.goto("/activity");
    await expect(page).toHaveURL(/\/activity/);
  });
});

test.describe("Settings", () => {
  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe("Imports", () => {
  test("imports page loads", async ({ page }) => {
    await page.goto("/imports");
    await expect(page).toHaveURL(/\/imports/);
  });
});

test.describe("Exports", () => {
  test("exports page loads", async ({ page }) => {
    await page.goto("/exports");
    await expect(page).toHaveURL(/\/exports/);
  });
});
