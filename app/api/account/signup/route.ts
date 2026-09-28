import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const findExistingUserByEmail = async (
  admin: SupabaseClient<any>,
  email: string
) => {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data: { users },
      error,
    } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) throw error;

    const match = users.find(
      (user) => normalizeEmail(user.email) === email
    );
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Use at least 6 characters for your password." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Account signup is not configured on the server. Check the Supabase environment variables and redeploy.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check Auth directly before attempting signup. This catches confirmed,
    // unconfirmed, and OAuth-created accounts alike.
    const existingUser = await findExistingUserByEmail(admin, email);
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Please sign in instead of creating a new account.",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Use the normal public signup flow so Supabase keeps its configured email
    // confirmation behavior. The pre-check above prevents duplicate emails.
    const publicClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await publicClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      // Handle the tiny race where another signup happens after our pre-check.
      const latestExistingUser = await findExistingUserByEmail(admin, email).catch(
        () => null
      );
      if (latestExistingUser) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please sign in instead of creating a new account.",
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to sign up." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        user: data.user,
        session: data.session,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected signup error.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
