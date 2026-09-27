import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured on the server yet." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Your session is no longer valid." }, { status: 401 });
  }

  // Remove the app's per-user workspace before removing the auth identity.
  // The service-role client bypasses normal RLS policies for this one-time
  // account deletion operation.
  const { error: workspaceError } = await admin
    .from("user_data")
    .delete()
    .eq("user_id", user.id);

  if (workspaceError) {
    return NextResponse.json(
      { error: workspaceError.message || "Could not remove saved account data." },
      { status: 500 }
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || "Could not delete the account." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
