import { test, expect } from "@playwright/test";

test.describe("Authentication (login page)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows login page with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("validates password minimum length", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
  });

  test("shows Welcome back heading", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Sign in to IRED PropertyOS")).toBeVisible();
  });

  test("shows forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });
});

test.describe("OTP verification page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to login when accessed without userId", async ({ page }) => {
    await page.goto("/verify-otp");
    await expect(page).toHaveURL(/login/);
  });

  test("shows OTP input fields when accessed with userId", async ({ page }) => {
    await page.goto("/verify-otp?userId=test-user-id&email=test@example.com");
    await expect(page.getByText("Verify your identity")).toBeVisible();
    await expect(page.getByText("test@example.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /verify otp/i })).toBeVisible();
  });

  test("has back to login link", async ({ page }) => {
    await page.goto("/verify-otp?userId=test-user-id&email=test@example.com");
    await expect(page.getByRole("link", { name: /back to login/i })).toBeVisible();
  });
});

test.describe("Forgot Password", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("navigates from login to forgot password", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe("Reset Password", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows password fields", async ({ page }) => {
    await page.goto("/reset-password?userId=test-user-id");
    await expect(page.getByRole("button", { name: "Reset Password" })).toBeVisible();
    await expect(page.getByPlaceholder("Min. 8 characters")).toBeVisible();
    await expect(page.getByPlaceholder("Re-enter your password")).toBeVisible();
  });
});
