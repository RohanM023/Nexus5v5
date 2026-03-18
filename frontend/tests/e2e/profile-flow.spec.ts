import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mock data aligned with frontend/src/types/index.ts
// ---------------------------------------------------------------------------

const SUPABASE_SESSION = {
  access_token: "mock-sb-access-token",
  refresh_token: "mock-sb-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "sb-user-id",
    email: "test@nexus.dev",
    app_metadata: {},
    user_metadata: { display_name: "TestUser" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  },
};

const MOCK_PROFILE = {
  user: {
    id: "test-user-id",
    email: "test@nexus.dev",
    display_name: "TestUser",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  accounts: [
    {
      id: "acc-1",
      user_id: "test-user-id",
      puuid: "test-puuid-1",
      game_name: "TestPlayer",
      tag_line: "NA1",
      region: "na1",
      is_primary: true,
      verified: true,
      verified_at: "2026-01-15T00:00:00Z",
      linked_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "acc-2",
      user_id: "test-user-id",
      puuid: "test-puuid-2",
      game_name: "AltAccount",
      tag_line: "NA1",
      region: "na1",
      is_primary: false,
      verified: false,
      verified_at: null,
      linked_at: "2026-02-01T00:00:00Z",
    },
  ],
  total_accounts: 2,
};

const MOCK_CHAMPION_POOL = {
  user_id: "test-user-id",
  champions: [
    {
      champion_id: 1,
      champion_name: "Annie",
      games_played: 50,
      wins: 30,
      losses: 20,
      win_rate: 0.6,
      avg_kills: 8.5,
      avg_deaths: 3.2,
      avg_assists: 7.1,
      avg_kda: 4.88,
      avg_cs_per_min: 7.2,
      avg_vision_score: 25,
      true_mastery: 82.5,
      comfort_score: 78.0,
      tier: "S" as const,
    },
    {
      champion_id: 86,
      champion_name: "Garen",
      games_played: 30,
      wins: 15,
      losses: 15,
      win_rate: 0.5,
      avg_kills: 6.0,
      avg_deaths: 4.0,
      avg_assists: 5.0,
      avg_kda: 2.75,
      avg_cs_per_min: 8.0,
      avg_vision_score: 15,
      true_mastery: 65.0,
      comfort_score: 60.0,
      tier: "A" as const,
    },
    {
      champion_id: 99,
      champion_name: "Lux",
      games_played: 20,
      wins: 12,
      losses: 8,
      win_rate: 0.6,
      avg_kills: 5.5,
      avg_deaths: 3.8,
      avg_assists: 10.2,
      avg_kda: 4.13,
      avg_cs_per_min: 6.5,
      avg_vision_score: 35,
      true_mastery: 58.0,
      comfort_score: 55.0,
      tier: "B" as const,
    },
  ],
  total_champions: 3,
};

const MOCK_PERFORMANCE = {
  user_id: "test-user-id",
  total_games: 100,
  total_wins: 57,
  total_losses: 43,
  overall_win_rate: 0.57,
  avg_kills: 7.0,
  avg_deaths: 3.6,
  avg_assists: 7.4,
  avg_kda: 4.0,
  avg_cs_per_min: 7.2,
  avg_vision_score: 25,
  role_distribution: [
    { role: "MID", games: 50, percentage: 0.5 },
    { role: "TOP", games: 30, percentage: 0.3 },
    { role: "SUPPORT", games: 20, percentage: 0.2 },
  ],
  top_champions: [
    { champion_id: 1, champion_name: "Annie", games_played: 50, win_rate: 0.6 },
    { champion_id: 86, champion_name: "Garen", games_played: 30, win_rate: 0.5 },
    { champion_id: 99, champion_name: "Lux", games_played: 20, win_rate: 0.6 },
  ],
};

const MOCK_MATCH_HISTORY = {
  data: [
    {
      match_id: "NA1_12345",
      platform_id: "NA1",
      queue_id: 420,
      game_version: "14.10",
      game_duration: 1845,
      game_start: "2026-03-17T20:00:00Z",
      puuid: "test-puuid-1",
      champion_id: 1,
      champion_name: "Annie",
      team_id: 100,
      role: "MID",
      win: true,
      kills: 10,
      deaths: 2,
      assists: 8,
      cs: 195,
      gold_earned: 14500,
      damage_dealt: 28000,
      damage_taken: 12000,
      vision_score: 30,
    },
    {
      match_id: "NA1_12346",
      platform_id: "NA1",
      queue_id: 420,
      game_version: "14.10",
      game_duration: 2100,
      game_start: "2026-03-17T18:00:00Z",
      puuid: "test-puuid-1",
      champion_id: 86,
      champion_name: "Garen",
      team_id: 200,
      role: "TOP",
      win: false,
      kills: 5,
      deaths: 6,
      assists: 3,
      cs: 210,
      gold_earned: 11800,
      damage_dealt: 22000,
      damage_taken: 25000,
      vision_score: 12,
    },
  ],
  pagination: {
    cursor: null,
    has_more: false,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockSupabaseAuth(page: Page, authenticated: boolean = true) {
  await page.route("**/auth/v1/token**", async (route) => {
    if (authenticated) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SUPABASE_SESSION),
      });
    } else {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({}) });
    }
  });
  await page.route("**/auth/v1/user**", async (route) => {
    if (authenticated) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SUPABASE_SESSION.user),
      });
    } else {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({}) });
    }
  });
  await page.route("**/auth/v1/session**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: authenticated
        ? JSON.stringify(SUPABASE_SESSION)
        : JSON.stringify({ data: { session: null } }),
    });
  });
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SUPABASE_SESSION),
    });
  });
}

async function mockProfileApis(page: Page) {
  await page.route("**/api/identity/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROFILE),
    });
  });
  await page.route("**/api/identity/profile/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROFILE),
    });
  });
  await page.route("**/api/analytics/champion-pool/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CHAMPION_POOL),
    });
  });
  await page.route("**/api/analytics/champion-pool-by-puuid/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CHAMPION_POOL),
    });
  });
  await page.route("**/api/analytics/performance/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PERFORMANCE),
    });
  });
  await page.route("**/api/analytics/performance-by-puuid/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PERFORMANCE),
    });
  });
  await page.route("**/api/identity/link", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-acc-id",
          user_id: "test-user-id",
          puuid: "new-puuid-abc",
          game_name: "NewAlt",
          tag_line: "EUW",
          region: "euw1",
          is_primary: false,
          verified: false,
          verified_at: null,
          linked_at: "2026-03-18T12:00:00Z",
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.route("**/api/identity/link/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 204 });
    } else {
      await route.continue();
    }
  });
  await page.route("**/api/identity/verify/*", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_PROFILE.accounts[1],
          verified: true,
          verified_at: "2026-03-18T12:00:00Z",
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.route("**/api/match/history/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_MATCH_HISTORY),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests — Profile Page
// ---------------------------------------------------------------------------

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, true);
    await mockProfileApis(page);
  });

  test("shows sign-in prompt when not authenticated", async ({ page }) => {
    await mockSupabaseAuth(page, false);

    await page.goto("/profile");

    // ProfilePage renders sign-in prompt for unauthenticated users
    await expect(
      page.getByText("Sign in to view your Master Profile").or(
        page.getByText("Sign In")
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("renders Master Profile heading when authenticated", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByText("Master Profile")).toBeVisible({ timeout: 5000 });
  });

  test("displays user display name and account count", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(1000);

    // Profile shows "{display_name} . {N} linked accounts"
    await expect(page.getByText("TestUser")).toBeVisible();
    await expect(page.getByText(/2 linked accounts/)).toBeVisible();
  });

  test("shows linked accounts section", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(1000);

    await expect(page.getByText("Linked Accounts")).toBeVisible();

    // Account names should appear
    await expect(page.getByText("TestPlayer")).toBeVisible();
    await expect(page.getByText("AltAccount")).toBeVisible();
  });

  test("has Manage Accounts link to settings", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForTimeout(1000);

    const manageLink = page.getByText("Manage Accounts");
    await expect(manageLink).toBeVisible();
    await manageLink.click();
    await expect(page).toHaveURL(/settings/);
  });
});

// ---------------------------------------------------------------------------
// Tests — Settings Page (Account Linking)
// ---------------------------------------------------------------------------

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, true);
    await mockProfileApis(page);
  });

  test("shows sign-in prompt when not authenticated", async ({ page }) => {
    await mockSupabaseAuth(page, false);

    await page.goto("/settings");

    await expect(
      page.getByText("Please sign in to access settings.").or(
        page.getByText("Sign In")
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("renders settings heading and sections", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Manage your account and linked Riot accounts")).toBeVisible();

    // Sections: Account, Link Riot Account, Linked Accounts, Verification Instructions
    await expect(page.getByText("Account").first()).toBeVisible();
    await expect(page.getByText("Link Riot Account")).toBeVisible();
    await expect(page.getByText("Linked Accounts")).toBeVisible();
    await expect(page.getByText("Verification Instructions")).toBeVisible();
  });

  test("account section shows disabled user info", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    // Display Name and Email inputs should be disabled and show user data
    const displayNameInput = page.locator("#display-name");
    await expect(displayNameInput).toBeDisabled();
    await expect(displayNameInput).toHaveValue("TestUser");

    const emailInput = page.locator("#email");
    await expect(emailInput).toBeDisabled();
    await expect(emailInput).toHaveValue("test@nexus.dev");
  });

  test("link riot account form has required fields", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    // The form fields: Game Name, Tag Line, Region select
    await expect(page.locator("#game-name")).toBeVisible();
    await expect(page.locator("#tag-line")).toBeVisible();

    // Region select dropdown with options
    const regionSelect = page.locator("select");
    await expect(regionSelect).toBeVisible();

    // Link Account button
    await expect(page.getByRole("button", { name: /Link Account/i })).toBeVisible();
  });

  test("link account form submits and shows success message", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    // Fill the link account form
    await page.locator("#game-name").fill("NewAlt");
    await page.locator("#tag-line").fill("EUW");

    // Select EUW region
    await page.locator("select").selectOption("euw1");

    // Submit
    await page.getByRole("button", { name: /Link Account/i }).click();

    // Success message should appear
    await expect(
      page.getByText("Account linked successfully").or(
        page.getByText("linked successfully")
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test("linked accounts are displayed with AccountCards", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    // Both accounts from MOCK_PROFILE should appear
    await expect(page.getByText("TestPlayer")).toBeVisible();
    await expect(page.getByText("AltAccount")).toBeVisible();
  });

  test("verification instructions are listed", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    // The verification instructions section has an ordered list
    await expect(
      page.getByText(/Click.*Verify.*next to the account/)
    ).toBeVisible();
    await expect(
      page.getByText(/summoner icon/)
    ).toBeVisible();
  });

  test("region dropdown contains expected options", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(1000);

    const regionSelect = page.locator("select");

    // Check for a subset of region options
    await expect(regionSelect.locator("option[value='na1']")).toHaveText("NA");
    await expect(regionSelect.locator("option[value='euw1']")).toHaveText("EUW");
    await expect(regionSelect.locator("option[value='kr']")).toHaveText("KR");
  });
});

// ---------------------------------------------------------------------------
// Tests — Match History Page
// ---------------------------------------------------------------------------

test.describe("Match History Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAuth(page, true);
    await mockProfileApis(page);
  });

  test("shows sign-in prompt when not authenticated", async ({ page }) => {
    await mockSupabaseAuth(page, false);

    await page.goto("/dashboard/matches");

    await expect(
      page.getByText(/sign in/i).or(page.getByText("Sign In"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("renders match history heading", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    await expect(page.getByText("Match History")).toBeVisible();
  });

  test("shows primary account name in subtitle", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    // The page shows "{game_name}#{tag_line}" for the primary account
    await expect(page.getByText("TestPlayer#NA1")).toBeVisible();
  });

  test("queue filter buttons are rendered", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    await expect(page.getByText("All Queues")).toBeVisible();
    await expect(page.getByText("Ranked Solo")).toBeVisible();
    await expect(page.getByText("Clash")).toBeVisible();
  });

  test("champion search input is present", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    await expect(page.getByPlaceholder("Search champion...")).toBeVisible();
  });

  test("match rows display champion name and KDA", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(2000);

    // The mock data has Annie and Garen matches
    await expect(page.getByText("Annie")).toBeVisible();
    await expect(page.getByText("Garen")).toBeVisible();

    // Win/loss badges
    await expect(page.getByText("Victory")).toBeVisible();
    await expect(page.getByText("Defeat")).toBeVisible();
  });

  test("match rows show role information", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(2000);

    // Roles from mock data
    await expect(page.getByText("MID").first()).toBeVisible();
    await expect(page.getByText("TOP").first()).toBeVisible();
  });

  test("clicking a queue filter button changes selection", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    // Click "Ranked Solo" filter
    await page.getByText("Ranked Solo").click();

    // The button should now have an active style (bg-blue-600)
    const rankedBtn = page.getByText("Ranked Solo");
    await expect(rankedBtn).toHaveClass(/bg-blue-600/);
  });

  test("clear filters button appears when filters are active", async ({ page }) => {
    await page.goto("/dashboard/matches");
    await page.waitForTimeout(1000);

    // Initially no "Clear filters" visible
    await expect(page.getByText("Clear filters")).not.toBeVisible();

    // Activate a filter
    await page.getByText("Ranked Solo").click();

    // "Clear filters" should now appear
    await expect(page.getByText("Clear filters")).toBeVisible();

    // Click it
    await page.getByText("Clear filters").click();

    // Should disappear again
    await expect(page.getByText("Clear filters")).not.toBeVisible();
  });
});
