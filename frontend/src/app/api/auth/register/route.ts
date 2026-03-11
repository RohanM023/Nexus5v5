import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;

    // Validate required fields
    if (!email || !password || !display_name) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Email, password, and display_name are required",
          },
        },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof display_name !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Email, password, and display_name must be strings",
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 8 characters",
          },
        },
        { status: 400 }
      );
    }

    if (display_name.length < 2) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Display name must be at least 2 characters",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name,
        },
      },
    });

    if (error) {
      const status = error.status ?? 400;
      return NextResponse.json(
        {
          error: {
            code: "AUTH_ERROR",
            message: error.message,
          },
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
      },
      { status: 200 }
    );
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
