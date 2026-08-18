/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { UserProfile } from "../db/types";
import { db } from "../db/db";
import { initializeDatabaseIfEmpty } from "../db/seed";
import { getTodayString } from "../utils";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";

export interface PartnerToast {
  id: string;
  type: "connected" | "disconnected";
  title: string;
  message: string;
  partnerName?: string;
  partnerImage?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  partner: UserProfile | null;
  partnerToast: PartnerToast | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  onboardingComplete: boolean;
  accessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetName: string;
  inviteCode: string | null;
  dismissPartnerToast: () => void;
  showPartnerToast: (toast: Omit<PartnerToast, "id">) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setSpreadsheet: (id: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshGoogleToken: () => Promise<string | null>;
  disconnectPartner: () => Promise<{ success: boolean; isOwner?: boolean; error?: string }>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [partnerToast, setPartnerToast] = useState<PartnerToast | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string>("FINLOG");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const supabase = createClient();

  const showPartnerToast = useCallback((toast: Omit<PartnerToast, "id">) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    const id = Date.now().toString();
    setPartnerToast({ ...toast, id });

    if (toast.type === "connected") {
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.3 },
          colors: ["#EC4899", "#10B981", "#3B82F6"],
        });
      } catch {}
    }

    toastTimeoutRef.current = setTimeout(() => {
      setPartnerToast(null);
    }, 5000);
  }, []);

  const dismissPartnerToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setPartnerToast(null);
  }, []);

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

  // ─── HELPER: Fetch and sync partner profile ───
  const syncPartnerProfile = useCallback(
    async (partnerId: string | null | undefined, currentUserId?: string) => {
      let resolvedPartnerId = partnerId;

      // Reverse lookup self-healing: If current user doesn't have partner_id set,
      // check if any other user in profiles has partner_id set to currentUserId
      if (!resolvedPartnerId && currentUserId) {
        try {
          const { data: revPartner } = await supabase
            .from("profiles")
            .select("id, name, email, avatar_url")
            .eq("partner_id", currentUserId)
            .maybeSingle();

          if (revPartner) {
            resolvedPartnerId = revPartner.id;
            await supabase
              .from("profiles")
              .update({ partner_id: revPartner.id })
              .eq("id", currentUserId);
          }
        } catch (e) {
          console.warn("Reverse partner self-healing check:", e);
        }
      }

      if (!resolvedPartnerId) {
        setPartner(null);
        await db.user_profile.delete("user_partner").catch(() => {});
        return;
      }

      try {
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", resolvedPartnerId)
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
        } else {
          setPartner(null);
          await db.user_profile.delete("user_partner").catch(() => {});
        }
      } catch (err) {
        console.warn("Error fetching partner profile:", err);
      }
    },
    [supabase]
  );

  // ─── INIT: Load user from IndexedDB & Supabase ───
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabaseIfEmpty();
        const savedUser = await db.user_profile.get("user_primary");
        const savedPartner = await db.user_profile.get("user_partner");

        // 1. Restore local cache from IndexedDB
        if (savedUser && (savedUser.name || savedUser.email || savedUser.spreadsheetId)) {
          setUser(savedUser);
          if (savedUser.spreadsheetId) setSpreadsheetId(savedUser.spreadsheetId);
          if (savedUser.spreadsheetName) setSpreadsheetName(savedUser.spreadsheetName);
        }
        if (savedPartner) {
          setPartner(savedPartner);
        }

        // 2. Check stored Google token
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

        // 3. Supabase Auth sync (safe for offline-first)
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData?.session;

          const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

          if (isOnline) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            const authUser = userData?.user;

            if (authUser) {
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
                let { data: profile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", authUser.id)
                  .maybeSingle();

                if (!profile) {
                  const code = "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
                  const newProf = {
                    id: authUser.id,
                    email: authUser.email || "",
                    name:
                      authUser.user_metadata?.full_name ||
                      authUser.user_metadata?.name ||
                      authUser.email?.split("@")[0] ||
                      "Pengguna FinLog",
                    avatar_url: authUser.user_metadata?.avatar_url || null,
                    invite_code: code,
                    spreadsheet_id: savedUser?.spreadsheetId || null,
                    spreadsheet_name: savedUser?.spreadsheetName || "FINLOG",
                    onboarding_completed: Boolean(
                      savedUser?.spreadsheetId && isValidSpreadsheetId(savedUser.spreadsheetId)
                    ),
                    updated_at: new Date().toISOString(),
                  };
                  const { data: createdProf } = await supabase
                    .from("profiles")
                    .upsert(newProf, { onConflict: "id" })
                    .select("*")
                    .maybeSingle();
                  profile = createdProf || (newProf as any);
                }

                // If profile has no spreadsheet_id, check for pending invite stored before OAuth redirect
                if (!profile?.spreadsheet_id && typeof window !== "undefined") {
                  try {
                    const pendingCode = localStorage.getItem("finlog_pending_invite");
                    if (pendingCode) {
                      const cleanPending = pendingCode.trim().toUpperCase();
                      const { data: rpcRes, error: rpcErr } = await supabase.rpc("accept_partner_invite", {
                        p_invite_code: cleanPending,
                      });

                      if (!rpcErr && rpcRes && rpcRes.success) {
                        localStorage.removeItem("finlog_pending_invite");
                        const { data: refetched } = await supabase
                          .from("profiles")
                          .select("*")
                          .eq("id", authUser.id)
                          .maybeSingle();

                        if (refetched) {
                          profile = refetched;
                        }
                      }
                    }
                  } catch (e) {
                    console.warn("Pending invite auto-resolve error:", e);
                  }
                }

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

                  // Sync partner profile (with reverse lookup self-healing)
                  await syncPartnerProfile(profile.partner_id, authUser.id);
                }
              } catch (profileErr) {
                console.warn("Could not fetch/upsert profile from Supabase:", profileErr);
              }

              // If no active token, trigger silent refresh from backend
              if (!hasActiveToken) {
                await refreshGoogleToken();
              }
            } else if (!userError && !session && (!savedUser || (!savedUser.name && !savedUser.email))) {
              setUser(null);
              setPartner(null);
              setSpreadsheetId(null);
            }
          } else {
            if (!savedUser || (!savedUser.name && !savedUser.email)) {
              if (session?.user) {
                const offlineUser: UserProfile = {
                  ...DEFAULT_PRIMARY,
                  id: "user_primary",
                  name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Pengguna FinLog",
                  email: session.user.email || "",
                  image: session.user.user_metadata?.avatar_url,
                };
                setUser(offlineUser);
                await db.user_profile.put(offlineUser);
              }
            }
          }
        } catch (supabaseErr) {
          console.warn("Supabase auth check fallback to offline cache:", supabaseErr);
        }
      } catch (e) {
        console.error("AuthContext init error:", e);
      } finally {
        setIsLoaded(true);
      }
    }

    init();

    // ─── PROACTIVE AUTO-REFRESH GOOGLE TOKEN & FOCUS SYNC ───
    const checkAndRefreshToken = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) {
        await refreshGoogleToken();
        return;
      }
      try {
        const { expiresAt } = JSON.parse(stored);
        if (Date.now() >= expiresAt - 10 * 60 * 1000) {
          await refreshGoogleToken();
        }
      } catch {
        await refreshGoogleToken();
      }
    };

    const checkRemoteProfileState = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          if (prof) {
            // If remote profile has no spreadsheet/partner anymore (disconnected remotely)
            if (!prof.partner_id && !prof.spreadsheet_id) {
              const localUser = await db.user_profile.get("user_primary");
              if (localUser?.spreadsheetId) {
                setPartner(null);
                setSpreadsheetId(null);
                await db.user_profile.delete("user_partner").catch(() => {});
                await db.transactions.clear().catch(() => {});
                await db.savings.clear().catch(() => {});
                await db.budgets.clear().catch(() => {});

                const updated = { ...localUser, spreadsheetId: "", spreadsheetName: "FINLOG" };
                await db.user_profile.put(updated);
                setUser(updated);

                if (typeof window !== "undefined" && window.location.pathname !== "/onboarding") {
                  window.location.href = "/onboarding";
                }
              }
            } else {
              if (prof.spreadsheet_id) setSpreadsheetId(prof.spreadsheet_id);
              if (prof.spreadsheet_name) setSpreadsheetName(prof.spreadsheet_name);
              await syncPartnerProfile(prof.partner_id, authUser.id);
            }
          }
        }
      } catch (e) {
        console.warn("Focus profile check error:", e);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndRefreshToken();
        checkRemoteProfileState();
      }
    };

    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);

    // ─── REALTIME PROFILE SUBSCRIPTION (INSTANT REMOTE CONNECT & DISCONNECT) ───
    const profileChannel = supabase
      .channel("profiles_realtime_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        async (payload: any) => {
          const updatedRow = payload.new;
          if (!updatedRow) return;

          const {
            data: { user: currentAuthUser },
          } = await supabase.auth.getUser();

          if (currentAuthUser) {
            // Case 1: My own profile was modified in Supabase (e.g. partner accepted my invite, or disconnected me)
            if (updatedRow.id === currentAuthUser.id) {
              if (!updatedRow.partner_id && !updatedRow.spreadsheet_id) {
                // User was disconnected by partner!
                setPartner(null);
                setSpreadsheetId(null);
                await db.user_profile.delete("user_partner").catch(() => {});
                await db.transactions.clear().catch(() => {});
                await db.savings.clear().catch(() => {});
                await db.budgets.clear().catch(() => {});

                const localUser = await db.user_profile.get("user_primary");
                if (localUser) {
                  const updated = { ...localUser, spreadsheetId: "", spreadsheetName: "FINLOG" };
                  await db.user_profile.put(updated);
                  setUser(updated);
                }

                showPartnerToast({
                  type: "disconnected",
                  title: "Hubungan Diputuskan",
                  message: "Sambungan spreadsheet bersama pasangan telah diputuskan.",
                });

                if (typeof window !== "undefined" && window.location.pathname !== "/onboarding") {
                  setTimeout(() => {
                    window.location.href = "/onboarding";
                  }, 1500);
                }
              } else {
                if (updatedRow.spreadsheet_id) setSpreadsheetId(updatedRow.spreadsheet_id);
                if (updatedRow.spreadsheet_name) setSpreadsheetName(updatedRow.spreadsheet_name);
                await syncPartnerProfile(updatedRow.partner_id, currentAuthUser.id);

                if (updatedRow.partner_id) {
                  try {
                    const { data: partnerRow } = await supabase
                      .from("profiles")
                      .select("name, avatar_url")
                      .eq("id", updatedRow.partner_id)
                      .maybeSingle();

                    const pName = partnerRow?.name || "Pasangan Anda";
                    showPartnerToast({
                      type: "connected",
                      title: "Pasangan Terhubung! 💕",
                      message: `${pName} baru saja bergabung. Sekarang kalian mencatat keuangan bersama!`,
                      partnerName: pName,
                      partnerImage: partnerRow?.avatar_url,
                    });
                  } catch {}
                }
              }
            }
            // Case 2: Another user just linked to me (partner_id = my ID)
            else if (updatedRow.partner_id === currentAuthUser.id) {
              await syncPartnerProfile(updatedRow.id, currentAuthUser.id);

              try {
                const { data: partnerRow } = await supabase
                  .from("profiles")
                  .select("name, avatar_url")
                  .eq("id", updatedRow.id)
                  .maybeSingle();

                const pName = partnerRow?.name || "Pasangan Anda";
                showPartnerToast({
                  type: "connected",
                  title: "Pasangan Terhubung! 💕",
                  message: `${pName} baru saja bergabung. Sekarang kalian mencatat keuangan bersama!`,
                  partnerName: pName,
                  partnerImage: partnerRow?.avatar_url,
                });
              } catch {}
            }
          }
        }
      )
      .subscribe();

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

          await syncPartnerProfile(profile.partner_id, session.user.id);
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
      supabase.removeChannel(profileChannel);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [refreshGoogleToken, saveToken, supabase, syncPartnerProfile]);

  // ─── LOGIN WITH GOOGLE ───
  const loginWithGoogle = useCallback(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const { error } = await supabase.auth.signInWithOAuth({
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

      // 2. Update Supabase profile and ensure partner_invites is updated
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .update({
              spreadsheet_id: id,
              spreadsheet_name: name,
              onboarding_completed: Boolean(id),
              updated_at: new Date().toISOString(),
            })
            .eq("id", authUser.id)
            .select("invite_code")
            .single();

          // Also upsert to partner_invites if spreadsheet is valid
          if (id && isValidSpreadsheetId(id)) {
            let code = profile?.invite_code || inviteCode;
            if (!code) {
              code = "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
              await supabase.from("profiles").update({ invite_code: code }).eq("id", authUser.id);
              setInviteCode(code);
            }

            await supabase.from("partner_invites").upsert(
              {
                inviter_id: authUser.id,
                invite_code: code,
                spreadsheet_id: id,
                spreadsheet_name: name || "FINLOG",
                status: "active",
              },
              { onConflict: "invite_code" }
            );
          }
        }
      } catch (e) {
        console.warn("Supabase profile spreadsheet update:", e);
      }
    },
    [inviteCode, supabase]
  );

  // ─── DISCONNECT PARTNER ───
  const disconnectPartner = useCallback(async (): Promise<{
    success: boolean;
    isOwner?: boolean;
    error?: string;
  }> => {
    try {
      // 1. Try RPC disconnect_partner
      const { data: rpcData, error: rpcErr } = await supabase.rpc("disconnect_partner");

      let isOwner = true;
      if (!rpcErr && rpcData) {
        if (!rpcData.success) {
          return { success: false, error: rpcData.error || "Gagal memutuskan hubungan." };
        }
        isOwner = Boolean(rpcData.is_owner);
      } else {
        // Fallback: manually unlink in Supabase
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: currentProf } = await supabase
            .from("profiles")
            .select("partner_id, spreadsheet_id")
            .eq("id", authUser.id)
            .single();

          if (currentProf?.partner_id) {
            // Check if current user is owner
            const { data: inviteRec } = await supabase
              .from("partner_invites")
              .select("inviter_id")
              .eq("inviter_id", authUser.id)
              .maybeSingle();

            isOwner = Boolean(inviteRec);

            if (isOwner) {
              await supabase.from("profiles").update({ partner_id: null }).eq("id", authUser.id);
            } else {
              await supabase
                .from("profiles")
                .update({ partner_id: null, spreadsheet_id: null, onboarding_completed: false })
                .eq("id", authUser.id);
            }
          }
        }
      }

      // 2. Update local state
      setPartner(null);
      await db.user_profile.delete("user_partner").catch(() => {});

      if (!isOwner) {
        // Current user was the Partner: reset spreadsheet and local finance cache
        setSpreadsheetId(null);
        const cur = await db.user_profile.get("user_primary");
        if (cur) {
          const resetUser = { ...cur, spreadsheetId: "", spreadsheetName: "FINLOG" };
          await db.user_profile.put(resetUser);
          setUser(resetUser);
        }
        await db.transactions.clear().catch(() => {});
        await db.savings.clear().catch(() => {});
        await db.budgets.clear().catch(() => {});
        if (typeof window !== "undefined") {
          window.location.href = "/onboarding";
        }
      }

      return { success: true, isOwner };
    } catch (err: any) {
      console.error("Disconnect partner error:", err);
      return { success: false, error: err?.message || "Terjadi kesalahan." };
    }
  }, [supabase]);

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
        partnerToast,
        dismissPartnerToast,
        showPartnerToast,
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
        disconnectPartner,
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
