/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfile } from "../db/types";
import { db } from "../db/db";
import { initializeDatabaseIfEmpty } from "../db/seed";
import { getTodayString } from "../utils";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: UserProfile | null;
  partner: UserProfile | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  onboardingComplete: boolean;
  accessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetName: string;
  inviteCode: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setSpreadsheet: (id: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshGoogleToken: () => Promise<string | null>;
}

const DEFAULT_PRIMARY: UserProfile = {
  id: "user_primary",
  name: "",
  email: "",
  isPartner: false,
  streakCount: 1,
  lastActiveDate: getTodayString(),
  reminderTime: "20:00",
  reminderEnabled: true,
  theme: "dark",
};

/**
 * Check if a spreadsheetId is a real Google Sheets ID (not a placeholder).
 */
function isValidSpreadsheetId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (id.startsWith("finlog_sheet_")) return false;
  if (id.startsWith("ya29.")) return false;
  return id.length >= 20;
}

const TOKEN_STORAGE_KEY = "finlog_google_token";
const KNOWN_ACCOUNTS_KEY = "finlog_known_accounts";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string>("FINLOG");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const supabase = createClient();

  // ─── REFRESH GOOGLE ACCESS TOKEN VIA SERVER ───
  const refreshGoogleToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/google/token");
      if (res.ok) {
        const data = await res.json();
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          localStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify({
              token: data.accessToken,
              expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
            })
          );
          if (data.spreadsheetId && !spreadsheetId) {
            setSpreadsheetId(data.spreadsheetId);
          }
          if (data.spreadsheetName) {
            setSpreadsheetName(data.spreadsheetName);
          }
          return data.accessToken;
        }
      }
    } catch (e) {
      console.warn("Silent Google token refresh:", e);
    }
    return null;
  }, [spreadsheetId]);

  // ─── SAVE TOKEN TO LOCALSTORAGE ───
  const saveToken = useCallback((token: string, expiresInSec: number = 3600) => {
    setAccessToken(token);
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({
        token,
        expiresAt: Date.now() + expiresInSec * 1000,
      })
    );
  }, []);

  // ─── INIT: Load user from IndexedDB & Supabase ───
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabaseIfEmpty();
        const savedUser = await db.user_profile.get("user_primary");

        // 1. Restore local cache
        if (savedUser) {
          setUser(savedUser);
          if (savedUser.spreadsheetId) setSpreadsheetId(savedUser.spreadsheetId);
          if (savedUser.spreadsheetName) setSpreadsheetName(savedUser.spreadsheetName);
        }

        // 2. Check stored token
        const storedTokenInfo = localStorage.getItem(TOKEN_STORAGE_KEY);
        let hasActiveToken = false;
        if (storedTokenInfo) {
          try {
            const { token, expiresAt } = JSON.parse(storedTokenInfo);
            if (Date.now() < expiresAt) {
              setAccessToken(token);
              hasActiveToken = true;
            }
          } catch {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }

        // 3. Supabase Auth sync
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // Initialize fallback user from authUser immediately
          const initialUser: UserProfile = {
            ...DEFAULT_PRIMARY,
            ...(savedUser || {}),
            id: "user_primary",
            name:
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              savedUser?.name ||
              authUser.email?.split("@")[0] ||
              "Pengguna FinLog",
            email: authUser.email || savedUser?.email || "",
            image: authUser.user_metadata?.avatar_url || savedUser?.image,
            spreadsheetId: savedUser?.spreadsheetId || "",
            spreadsheetName: savedUser?.spreadsheetName || "FINLOG",
          };

          setUser(initialUser);

          // Fetch user profile from Supabase safely
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", authUser.id)
              .maybeSingle();

            if (profile) {
              setInviteCode(profile.invite_code || null);
              const activeSheetId = profile.spreadsheet_id || savedUser?.spreadsheetId || "";
              const activeSheetName = profile.spreadsheet_name || savedUser?.spreadsheetName || "FINLOG";

              const updated: UserProfile = {
                ...initialUser,
                name: profile.name || initialUser.name,
                email: profile.email || initialUser.email,
                image: profile.avatar_url || initialUser.image,
                spreadsheetId: activeSheetId,
                spreadsheetName: activeSheetName,
              };

              await db.user_profile.put(updated);
              setUser(updated);
              if (activeSheetId) setSpreadsheetId(activeSheetId);
              if (activeSheetName) setSpreadsheetName(activeSheetName);

              // Fetch partner profile if linked
              if (profile.partner_id) {
                const { data: partnerProfile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", profile.partner_id)
                  .maybeSingle();

                if (partnerProfile) {
                  const partnerObj: UserProfile = {
                    id: "user_partner",
                    name: partnerProfile.name || "Pasangan",
                    email: partnerProfile.email || "",
                    image: partnerProfile.avatar_url,
                    isPartner: true,
                    streakCount: 1,
                    lastActiveDate: getTodayString(),
                    reminderTime: "20:00",
                    reminderEnabled: true,
                    theme: "dark",
                  };
                  await db.user_profile.put(partnerObj);
                  setPartner(partnerObj);
                }
              }
            }
          } catch (profileErr) {
            console.warn("Could not fetch profile from Supabase:", profileErr);
          }

          // If no active token, trigger silent refresh from backend
          if (!hasActiveToken) {
            await refreshGoogleToken();
          }
        } else {
          // If not logged into Supabase, do not mark as authenticated
          const isRealSupabaseConfigured =
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

          if (isRealSupabaseConfigured) {
            setUser(null);
            setPartner(null);
            setSpreadsheetId(null);
          }
        }
      } catch (e) {
        console.error("AuthContext init error:", e);
      } finally {
        setIsLoaded(true);
      }
    }

    init();

    // Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (session.provider_token) {
          saveToken(session.provider_token, session.expires_in || 3600);
        }
        // Sync profile immediately on sign in
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile) {
          const code = "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
          const { data: newProfile } = await supabase
            .from("profiles")
            .upsert(
              {
                id: session.user.id,
                email: session.user.email || "",
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name ||
                  session.user.email?.split("@")[0] ||
                  "Pengguna FinLog",
                avatar_url: session.user.user_metadata?.avatar_url || null,
                invite_code: code,
                onboarding_completed: false,
              },
              { onConflict: "id" }
            )
            .select("*")
            .maybeSingle();
          profile = newProfile;
        }

        if (profile) {
          setInviteCode(profile.invite_code || null);
          const activeSheetId = profile.spreadsheet_id || "";
          const activeSheetName = profile.spreadsheet_name || "FINLOG";

          const updated: UserProfile = {
            ...DEFAULT_PRIMARY,
            id: "user_primary",
            name: profile.name || "Pengguna FinLog",
            email: profile.email || session.user.email || "",
            image: profile.avatar_url,
            spreadsheetId: activeSheetId,
            spreadsheetName: activeSheetName,
          };
          await db.user_profile.put(updated);
          setUser(updated);
          if (activeSheetId) setSpreadsheetId(activeSheetId);
          if (activeSheetName) setSpreadsheetName(activeSheetName);
        }
      } else if (event === "SIGNED_OUT") {
        setAccessToken(null);
        setUser(null);
        setPartner(null);
        setSpreadsheetId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshGoogleToken, saveToken, supabase]);

  // ─── LOGIN WITH GOOGLE ───
  const loginWithGoogle = useCallback(async () => {
    // 1. Try Supabase Google OAuth with offline access for refresh token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          scopes: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file email profile",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
      return;
    }

    // 2. Fallback: Google Identity Services popup
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId && typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      return new Promise<void>((resolve, reject) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              saveToken(tokenResponse.access_token);
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = await res.json();
                const existing = await db.user_profile.get("user_primary");
                const updatedUser: UserProfile = {
                  ...DEFAULT_PRIMARY,
                  ...(existing || {}),
                  name: googleProfile.name || existing?.name || "Pengguna FinLog",
                  email: googleProfile.email || existing?.email || "",
                };
                await db.user_profile.put(updatedUser);
                setUser(updatedUser);
              } catch (e) {
                console.error(e);
              }
              resolve();
            } else {
              reject(new Error("Google Login Cancelled"));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || "Google Login Closed"));
          },
        });
        client.requestAccessToken();
      });
    }

    // Fallback Mock
    const mockToken = "ya29.mock_" + Date.now();
    saveToken(mockToken);
    const existingUser = await db.user_profile.get("user_primary");
    const primary: UserProfile = {
      ...DEFAULT_PRIMARY,
      ...(existingUser || {}),
      name: existingUser?.name || "Andri Setiawan",
      email: existingUser?.email || "andri@gmail.com",
    };
    await db.user_profile.put(primary);
    setUser(primary);
  }, [saveToken, supabase]);

  // ─── LOGOUT ───
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout error:", e);
    }
    setAccessToken(null);
    setUser(null);
    setPartner(null);
    setSpreadsheetId(null);
    setSpreadsheetName("FINLOG");
    setInviteCode(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    try {
      await Promise.all(db.tables.map((table) => table.clear()));
    } catch (e) {
      console.error("Logout DB clear error:", e);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [supabase]);

  // ─── SET SPREADSHEET ───
  const setSpreadsheet = useCallback(
    async (id: string, name: string) => {
      setSpreadsheetId(id || null);
      setSpreadsheetName(name);

      // 1. Update local DB
      const currentUser = await db.user_profile.get("user_primary");
      if (currentUser) {
        const updated = { ...currentUser, spreadsheetId: id, spreadsheetName: name };
        await db.user_profile.put(updated);
        setUser(updated);
      }

      // 2. Update Supabase
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          await supabase
            .from("profiles")
            .update({
              spreadsheet_id: id,
              spreadsheet_name: name,
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", authUser.id);
        }
      } catch (e) {
        console.warn("Supabase profile spreadsheet update:", e);
      }
    },
    [supabase]
  );

  // ─── UPDATE PROFILE ───
  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      const currentUser = await db.user_profile.get("user_primary");
      if (!currentUser) return;
      const updated = { ...currentUser, ...data };
      await db.user_profile.put(updated);
      setUser(updated);

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          await supabase
            .from("profiles")
            .update({
              name: updated.name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", authUser.id);
        }
      } catch (e) {
        console.warn("Supabase profile update:", e);
      }
    },
    [supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        partner,
        isAuthenticated: Boolean(user),
        isLoaded,
        onboardingComplete: isValidSpreadsheetId(spreadsheetId),
        accessToken,
        spreadsheetId,
        spreadsheetName,
        inviteCode,
        loginWithGoogle,
        logout,
        setSpreadsheet,
        updateProfile,
        refreshGoogleToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
