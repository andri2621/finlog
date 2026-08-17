"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { BudgetModal } from "@/components/budget/BudgetModal";
import { RecurringManagerModal } from "@/components/recurring/RecurringManagerModal";
import { PartnerModal } from "@/components/partner/PartnerModal";
import { CategoryManagerModal } from "@/components/categories/CategoryManagerModal";

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    spreadsheetId,
    spreadsheetName,
    setSpreadsheet,
    logout,
    loginWithGoogle,
  } = useAuth();
  const { recurring, expenseCategories, paymentMethods, incomeCategories } = useFinance();
  const { theme, setTheme } = useTheme();

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState<"expense_category" | "payment_method" | "income_category" | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [reminderActive, setReminderActive] = useState(true);
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  // Disconnect Confirmation State matching Screenshot 2
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const host = typeof window !== "undefined" ? window.location.origin : "https://finlog.app";
  const inviteLink = `${host}/onboarding?sheetId=${spreadsheetId || "demo-finlog-sheet"}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDisconnect = async () => {
    await setSpreadsheet("", "");
    router.push("/onboarding");
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

          <Link
            href="/savings"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Atur Tabungan</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>

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

          <button
            type="button"
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Reminder Harian</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{reminderActive ? reminderTime : "Nonaktif"}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* Reminder Settings Dropdown */}
        {showReminderSettings && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">Aktifkan Reminder</span>
              <button
                type="button"
                onClick={() => setReminderActive(!reminderActive)}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  reminderActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    reminderActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Waktu Notifikasi</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}
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
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-pink-50 dark:bg-pink-500/15 border border-pink-200 dark:border-pink-500/25 text-pink-500">
              <Heart className="w-5 h-5 fill-pink-500/30" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Ajak Pasangan</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Catat pengeluaran bareng — bagi link undangan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Disalin" : "Salin Link"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPartnerModal(true)}
            className="text-xs font-semibold text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1 pt-1 cursor-pointer"
          >
            <span>Bagikan via WhatsApp / Kelola pasangan →</span>
          </button>
        </div>
      </div>

      {/* SECTION: SPREADSHEET & SYNC (MATCHING SCREENSHOT 1 & 2) */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Spreadsheet & Sync
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Setiap catatan langsung disimpan ke Sheet kamu via OAuth.
        </p>

        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-3 mt-2">
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

          {/* Actions: Hubungkan Ulang & Putuskan */}
          <div className="flex items-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Hubungkan ulang</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
            >
              Putuskan
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

      {/* SECTION: AKUN */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Akun
        </p>
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-sm font-bold text-slate-950">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/welcome");
            }}
            className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-red-500 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <BudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} />
      <RecurringManagerModal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} />
      <PartnerModal isOpen={showPartnerModal} onClose={() => setShowPartnerModal(false)} />
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
