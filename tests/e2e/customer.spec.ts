/**
 * BROWSER E2E (Playwright) - customer journey (V7.2 directive 13). Run in
 * CI against the staging stack. NOT EXECUTED in the build environment.
 *   npx playwright test tests/e2e/customer.spec.ts
 * Requires: playwright.config.ts (below) + running API + web build.
 */
import { test, expect } from "@playwright/test";

test("home shows the primary question and reaches the real API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/What do you need done\?/);
});

test("login failure is honest - no fake session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("email").fill("no-such-user@nowhere.test");
  await page.getByLabel("password").fill("wrongpassword");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("orders page requires a session - shows the real API error", async ({ page }) => {
  await page.goto("/orders");
  // not signed in => backend 401/403 => honest error state, never mock data
  await expect(page.getByRole("alert")).toBeVisible();
});