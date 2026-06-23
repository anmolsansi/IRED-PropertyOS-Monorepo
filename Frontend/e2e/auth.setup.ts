import { test as setup } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const authFile = "e2e/.auth/user.json";

const API_URL = process.env.API_URL || "http://localhost:4000/api/v1";
const TEST_EMAIL = process.env.E2E_EMAIL || "test@ired.com";
const TEST_PASSWORD = process.env.E2E_PASSWORD || "Test123!";

setup("authenticate via test-login", async ({ request }) => {
  await mkdir(dirname(authFile), { recursive: true });

  const res = await request.post(`${API_URL}/auth/test-login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });

  if (!res.ok()) {
    throw new Error(
      `Test login failed (${res.status()}): ${await res.text()}`
    );
  }

  const { accessToken, refreshToken, user } = await res.json();

  await writeFile(
    authFile,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: "http://localhost:3100",
            localStorage: [
              { name: "access_token", value: accessToken },
              { name: "refresh_token", value: refreshToken },
              { name: "auth-user", value: JSON.stringify(user) },
            ],
          },
        ],
      },
      null,
      2
    )
  );
});
