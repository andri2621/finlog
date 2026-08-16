"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "../db/types";
import { db } from "../db/db";
import { initializeDatabaseIfEmpty } from "../db/seed";
import { getTodayString } from "../utils";

interface AuthContextType {
  user: UserProfile | null;
  partner: UserProfile | null;
  activeProfile: "primary" | "partner";
  isConnectedToSheets: boolean;
  accessToken: string | null;
  spreadsheetId: string | null;
  spreadsheetName: string;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  switchUser: (type: "primary" | "partner") => void;
  setSpreadsheet: (id: string, name: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const PRIMARY_USER: UserProfile = {
  id: "user_primary",
  name: "Andri Setiawan",
  email: "andri.setiawan996@gmail.com",
  isPartner: false,
  streakCount: 1,
  lastActiveDate: getTodayString(),
  spreadsheetName: "TES-DUITLOG",
  reminderTime: "20:00",
  reminderEnabled: true,
  theme: "dark",
};

const PARTNER_USER: UserProfile = {
  id: "user_partner",
  name: "Pasangan Andri ❤️",
  email: "pasangan.andri@gmail.com",
  isPartner: true,
  streakCount: 1,
  lastActiveDate: getTodayString(),
  spreadsheetName: "TES-DUITLOG",
  reminderTime: "20:00",
  reminderEnabled: true,
  theme: "dark",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(PRIMARY_USER);
  const [partner] = useState<UserProfile | null>(PARTNER_USER);
  const [activeProfile, setActiveProfile] = useState<"primary" | "partner">("primary");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>("1a2b3c4d5e_demo_sheet_id");
  const [spreadsheetName, setSpreadsheetName] = useState<string>("TES-DUITLOG");

  useEffect(() => {
    async function init() {
      await initializeDatabaseIfEmpty();
      const savedUser = await db.user_profile.get("user_primary");
      if (savedUser) {
        setUser(savedUser);
        if (savedUser.spreadsheetId) setSpreadsheetId(savedUser.spreadsheetId);
        if (savedUser.spreadsheetName) setSpreadsheetName(savedUser.spreadsheetName);
      }
    }
    init();
  }, []);

  const loginWithGoogle = async () => {
    // In production, this can trigger NextAuth or Google OAuth GIS popup
    // For seamless local dev and offline use, simulate authenticated session
    const mockToken = "ya29.mock_google_oauth_token_" + Date.now();
    setAccessToken(mockToken);
    if (user) {
      const updated = { ...user, spreadsheetId: spreadsheetId || "1a2b3c4d5e_demo_sheet_id" };
      await db.user_profile.put(updated);
      setUser(updated);
    }
  };

  const logout = () => {
    setAccessToken(null);
  };

  const switchUser = (type: "primary" | "partner") => {
    setActiveProfile(type);
  };

  const setSpreadsheet = async (id: string, name: string) => {
    setSpreadsheetId(id);
    setSpreadsheetName(name);
    if (user) {
      const updated = { ...user, spreadsheetId: id, spreadsheetName: name };
      await db.user_profile.put(updated);
      setUser(updated);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    await db.user_profile.put(updated);
    setUser(updated);
  };

  const activeUser = activeProfile === "primary" ? user : partner;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        partner,
        activeProfile,
        isConnectedToSheets: Boolean(spreadsheetId),
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
