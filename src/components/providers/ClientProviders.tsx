"use client";

import React from "react";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { AuthProvider } from "@/lib/context/AuthContext";
import { FinanceProvider } from "@/lib/context/FinanceContext";
import { AppShell } from "@/components/layout/AppShell";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <AppShell>{children}</AppShell>
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
