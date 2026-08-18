import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const origin = requestUrl.origin;

  const cookieStore = await cookies();
  const cookieInviteCode = cookieStore.get("finlog_pending_invite")?.value;
  const inviteCode = requestUrl.searchParams.get("invite_code") || cookieInviteCode;

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

        const userMeta = user.user_metadata || {};
        const fullName =
          userMeta.full_name ||
          userMeta.name ||
          user.email?.split("@")[0] ||
          "Pengguna FinLog";
        const avatarUrl = userMeta.avatar_url || null;
        const userEmail = user.email || "";

        try {
          // 1. Check existing profile if any
          const { data: existingProf } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const userInviteCode =
            existingProf?.invite_code ||
            "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();

          let targetPartnerId: string | null = existingProf?.partner_id || null;
          let targetSpreadsheetId: string | null = existingProf?.spreadsheet_id || null;
          let targetSpreadsheetName: string = existingProf?.spreadsheet_name || "FINLOG";
          let isOnboardingDone: boolean = Boolean(existingProf?.onboarding_completed);

          // 2. If inviteCode is present, process partner linking
          if (inviteCode) {
            const cleanCode = inviteCode.trim().toUpperCase();

            // Try RPC accept_partner_invite (SECURITY DEFINER)
            const { data: rpcRes, error: rpcErr } = await supabase.rpc(
              "accept_partner_invite",
              { p_invite_code: cleanCode }
            );

            if (!rpcErr && rpcRes && rpcRes.success) {
              targetPartnerId = rpcRes.inviter_id;
              targetSpreadsheetId = rpcRes.spreadsheet_id;
              targetSpreadsheetName = rpcRes.spreadsheet_name || "FINLOG";
              isOnboardingDone = true;
            } else {
              console.warn(
                "accept_partner_invite RPC fallback:",
                rpcErr?.message || rpcRes?.error
              );

              // Fallback: search profiles or partner_invites table
              let inviterId: string | null = null;
              let sheetId: string | null = null;
              let sheetName: string = "FINLOG";

              const { data: profInv } = await supabase
                .from("profiles")
                .select("id, spreadsheet_id, spreadsheet_name")
                .eq("invite_code", cleanCode)
                .maybeSingle();

              if (profInv?.spreadsheet_id && profInv.id !== user.id) {
                inviterId = profInv.id;
                sheetId = profInv.spreadsheet_id;
                sheetName = profInv.spreadsheet_name || "FINLOG";
              } else {
                const { data: invFromTable } = await supabase
                  .from("partner_invites")
                  .select("inviter_id, spreadsheet_id, spreadsheet_name")
                  .eq("invite_code", cleanCode)
                  .eq("status", "active")
                  .maybeSingle();

                if (invFromTable?.spreadsheet_id && invFromTable.inviter_id !== user.id) {
                  inviterId = invFromTable.inviter_id;
                  sheetId = invFromTable.spreadsheet_id;
                  sheetName = invFromTable.spreadsheet_name || "FINLOG";
                }
              }

              if (inviterId && sheetId) {
                targetPartnerId = inviterId;
                targetSpreadsheetId = sheetId;
                targetSpreadsheetName = sheetName;
                isOnboardingDone = true;
              }
            }
          }

          // 3. ALWAYS UPSERT to guarantee profile row exists with latest auth metadata!
          const profilePayload: Record<string, any> = {
            id: user.id,
            email: userEmail,
            name: fullName,
            avatar_url: avatarUrl,
            invite_code: userInviteCode,
            partner_id: targetPartnerId,
            spreadsheet_id: targetSpreadsheetId,
            spreadsheet_name: targetSpreadsheetName,
            onboarding_completed: isOnboardingDone,
            updated_at: new Date().toISOString(),
          };

          if (providerRefreshToken) {
            profilePayload.google_refresh_token = providerRefreshToken;
          }

          await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

          // 4. AUTOMATICALLY GRANT GOOGLE DRIVE SHARE PERMISSION (100% Automatic, Zero Manual Work)
          if (targetPartnerId && targetSpreadsheetId) {
            try {
              const { data: inviterProf } = await supabase
                .from("profiles")
                .select("google_refresh_token")
                .eq("id", targetPartnerId)
                .maybeSingle();

              const inviterRefreshToken = inviterProf?.google_refresh_token;
              const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
              const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

              if (inviterRefreshToken && clientId && clientSecret) {
                const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: inviterRefreshToken,
                    grant_type: "refresh_token",
                  }),
                });

                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json();
                  const ownerAccessToken = tokenData.access_token;

                  if (ownerAccessToken) {
                    await fetch(
                      `https://www.googleapis.com/drive/v3/files/${targetSpreadsheetId}/permissions`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${ownerAccessToken}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          role: "writer",
                          type: "anyone",
                        }),
                      }
                    );
                  }
                }
              }
            } catch (permErr) {
              console.warn("Auto-grant Google Drive permissions error (non-fatal):", permErr);
            }
          }
        } catch (dbErr) {
          console.error("Profile upsert in callback error:", dbErr);
        }

        const isLocalEnv = origin.includes("localhost") || origin.includes("127.0.0.1");
        const forwardedHost = request.headers.get("x-forwarded-host");
        const redirectUrl = isLocalEnv
          ? `${origin}${next}`
          : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;

        const response = NextResponse.redirect(redirectUrl);

        if (cookieInviteCode) {
          response.cookies.delete("finlog_pending_invite");
        }

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
