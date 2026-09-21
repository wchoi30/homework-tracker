import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 1. Extract Access Token from the Authorization header
  const authHeader = req.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing access token. Pass 'Authorization: Bearer <token>' in request headers." },
      { status: 401 }
    );
  }

  // 2. Validate environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Server misconfiguration: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing." },
      { status: 500 }
    );
  }

  try {
    // 3. Initialize OAuth2 client and attach the user's access token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ access_token: accessToken });

    // 4. Initialize Calendar client and retrieve upcoming events
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({
      success: true,
      events: response.data.items ?? [],
    });
  } catch (error: any) {
    console.error("Google Calendar API route error:", error);

    const statusCode = typeof error.code === "number" && error.code >= 400 && error.code < 600
      ? error.code
      : 500;

    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while querying Google Calendar." },
      { status: statusCode }
    );
  }
}
