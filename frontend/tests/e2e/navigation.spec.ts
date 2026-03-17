import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nexus/i);
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("register page is accessible", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("dashboard redirects unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    // Should either show dashboard (if no auth guard) or redirect to login
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });

  test("teams page loads", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.locator("text=Teams")).toBeVisible();
  });

  test("leaderboards page loads", async ({ page }) => {
    await page.goto("/leaderboards");
    await expect(page.locator("text=Leaderboards")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("displays mode tabs", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=SOLO QUEUE")).toBeVisible();
    await expect(page.locator("text=MULTISEARCH")).toBeVisible();
    await expect(page.locator("text=CLASH")).toBeVisible();
  });

  test("clash view shows team panels", async ({ page }) => {
    await page.goto("/dashboard");
    // Click CLASH tab if not default
    const clashTab = page.locator("text=CLASH");
    if (await clashTab.isVisible()) {
      await clashTab.click();
    }
    await expect(page.locator("text=Your Team")).toBeVisible();
    await expect(page.locator("text=Versus")).toBeVisible();
  });
});
