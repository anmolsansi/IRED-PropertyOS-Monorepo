import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("skip-to-content link is present", async ({ page }) => {
    await page.goto("/dashboard");
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeAttached();
  });

  test("main content has id for skip link", async ({ page }) => {
    await page.goto("/dashboard");
    const main = page.locator("#main-content");
    await expect(main).toBeAttached();
  });

  test("sidebar has aria-label", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("aside[aria-label]");
    await expect(sidebar).toBeAttached();
  });

  test("search dialog has aria-label on input", async ({ page }) => {
    await page.goto("/dashboard");
    const searchBtn = page.getByRole("button", { name: /search.*ctrl\+k/i });
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    const searchInput = page.getByRole("textbox", { name: "Search" });
    await expect(searchInput).toBeVisible();
  });

  test("notification button has aria-label", async ({ page }) => {
    await page.goto("/dashboard");
    const notifBtn = page.getByLabel("Notifications (3 unread)");
    await expect(notifBtn).toBeVisible();
  });
});
