import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch profile to get stored google_refresh_token
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token, spreadsheet_id, spreadsheet_name, partner_id")
    .eq("id", user.id)
    .single();

  const refreshToken = profile?.google_refresh_token;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (refreshToken && clientId && clientSecret) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        return NextResponse.json({
          accessToken: tokenData.access_token,
          expiresIn: tokenData.expires_in,
          spreadsheetId: profile?.spreadsheet_id,
          spreadsheetName: profile?.spreadsheet_name,
        });
      }
    } catch (e) {
      console.error("Token refresh error:", e);
    }
  }

  return NextResponse.json({
    accessToken: null,
    spreadsheetId: profile?.spreadsheet_id,
    spreadsheetName: profile?.spreadsheet_name,
  });
}
