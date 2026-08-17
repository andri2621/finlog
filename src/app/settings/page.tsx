"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Wallet,
  RefreshCw,
  Bell,
  Gift,
  Tag,
  CreditCard,
  Link2,
  Users,
  FileSpreadsheet,
  Sun,
  Moon,
  Laptop,
  LogOut,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Sparkles,
  RotateCw,
  Smartphone,
  Share2,
  BellRing,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { BudgetModal } from "@/components/budget/BudgetModal";
import { RecurringManagerModal } from "@/components/recurring/RecurringManagerModal";
import { PartnerModal } from "@/components/partner/PartnerModal";
import { CategoryManagerModal } from "@/components/categories/CategoryManagerModal";
import { createClient } from "@/lib/supabase/client";
import {
  sendLocalNotification,
  requestNotificationPermission,
  getNotificationPermission,
} from "@/lib/notification";

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    partner,
    spreadsheetId,
    spreadsheetName,
    inviteCode,
    setSpreadsheet,
    logout,
    loginWithGoogle,
    updateProfile,
  } = useAuth();
  const { recurring, expenseCategories, paymentMethods, incomeCategories, syncStatus, syncNow } = useFinance();
  const { theme, setTheme } = useTheme();

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerModalTab, setPartnerModalTab] = useState<"invite" | "join">("invite");
  const [categoryModalTab, setCategoryModalTab] = useState<"expense_category" | "payment_method" | "income_category" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);
  const [activeCode, setActiveCode] = useState<string>(inviteCode || "");

  const reminderTime = user?.reminderTime || "20:00";
  const reminderActive = user?.reminderEnabled ?? true;

  const supabase = createClient();

  useEffect(() => {
    async function ensureInvite() {
      if (!spreadsheetId) return;
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("invite_code")
            .eq("id", authUser.id)
            .maybeSingle();

          let code = profile?.invite_code;
          if (!code) {
            code = "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
            await supabase.from("profiles").update({ invite_code: code }).eq("id", authUser.id);
          }
          setActiveCode(code);

          await supabase.from("partner_invites").upsert(
            {
              inviter_id: authUser.id,
              invite_code: code,
              spreadsheet_id: spreadsheetId,
              spreadsheet_name: spreadsheetName || "FINLOG",
              status: "active",
            },
            { onConflict: "invite_code" }
          );
        }
      } catch (e) {
        console.warn("Invite link ensure in Settings:", e);
      }
    }
    ensureInvite();
  }, [spreadsheetId, spreadsheetName, supabase]);

  // Disconnect Confirmation State matching Screenshot 2
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const host = typeof window !== "undefined" ? window.location.origin : "https://finlog.app";
  const displayCode = activeCode || inviteCode || (user ? `FIN-${user.id.substring(0, 4).toUpperCase()}` : "FIN-PAIR");
  const inviteLink = `${host}/invite/${displayCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDisconnect = async () => {
    await setSpreadsheet("", "");
    router.push("/onboarding");
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && notifPermission !== "granted") {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }
    await updateProfile({ reminderEnabled: enabled });
  };

  const handleChangeReminderTime = async (time: string) => {
    if (!time) return;
    await updateProfile({ reminderTime: time });
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  };

  const handleSendTestNotification = async () => {
    let perm = getNotificationPermission();
    if (perm !== "granted") {
      perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }

    if (perm !== "granted") {
      return;
    }

    const sent = await sendLocalNotification("FinLog Pengingat Keuangan 🔔", {
      body: `Halo ${user?.name || "Kawan"}! Jangan lupa catat pengeluaran hari ini untuk pertahankan streak 🔥`,
      url: "/add",
    });

    if (sent) {
      setTestNotifSuccess(true);
      setTimeout(() => setTestNotifSuccess(false), 4000);
    }
  };

  const activeRecurringCount = recurring.filter((r) => r.isActive).length;

  return (
    <div className="p-4 space-y-5">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Pengaturan
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Konfigurasi akun, spreadsheet & kolaborasi
        </p>
      </div>

      {/* SECTION: FITUR */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Fitur
        </p>
        <div className="rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBudgetModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Atur Anggaran</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => setShowRecurringModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Otomasi (Tagihan Rutin)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{activeRecurringCount} aktif</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>
      </div>

      {/* SECTION: KATEGORI & SUMBER */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Kategori & Sumber
        </p>
        <div className="rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setCategoryModalTab("expense_category")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Kategori Pengeluaran</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{expenseCategories.length} kategori</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryModalTab("payment_method")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Metode Pembayaran</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{paymentMethods.length} metode</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryModalTab("income_category")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Sumber Pemasukan</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{incomeCategories.length} sumber</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>
      </div>

      {/* SECTION: KOLABORASI (AJAK PASANGAN) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Kolaborasi
        </p>
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-pink-200 dark:border-pink-500/30 shadow-md space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-pink-50 dark:bg-pink-500/15 border border-pink-200 dark:border-pink-500/25 text-pink-500">
                <Heart className="w-5 h-5 fill-pink-500/30" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Kolaborasi Pasangan</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {partner ? `Terhubung dengan ${partner.name} 💕` : "Catat pengeluaran bersama di 1 Google Sheet"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPartnerModalTab("invite");
                setShowPartnerModal(true);
              }}
              className="py-2.5 px-3 bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Ajak Pasangan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPartnerModalTab("join");
                setShowPartnerModal(true);
              }}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Masukkan Kode</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: SPREADSHEET & SYNC (MATCHING SCREENSHOT 1 & 2) */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Spreadsheet & Sync
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Setiap catatan langsung disimpan ke Sheet kamu.
        </p>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-3 mt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Spreadsheet Terhubung</p>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId || "demo"}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>{spreadsheetName || "FINLOG"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline cursor-pointer shrink-0 pt-0.5"
            >
              Putuskan
            </button>
          </div>

          {/* Sync Status & Action Bar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  !syncStatus.isOnline
                    ? "bg-amber-500"
                    : syncStatus.isSyncing
                    ? "bg-emerald-500 animate-ping"
                    : syncStatus.pendingCount > 0
                    ? "bg-blue-500 animate-ping"
                    : "bg-emerald-500"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {!syncStatus.isOnline
                    ? "Perangkat Offline"
                    : syncStatus.isSyncing
                    ? "Sedang menyinkronkan data..."
                    : syncStatus.pendingCount > 0
                    ? `${syncStatus.pendingCount} data pending sinkronisasi`
                    : "Semua data tersinkronisasi"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {syncStatus.isSyncing
                    ? "Mengambil & mengirim data ke Spreadsheet..."
                    : syncStatus.lastSyncedAt
                    ? `Terakhir sinkron: ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                    : "Tersambung ke Google Sheets"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => syncNow()}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
              <span>{syncStatus.isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
            </button>
          </div>

          {/* DISCONNECT CONFIRMATION ALERT (MATCHING SCREENSHOT 2) */}
          {showDisconnectConfirm && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-3 animate-in fade-in duration-200">
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-700 dark:text-red-400">
                  Yakin? Kamu perlu menyiapkan spreadsheet baru.
                </p>
                <p className="text-[11px] text-red-600/90 dark:text-red-400/80">
                  Memutuskan tidak akan menghapus spreadsheet — tetap ada di Google Drive kamu.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmDisconnect}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Ya, putuskan
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: TAMPILAN (THEME) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Tampilan
        </p>
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 flex">
          {[
            { id: "light", label: "Terang", icon: Sun },
            { id: "dark", label: "Gelap", icon: Moon },
            { id: "system", label: "Sistem", icon: Laptop },
          ].map((th) => {
            const IconComp = th.icon;
            const isSel = theme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSel
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{th.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION: PENGINGAT & NOTIFIKASI */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Pengingat & Notifikasi
        </p>
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5">
          {/* Header & Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Pengingat Harian</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notifikasi harian untuk mencatat pengeluaran
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleReminder(!reminderActive)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                reminderActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  reminderActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {reminderActive && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in">
              {/* Jam Pengingat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Waktu Pengingat</span>
                </div>

                <input
                  type="time"
                  value={reminderTime || "20:00"}
                  onChange={(e) => handleChangeReminderTime(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                />
              </div>

              {/* Status Izin & Action Buttons */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Status Izin Notifikasi
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {notifPermission === "granted"
                      ? "✅ Diizinkan di perangkat ini"
                      : notifPermission === "denied"
                      ? "❌ Diblokir browser (Buka setelan browser)"
                      : "⚠️ Belum diizinkan"}
                  </p>
                </div>

                {notifPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="py-1 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                  >
                    Izinkan
                  </button>
                )}
              </div>

              {/* Send Test Notification Button */}
              <button
                type="button"
                onClick={handleSendTestNotification}
                className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {testNotifSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Notifikasi Berhasil Terkirim! 🎉</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>Kirim Test Notifikasi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: APLIKASI & PWA */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Aplikasi & PWA
        </p>
        <Link
          href="/how-to-install"
          className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-md flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                Cara Install ke Layar Utama
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Panduan pasang FinLog di iOS Safari & Android Chrome
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
        </Link>
      </div>

      {/* SECTION: AKUN */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Akun Google
        </p>
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {user?.image || user?.avatarUrl ? (
                <img
                  src={user.image || user.avatarUrl}
                  alt={user.name || "User"}
                  className="w-11 h-11 rounded-full object-cover shrink-0 border border-emerald-500/40 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-sm font-bold text-slate-950 shrink-0">
                  {user?.name?.charAt(0) || "U"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="py-2 px-3 rounded-xl bg-slate-100 border border-red-500 dark:bg-slate-800 hover:bg-red-200 text-red-500 dark:text-slate-300 hover:text-red-500 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-500">Keluar</span>
            </button>
          </div>

          {/* Action: Hubungkan Ulang Akun Google */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Perlu memperbarui izin Google Drive & Sheets?
            </span>
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Hubungkan ulang</span>
            </button>
          </div>
        </div>

        {/* LOGOUT CONFIRMATION ALERT */}
        {showLogoutConfirm && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-3 animate-in fade-in duration-200 mt-2">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Peringatan!
              </p>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/80">
                Logout akan menghapus semua database dari memori perangkat ini demi keamanan. 
                Jika ada catatan yang berstatus <strong>Pending</strong>, data tersebut akan hilang.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tetap Keluar
              </button>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} />
      <RecurringManagerModal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} />
      <PartnerModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        defaultTab={partnerModalTab}
      />
      {categoryModalTab && (
        <CategoryManagerModal
          isOpen={Boolean(categoryModalTab)}
          onClose={() => setCategoryModalTab(null)}
          defaultTab={categoryModalTab}
        />
      )}
    </div>
  );
}
