"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Phone,
  MessageCircle,
  Copy,
  Check,
  Heart,
  Sparkles,
  Key,
  Database,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { BudgetModal } from "@/components/budget/BudgetModal";
import { RecurringManagerModal } from "@/components/recurring/RecurringManagerModal";
import { PartnerModal } from "@/components/partner/PartnerModal";
import { CategoryManagerModal } from "@/components/categories/CategoryManagerModal";

export default function SettingsPage() {
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

  // Custom Real Google Sheet ID state
  const [customSheetId, setCustomSheetId] = useState(spreadsheetId || "");
  const [isEditingSheet, setIsEditingSheet] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const inviteLink = `https://finlog.app/join?sheetId=${spreadsheetId || "demo-finlog-sheet"}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveSheetId = async () => {
    if (customSheetId.trim()) {
      await setSpreadsheet(customSheetId.trim(), "FINLOG-KEUANGAN");
      setIsEditingSheet(false);
    }
  };

  const handleSaveGeminiKey = () => {
    localStorage.setItem("finlog_gemini_api_key", geminiApiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const activeRecurringCount = recurring.filter((r) => r.isActive).length;

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-extrabold text-[var(--foreground)] tracking-tight">
          Pengaturan FinLog
        </h1>
        <p className="text-[11px] text-slate-400">Konfigurasi akun, spreadsheet & kolaborasi</p>
      </div>

      {/* SECTION: FITUR */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Fitur
        </p>
        <div className="rounded-3xl bg-[#0F162A] border border-slate-800 divide-y divide-slate-800/80 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBudgetModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Atur Anggaran</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <Link
            href="/savings"
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-semibold text-white">Atur Tabungan</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </Link>

          <button
            type="button"
            onClick={() => setShowRecurringModal(true)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-white">Otomasi (Tagihan Rutin)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{activeRecurringCount} aktif</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowReminderSettings(!showReminderSettings)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Reminder Harian</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{reminderActive ? reminderTime : "Nonaktif"}</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
        </div>

        {/* Reminder Settings Dropdown */}
        {showReminderSettings && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Aktifkan Reminder</span>
              <button
                type="button"
                onClick={() => setReminderActive(!reminderActive)}
                className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                  reminderActive ? "bg-emerald-500" : "bg-slate-700"
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
              <label className="block text-[11px] text-slate-400 mb-1">Waktu Notifikasi</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION: KATEGORI & SUMBER (CLICKABLE TO MANAGE) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Kategori & Sumber (Klik untuk Kelola)
        </p>
        <div className="rounded-3xl bg-[#0F162A] border border-slate-800 divide-y divide-slate-800/80 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => setCategoryModalTab("expense_category")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white">Kategori Pengeluaran</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>{expenseCategories.length} kategori</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryModalTab("payment_method")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-white">Metode Pembayaran</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>{paymentMethods.length} metode</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryModalTab("income_category")}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Sumber Pemasukan</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>{incomeCategories.length} sumber</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
        </div>
      </div>

      {/* SECTION: KOLABORASI (AJAK PASANGAN) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Kolaborasi Pasangan (Catat Berdua)
        </p>
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1F122B] via-[#0F162A] to-[#0F162A] border border-pink-500/30 shadow-md space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-pink-500/15 border border-pink-500/25 text-pink-400">
              <Heart className="w-5 h-5 fill-pink-500/30" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Ajak Pasangan (Fifin ❤️)</h3>
              <p className="text-[11px] text-slate-400">
                Catat pengeluaran bareng di 1 Google Sheet yang sama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Disalin" : "Salin Link"}</span>
            </button>
          </div>

          <button
            onClick={() => setShowPartnerModal(true)}
            className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1 pt-1"
          >
            <span>Bagikan via WhatsApp / Kelola akun pasangan →</span>
          </button>
        </div>
      </div>

      {/* SECTION: GOOGLE SPREADSHEET & INTEGRATION */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Integrasi Google Sheets & Drive
        </p>
        <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-white">Spreadsheet Terhubung</p>
                <p className="text-[11px] text-emerald-400 font-mono truncate max-w-[200px]">
                  {spreadsheetName || "FINLOG-KEUANGAN"} ({spreadsheetId?.substring(0, 12)}...)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingSheet(!isEditingSheet)}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              {isEditingSheet ? "Batal" : "Ubah ID"}
            </button>
          </div>

          {isEditingSheet && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-[11px] text-slate-400">
                Masukkan ID / Link Google Sheet Asli Anda:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  onClick={handleSaveSheetId}
                  className="px-3 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Simpan
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => loginWithGoogle()}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hubungkan Akun Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: GOOGLE GEMINI AI KEY (100% GRATIS) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Scan Struk AI (Google Gemini Free)
        </p>
        <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-white">Google Gemini API Key (100% Gratis)</p>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Scan struk menggunakan Gemini 1.5 Flash Vision. Gratis 1.500 scan/hari dari Google AI Studio tanpa biaya sepeserpun.
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Masukkan AIzaSy..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <button
              onClick={handleSaveGeminiKey}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs shrink-0"
            >
              {apiKeySaved ? "Tersimpan ✓" : "Simpan Key"}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: TAMPILAN (REAL THEME SWITCHER) */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Tampilan Tema
        </p>
        <div className="p-1 rounded-2xl bg-[#0F162A] border border-slate-800 flex">
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
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  isSel
                    ? "bg-slate-800 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-slate-200"
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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Akun
        </p>
        <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-sm font-bold text-slate-950">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate max-w-[170px]">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center gap-1 transition-colors"
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
