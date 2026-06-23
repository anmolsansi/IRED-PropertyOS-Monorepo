import { test, expect } from "@playwright/test";

test.describe("Clients", () => {
  test("clients page loads", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/clients/);
  });

  test("can open client create form", async ({ page }) => {
    await page.goto("/clients/new");
    await expect(page).toHaveURL(/\/clients\/new/);
  });

  test("can fill and submit client form", async ({ page }) => {
    await page.goto("/clients/new");
    await page.getByPlaceholder("e.g. Vikram Mehta").fill("Test Client");
    await page.getByPlaceholder("e.g. vikram@example.com").fill("test@client.com");
    await page.getByPlaceholder("e.g. +91 98765 43210").fill("+91 98765 43210");
    await page.getByRole("button", { name: /create client/i }).click();
    await page.waitForURL(/\/clients\//, { timeout: 10_000 });
  });

  test("shows client detail page", async ({ page }) => {
    await page.goto("/clients/1");
    await expect(page).toHaveURL(/\/clients\/1/);
  });
});

test.describe("Tasks (create dialog)", () => {
  test("opens create dialog and validates on empty submit", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: /add task/i }).click();
    await expect(page.getByRole("heading", { name: "Create Task" })).toBeVisible();
    await page.getByRole("button", { name: /create task/i }).click();
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("can fill and submit task dialog", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: /add task/i }).click();
    await page.getByPlaceholder("e.g. Follow up with client").fill("Test task");
    await page.getByPlaceholder("Optional details").fill("Description");
    await page.locator("#task-due").fill("2026-12-01");
    await page.getByRole("button", { name: /create task/i }).last().click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Site Visits (create dialog)", () => {
  test("opens create dialog and validates on empty submit", async ({ page }) => {
    await page.goto("/site-visits");
    await page.getByRole("button", { name: /schedule visit/i }).click();
    await expect(page.getByRole("heading", { name: "Schedule Site Visit" })).toBeVisible();
    await page.getByRole("button", { name: /^schedule$/i }).click();
    await expect(page.getByText(/Scheduled date\/time is required/i)).toBeVisible();
  });
});

test.describe("Follow-ups (create dialog)", () => {
  test("opens create dialog and validates on empty submit", async ({ page }) => {
    await page.goto("/follow-ups");
    await page.getByRole("button", { name: /add follow-up/i }).click();
    await expect(page.getByRole("heading", { name: "Create Follow-up" })).toBeVisible();
    await page.getByRole("button", { name: /create follow-up/i }).click();
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });
});

test.describe("Requirements", () => {
  test("requirements page loads", async ({ page }) => {
    await page.goto("/requirements");
    await expect(page).toHaveURL(/\/requirements/);
  });
});

test.describe("Proposals", () => {
  test("proposals page loads", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page).toHaveURL(/\/proposals/);
  });
});

test.describe("Deals", () => {
  test("deals page loads", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/deals/);
  });
});
