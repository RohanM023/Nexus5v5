import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/identity/me
 *
 * Returns the authenticated user's master profile with all linked Riot accounts.
 * Requires a valid Supabase session (cookie-based auth).
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to access your profile",
          },
        },
        { status: 401 }
      );
    }

    // Fetch the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "User profile not found",
          },
        },
        { status: 404 }
      );
    }

    // Fetch all linked Riot accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("riot_accounts")
      .select(
        "id, user_id, puuid, game_name, tag_line, region, is_primary, verified, verified_at, linked_at"
      )
      .eq("user_id", user.id)
      .order("linked_at", { ascending: true });

    if (accountsError) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch linked accounts",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: user.email,
        display_name: profile.display_name,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      accounts: accounts ?? [],
      total_accounts: accounts?.length ?? 0,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
