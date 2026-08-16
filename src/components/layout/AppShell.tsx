"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  PlusCircle,
  Clock,
  TrendingUp,
  Settings,
  Flame,
  WifiOff,
  RefreshCw,
  User,
  Users,
  ChevronDown,
  Check,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { ReceiptScannerModal } from "@/components/scanner/ReceiptScannerModal";
import { PartnerModal } from "@/components/partner/PartnerModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, partner, activeProfile, switchUser } = useAuth();
  const { syncStatus, syncNow } = useFinance();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
    { name: "Catat", href: "/add", icon: PlusCircle },
    { name: "Riwayat", href: "/history", icon: Clock },
    { name: "Pemasukan", href: "/income", icon: TrendingUp },
    { name: "Pengaturan", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-between selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-200">
      {/* Main Mobile App Container (Max width 440px like modern mobile viewport) */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[var(--background)] shadow-2xl relative border-x border-[var(--border-color)]">
        {/* TOP APP HEADER */}
        <header className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-md px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 group">
              <span className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">
                Fin<span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">Log</span>
              </span>
              <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            </Link>

            {/* Offline / Sync Badge */}
            {!syncStatus.isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <WifiOff className="w-3 h-3" /> Offline
              </span>
            ) : syncStatus.pendingCount > 0 ? (
              <button
                onClick={() => syncNow()}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full hover:bg-blue-500/20 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
                {syncStatus.pendingCount} pending
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Sheets
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Streak Counter Badge */}
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-xs font-semibold shadow-inner">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{user?.streakCount || 1}</span>
            </div>

            {/* User Profile / Partner Switcher */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-full p-1 pl-1.5 pr-2 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xs font-bold text-slate-950">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Ganti Akun (Catat Berdua)
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        switchUser("primary");
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors ${
                        activeProfile === "primary"
                          ? "bg-emerald-500/10 text-emerald-400 font-medium"
                          : "text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>Andri Setiawan (Akun 1)</span>
                      </div>
                      {activeProfile === "primary" && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        switchUser("partner");
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-colors ${
                        activeProfile === "partner"
                          ? "bg-pink-500/10 text-pink-400 font-medium"
                          : "text-slate-300 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                        <span>Fifin (Pasangan ❤️)</span>
                      </div>
                      {activeProfile === "partner" && <Check className="w-3.5 h-3.5 text-pink-400" />}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowPartnerModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/60 rounded-xl transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-pink-400" />
                      <span>Ajak Pasangan Baru</span>
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
        <nav className="fixed bottom-0 w-full max-w-md bg-[var(--background)]/95 backdrop-blur-lg border-t border-[var(--border-color)] px-2 py-2 flex items-center justify-around z-40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-emerald-400 font-semibold scale-105"
                    : "text-slate-400 hover:text-[var(--foreground)]"
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    isActive ? "bg-emerald-500/15" : "hover:bg-slate-800/40"
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
