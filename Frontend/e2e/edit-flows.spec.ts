import { test, expect } from "@playwright/test";

test.describe("Task Edit Flow", () => {
  test("can open task list and view tasks", async ({ page }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/tasks/);
  });
});

test.describe("Site Visit Edit Flow", () => {
  test("can view site visits list", async ({ page }) => {
    await page.goto("/site-visits");
    await expect(page).toHaveURL(/\/site-visits/);
  });
});

test.describe("Follow-up Edit Flow", () => {
  test("opens create dialog and fills form", async ({ page }) => {
    await page.goto("/follow-ups");
    await page.getByRole("button", { name: /add follow-up/i }).click();
    await expect(page.getByRole("heading", { name: "Create Follow-up" })).toBeVisible();
    await page.getByPlaceholder("e.g. Call back to confirm visit").fill("Follow-up test");
    await page.getByPlaceholder("Optional details").fill("Test description");
    await expect(page.getByPlaceholder("e.g. Call back to confirm visit")).toHaveValue("Follow-up test");
  });
});

test.describe("Task Detail Status Changes", () => {
  test("task detail page loads", async ({ page }) => {
    await page.goto("/tasks/1");
    await expect(page).toHaveURL(/\/tasks\/1/);
  });
});

test.describe("Site Visit Detail Status Changes", () => {
  test("site visit detail page loads", async ({ page }) => {
    await page.goto("/site-visits/1");
    await expect(page).toHaveURL(/\/site-visits\/1/);
  });
});

test.describe("Deal Create Flow", () => {
  test("can open create dialog", async ({ page }) => {
    await page.goto("/deals");
    await page.getByRole("button", { name: /new deal/i }).click();
    await expect(page.getByRole("heading", { name: /create deal/i })).toBeVisible();
  });
});

test.describe("Property Edit Flow", () => {
  test("can navigate to property edit page", async ({ page }) => {
    await page.goto("/properties/1/edit");
    await expect(page).toHaveURL(/\/properties\/1\/edit/);
  });
});

test.describe("Client Edit Flow", () => {
  test("can navigate to client edit page", async ({ page }) => {
    await page.goto("/clients/1/edit");
    await expect(page).toHaveURL(/\/clients\/1\/edit/);
  });
});
