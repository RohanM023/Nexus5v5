import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAccountByRiotId,
  RiotApiError,
  RiotNotFoundError,
} from "@/lib/riot-api";

const MAX_LINKED_ACCOUNTS = 5;

/**
 * POST /api/identity/link
 *
 * Link a Riot account to the authenticated user.
 * Accepts { game_name, tag_line, region }.
 * Resolves the PUUID via Riot Account-v1, then inserts into riot_accounts.
 */
export async function POST(request: Request) {
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
            message: "You must be logged in to link a Riot account",
          },
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { game_name, tag_line, region } = body;

    if (!game_name || !tag_line || !region) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "game_name, tag_line, and region are required",
          },
        },
        { status: 400 }
      );
    }

    if (
      typeof game_name !== "string" ||
      typeof tag_line !== "string" ||
      typeof region !== "string"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "game_name, tag_line, and region must be strings",
          },
        },
        { status: 400 }
      );
    }

    // Validate region is a known platform
    const validRegions = [
      "na1", "br1", "la1", "la2", "oc1", "ph2", "sg2",
      "th2", "tw2", "vn2", "euw1", "eun1", "tr1", "ru", "kr", "jp1",
    ];
    if (!validRegions.includes(region.toLowerCase())) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid region. Must be one of: ${validRegions.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    // Check max linked accounts
    const { count, error: countError } = await supabase
      .from("riot_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to check existing accounts",
          },
        },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= MAX_LINKED_ACCOUNTS) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Maximum of ${MAX_LINKED_ACCOUNTS} linked accounts allowed`,
          },
        },
        { status: 400 }
      );
    }

    // Resolve PUUID from Riot API
    let accountData;
    try {
      accountData = await getAccountByRiotId(
        game_name,
        tag_line,
        region.toLowerCase()
      );
    } catch (error) {
      if (error instanceof RiotNotFoundError) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Riot account not found: ${game_name}#${tag_line}`,
            },
          },
          { status: 404 }
        );
      }
      if (error instanceof RiotApiError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: error.statusCode >= 500 ? 502 : error.statusCode }
        );
      }
      throw error;
    }

    if (!accountData) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Riot account not found: ${game_name}#${tag_line}`,
          },
        },
        { status: 404 }
      );
    }

    const puuid = accountData.puuid;

    // Check if PUUID is already linked (to this user or another)
    const { data: existingAccount, error: existingError } = await supabase
      .from("riot_accounts")
      .select("id, user_id")
      .eq("puuid", puuid)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to check for duplicate accounts",
          },
        },
        { status: 500 }
      );
    }

    if (existingAccount) {
      if (existingAccount.user_id === user.id) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "This Riot account is already linked to your profile",
            },
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "This Riot account is already linked to another user",
          },
        },
        { status: 409 }
      );
    }

    // First linked account becomes primary
    const isPrimary = (count ?? 0) === 0;

    // Insert the riot account
    const { data: newAccount, error: insertError } = await supabase
      .from("riot_accounts")
      .insert({
        user_id: user.id,
        puuid,
        game_name: accountData.gameName,
        tag_line: accountData.tagLine,
        region: region.toLowerCase(),
        is_primary: isPrimary,
        verified: false,
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation on puuid (race condition)
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "This Riot account is already linked",
            },
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to link Riot account",
          },
        },
        { status: 500 }
      );
    }

    // Create an identity_links verification record
    const verificationToken = Math.floor(Math.random() * 28) + 1;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabase.from("identity_links").insert({
      user_id: user.id,
      account_id: newAccount.id,
      verification_status: "pending",
      verification_method: "icon",
      verification_token: verificationToken.toString(),
      expires_at: expiresAt,
    });

    return NextResponse.json(newAccount, { status: 201 });
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
