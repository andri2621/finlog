"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  PlusCircle,
  Clock,
  Wallet,
  Settings,
  WifiOff,
  RefreshCw,
  User,
  Users,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { ReceiptScannerModal } from "@/components/scanner/ReceiptScannerModal";
import { PartnerModal } from "@/components/partner/PartnerModal";
import { useRouter } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, partner, isLoaded, accessToken, loginWithGoogle, onboardingComplete, logout } = useAuth();
  const { syncStatus, syncNow } = useFinance();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Auth Guard logic
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/auth/");
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isAuthenticated && !isPublicPage) {
      // Not logged in, not on a protected page → go to login
      router.replace("/login");
    } else if (isAuthenticated && pathname === "/login") {
      // Logged in but on login → always go home
      router.replace("/");
    } else if (isAuthenticated && !onboardingComplete && !isPublicPage) {
      // Logged in but no spreadsheet connected, and trying to access app pages → force to onboarding
      router.replace("/onboarding");
    } else if (isAuthenticated && onboardingComplete && pathname === "/onboarding") {
      // Onboarding done, still on onboarding page → go home
      router.replace("/");
    }
  }, [isLoaded, isAuthenticated, onboardingComplete, isPublicPage, pathname, router]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Main navigation with Laporan as primary dashboard (/)
  const navItems = [
    { name: "Laporan", href: "/", icon: BarChart3 },
    { name: "Riwayat", href: "/history", icon: Clock },
    { name: "Catat", href: "/add", icon: PlusCircle },
    { name: "Tabungan", href: "/savings", icon: Wallet },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only show app shell (header, FAB, bottom nav) when authenticated and not in welcome/onboarding
  const isAppShellActive = isAuthenticated && !isPublicPage;

  if (!isAppShellActive) {
    // Prevent flashing protected content before redirect completes
    if (!isAuthenticated && !isPublicPage) {
      return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    // Prevent flashing welcome page if user is already authenticated
    if (isAuthenticated && pathname === "/welcome") {
      return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-start transition-colors duration-200">
        <div className="w-full max-w-md min-h-screen flex flex-col bg-[var(--background)] shadow-2xl relative border-x border-[var(--border-color)] z-0">
          <main className="flex-1 relative z-10">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-between selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-200">
      {/* Main Mobile App Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[var(--background)] shadow-2xl relative border-x border-[var(--border-color)]">
        
        {/* Token Expiry Banner */}
        {!accessToken && isAuthenticated && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between z-50">
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Sesi Google berakhir. Sinkronisasi terjeda.
              </p>
            </div>
            <button
              onClick={() => loginWithGoogle().catch(() => {})}
              className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-full hover:bg-amber-500/30 transition-colors"
            >
              Hubungkan Ulang
            </button>
          </div>
        )}

        {/* TOP APP HEADER */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-[var(--background)]/90 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 group cursor-pointer touch-manipulation">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Fin<span className="text-emerald-500 group-hover:text-emerald-400 transition-colors">Log</span>
              </span>
            </Link>

            {/* Offline / Sync Badge */}
            {!syncStatus.isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            ) : syncStatus.pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => syncNow()}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full hover:bg-blue-500/25 active:scale-95 transition-all cursor-pointer touch-manipulation shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping shrink-0" />
                <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
                <span>{syncStatus.pendingCount} pending</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Sheets
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* User Profile / Partner Switcher */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-full p-1 pl-1.5 pr-2 transition-all cursor-pointer touch-manipulation"
              >
                {user?.image || user?.avatarUrl ? (
                  <img
                    src={user.image || user.avatarUrl}
                    alt={user.name || "User"}
                    className="w-6 h-6 rounded-full object-cover shadow-sm border border-emerald-500/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-slate-950">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                    {user?.image || user?.avatarUrl ? (
                      <img
                        src={user.image || user.avatarUrl}
                        alt={user.name || "User"}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-emerald-500/40 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-sm font-bold text-slate-950 shrink-0">
                        {user?.name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="py-2">
                    <div className="px-3 py-1 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{user?.name || "Akun Saya"}</span>
                    </div>

                    {partner && (
                      <div className="px-3 py-1 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 mt-1">
                        {partner.image || partner.avatarUrl ? (
                          <img
                            src={partner.image || partner.avatarUrl}
                            alt={partner.name || "Partner"}
                            className="w-4 h-4 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                        )}
                        <span className="truncate">Bersama: {partner.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowPartnerModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer touch-manipulation"
                    >
                      <Users className="w-3.5 h-3.5 text-pink-500" />
                      <span>Ajak Pasangan Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer touch-manipulation font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Keluar dari Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

        {/* FLOATING ACTION BUTTON (SCAN STRUK) */}
        <ReceiptScannerModal />

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/95 dark:bg-[var(--background)]/95 backdrop-blur-lg border-t border-slate-200 dark:border-[var(--border-color)] px-2 py-2 flex items-center justify-around z-40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 cursor-pointer touch-manipulation select-none active:scale-95 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 font-bold scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? "bg-emerald-50 dark:bg-emerald-500/15" : "hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* PARTNER MODAL */}
        <PartnerModal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} />
      </div>
    </div>
  );
}
