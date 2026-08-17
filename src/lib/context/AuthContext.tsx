/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfile } from "../db/types";
import { db } from "../db/db";
import { initializeDatabaseIfEmpty } from "../db/seed";
import { getTodayString } from "../utils";

interface AuthContextType {
  user: UserProfile | null;
  partner: UserProfile | null;
  activeProfile: "primary" | "partner";
  isAuthenticated: boolean;
  isLoaded: boolean;
  onboardingComplete: boolean;
  accessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetName: string;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  switchUser: (type: "primary" | "partner") => void;
  setSpreadsheet: (id: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
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
 * Google Sheets IDs are typically 44-char alphanumeric strings.
 */
function isValidSpreadsheetId(id: string | null | undefined): boolean {
  if (!id) return false;
  if (id.startsWith("finlog_sheet_")) return false;
  if (id.startsWith("ya29.")) return false;
  return id.length >= 20;
}

const TOKEN_STORAGE_KEY = "finlog_google_token";
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [activeProfile, setActiveProfile] = useState<"primary" | "partner">("primary");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string>("FINLOG");
  const [isLoaded, setIsLoaded] = useState(false);

  // â”€â”€â”€ INIT: Load user from IndexedDB + restore token from localStorage â”€â”€â”€
  useEffect(() => {
    async function init() {
      try {
        await initializeDatabaseIfEmpty();
        const savedUser = await db.user_profile.get("user_primary");

        // Restore access token from localStorage
        const storedTokenInfo = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedTokenInfo) {
          try {
            const { token, expiresAt } = JSON.parse(storedTokenInfo);
            if (Date.now() < expiresAt) {
              setAccessToken(token);
            } else {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
            }
          } catch {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
        }

        // Load user profile from DB
        if (savedUser) {
          setUser(savedUser);
          if (savedUser.spreadsheetId) {
            setSpreadsheetId(savedUser.spreadsheetId);
          }
          if (savedUser.spreadsheetName) {
            setSpreadsheetName(savedUser.spreadsheetName);
          }
        }
      } catch (e) {
        console.error("AuthContext init error:", e);
      } finally {
        setIsLoaded(true);
      }
    }
    init();
  }, []);

  // â”€â”€â”€ SAVE TOKEN to localStorage â”€â”€â”€
  const saveToken = useCallback((token: string) => {
    setAccessToken(token);
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      token,
      expiresAt: Date.now() + TOKEN_LIFETIME_MS,
    }));
  }, []);

  // â”€â”€â”€ LOGIN WITH GOOGLE â”€â”€â”€
  const loginWithGoogle = useCallback(async () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (googleClientId && typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      return new Promise<void>((resolve, reject) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              saveToken(tokenResponse.access_token);

              // Fetch Google user info
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const googleProfile = await res.json();

                // Merge with existing profile (preserve spreadsheetId if already set)
                const existingUser = await db.user_profile.get("user_primary");
                const updatedUser: UserProfile = {
                  ...DEFAULT_PRIMARY,
                  ...(existingUser || {}),
                  name: googleProfile.name || existingUser?.name || "",
                  email: googleProfile.email || existingUser?.email || "",
                };
                await db.user_profile.put(updatedUser);
                setUser(updatedUser);
                if (updatedUser.spreadsheetId) {
                  setSpreadsheetId(updatedUser.spreadsheetId);
                }
                if (updatedUser.spreadsheetName) {
                  setSpreadsheetName(updatedUser.spreadsheetName);
                }
              } catch {
                // If Google userinfo fails, still create a minimal profile
                const existingUser = await db.user_profile.get("user_primary");
                if (!existingUser) {
                  const minimal: UserProfile = {
                    ...DEFAULT_PRIMARY,
                    name: "Pengguna FinLog",
                    email: "",
                  };
                  await db.user_profile.put(minimal);
                  setUser(minimal);
                } else {
                  setUser(existingUser);
                  if (existingUser.spreadsheetId) setSpreadsheetId(existingUser.spreadsheetId);
                }
              }
              resolve();
            } else {
              reject(new Error("Google Login Cancelled"));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || "Google Login Closed or Failed"));
          },
        });
        client.requestAccessToken();
      });
    }

    // Fallback: mock login for local dev without Google Client ID
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
    if (primary.spreadsheetId) setSpreadsheetId(primary.spreadsheetId);
  }, [saveToken]);

  // â”€â”€â”€ LOGOUT â”€â”€â”€
  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setSpreadsheetId(null);
    setSpreadsheetName("FINLOG");
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    try {
      await db.user_profile.delete("user_primary");
    } catch (e) {
      console.error("Logout DB error:", e);
    }
  }, []);

  // â”€â”€â”€ SET SPREADSHEET (called from onboarding) â”€â”€â”€
  const setSpreadsheet = useCallback(async (id: string, name: string) => {
    setSpreadsheetId(id || null);
    setSpreadsheetName(name);
    const currentUser = await db.user_profile.get("user_primary");
    if (currentUser) {
      const updated = { ...currentUser, spreadsheetId: id, spreadsheetName: name };
      await db.user_profile.put(updated);
      setUser(updated);
    }
  }, []);

  // â”€â”€â”€ SWITCH USER (primary / partner) â”€â”€â”€
  const switchUser = useCallback((type: "primary" | "partner") => {
    setActiveProfile(type);
  }, []);

  // â”€â”€â”€ UPDATE PROFILE â”€â”€â”€
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const currentUser = await db.user_profile.get("user_primary");
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    await db.user_profile.put(updated);
    setUser(updated);
  }, []);

  const activeUser = activeProfile === "primary" ? user : partner;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        partner,
        activeProfile,
        isAuthenticated: Boolean(user),
        isLoaded,
        onboardingComplete: isValidSpreadsheetId(spreadsheetId),
        accessToken,
        spreadsheetId,
        spreadsheetName,
        loginWithGoogle,
        logout,
        switchUser,
        setSpreadsheet,
        updateProfile,
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

