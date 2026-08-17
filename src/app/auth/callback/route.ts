import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/onboarding";
  const inviteCode = requestUrl.searchParams.get("invite_code");
  const origin = requestUrl.origin;

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Exchange code for session error:", error);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      if (data?.session) {
        const user = data.session.user;
        const providerToken = data.session.provider_token;
        const providerRefreshToken = data.session.provider_refresh_token;

        // Try updating profile safely
        try {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          if (providerRefreshToken) {
            updateData.google_refresh_token = providerRefreshToken;
          }

          if (inviteCode) {
            const { data: invite } = await supabase
              .from("partner_invites")
              .select("*")
              .eq("invite_code", inviteCode)
              .eq("status", "active")
              .single();

            if (invite) {
              updateData.partner_id = invite.inviter_id;
              updateData.spreadsheet_id = invite.spreadsheet_id;
              updateData.spreadsheet_name = invite.spreadsheet_name || "FINLOG";
              updateData.onboarding_completed = true;

              await supabase
                .from("profiles")
                .update({ partner_id: user.id })
                .eq("id", invite.inviter_id);
            }
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from("profiles").update(updateData).eq("id", user.id);
          }
        } catch (dbErr) {
          console.warn("Profile update in callback error (non-fatal):", dbErr);
        }

        const isLocalEnv = origin.includes("localhost") || origin.includes("127.0.0.1");
        const forwardedHost = request.headers.get("x-forwarded-host");
        const redirectUrl = isLocalEnv
          ? `${origin}${next}`
          : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;

        const response = NextResponse.redirect(redirectUrl);

        if (providerToken) {
          response.cookies.set("finlog_temp_google_token", providerToken, {
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
          });
        }

        return response;
      }
    } catch (err: any) {
      console.error("Auth callback unexpected error:", err);
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
