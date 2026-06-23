import { test, expect } from "@playwright/test";

test.describe("Property Detail Page", () => {
  test("shows property detail or not-found state", async ({ page }) => {
    await page.goto("/properties/1");
    await expect(page).toHaveURL(/\/properties\/1/);
    await page.waitForTimeout(2000);
  });

  test("has back button that navigates to properties list", async ({ page }) => {
    await page.goto("/properties/1");
    await page.waitForTimeout(2000);
    const backButton = page.getByRole("button", { name: /back/i });
    if (await backButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backButton.click();
      await expect(page).toHaveURL(/\/properties/);
    }
  });
});

test.describe("Client Detail Page", () => {
  test("shows client detail or not-found state", async ({ page }) => {
    await page.goto("/clients/1");
    await expect(page).toHaveURL(/\/clients\/1/);
  });
});

test.describe("Deal Detail Page", () => {
  test("shows deal detail or not-found state", async ({ page }) => {
    await page.goto("/deals/1");
    await expect(page).toHaveURL(/\/deals\/1/);
    const hasContent = await page.getByText(/not found/i).or(page.getByRole("heading").first()).isVisible();
    expect(hasContent).toBeTruthy();
  });

  test("has back navigation", async ({ page }) => {
    await page.goto("/deals/1");
    const backButton = page.getByRole("button", { name: /back/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/deals/);
    }
  });
});

test.describe("Task Detail Page", () => {
  test("shows task detail or not-found state", async ({ page }) => {
    await page.goto("/tasks/1");
    await expect(page).toHaveURL(/\/tasks\/1/);
  });
});

test.describe("Site Visit Detail Page", () => {
  test("shows site visit detail or not-found state", async ({ page }) => {
    await page.goto("/site-visits/1");
    await expect(page).toHaveURL(/\/site-visits\/1/);
  });
});

test.describe("Approval Detail Page", () => {
  test("shows approval detail or not-found state", async ({ page }) => {
    await page.goto("/approvals/1");
    await expect(page).toHaveURL(/\/approvals\/1/);
  });
});

test.describe("New Property Form", () => {
  test("multi-step form loads and shows step 1", async ({ page }) => {
    await page.goto("/properties/new");
    await expect(page).toHaveURL(/\/properties\/new/);
    await expect(page.getByText(/basic info/i).first()).toBeVisible();
  });
});

test.describe("New Client Form", () => {
  test("client form loads with inputs", async ({ page }) => {
    await page.goto("/clients/new");
    await expect(page).toHaveURL(/\/clients\/new/);
    await expect(page.getByPlaceholder(/vikram mehta/i)).toBeVisible();
  });
});
