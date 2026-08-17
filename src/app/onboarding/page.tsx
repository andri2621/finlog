"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Bell,
  FileSpreadsheet,
  ArrowLeft,
  Sparkles,
  Link2,
  Zap,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { createFinLogSpreadsheet } from "@/lib/google/sheets";
import { db } from "@/lib/db/db";

const COLOR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E",
  "#10B981", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#64748B"
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteSheetId = searchParams.get("sheetId");
  const { setSpreadsheet, updateProfile, logout, accessToken } = useAuth();
  const { expenseCategories, paymentMethods, incomeCategories, syncNow } = useFinance();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sheetMode, setSheetMode] = useState<"new" | "existing">(inviteSheetId ? "existing" : "new");
  const [sheetName, setSheetName] = useState("FinLog");
  const [existingSheetUrl, setExistingSheetUrl] = useState(inviteSheetId || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Editable lists for new sheet creation
  const [expList, setExpList] = useState<{ name: string; color: string }[]>(
    expenseCategories.length > 0
      ? expenseCategories.map((c) => ({ name: c.name, color: c.color }))
      : [
          { name: "Makanan", color: "#F59E0B" },
          { name: "Transportasi", color: "#3B82F6" },
          { name: "Tagihan", color: "#A855F7" },
          { name: "Kesehatan", color: "#EF4444" },
          { name: "Hiburan", color: "#EC4899" },
          { name: "Belanja", color: "#6366F1" },
        ]
  );
  const [newExpName, setNewExpName] = useState("");
  const [newExpColor, setNewExpColor] = useState("#10B981");

  const [payList, setPayList] = useState<{ name: string; color: string }[]>(
    paymentMethods.length > 0
      ? paymentMethods.map((m, idx) => ({ name: m.name, color: m.color || COLOR_PALETTE[idx % COLOR_PALETTE.length] }))
      : [
          { name: "Cash", color: "#EF4444" },
          { name: "Debit Card", color: "#F97316" },
          { name: "Credit Card", color: "#F59E0B" },
          { name: "E-Wallet", color: "#EAB308" },
          { name: "Bank Transfer", color: "#22C55E" },
          { name: "Other", color: "#10B981" },
        ]
  );
  const [newPayName, setNewPayName] = useState("");
  const [newPayColor, setNewPayColor] = useState("#3B82F6");

  const [incList, setIncList] = useState<{ name: string; color: string }[]>(
    incomeCategories.length > 0
      ? incomeCategories.map((c) => ({ name: c.name, color: c.color }))
      : [
          { name: "Gaji", color: "#10B981" },
          { name: "Freelance", color: "#8B5CF6" },
          { name: "Lainnya", color: "#64748B" },
        ]
  );
  const [newIncName, setNewIncName] = useState("");
  const [newIncColor, setNewIncColor] = useState("#3B82F6");

  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState("20:00");

  // ─── ADD HANDLERS WITH DUPLICATE CHECKS ───
  const handleAddExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newExpName.trim();
    if (!trimmed) return;

    if (expList.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Kategori pengeluaran "${trimmed}" sudah ada!`);
      return;
    }

    setErrorMessage("");
    setExpList((prev) => [...prev, { name: trimmed, color: newExpColor }]);
    setNewExpName("");
    const nextIdx = (COLOR_PALETTE.indexOf(newExpColor) + 1) % COLOR_PALETTE.length;
    setNewExpColor(COLOR_PALETTE[nextIdx]);
  };

  const handleAddPayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPayName.trim();
    if (!trimmed) return;

    if (payList.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Metode pembayaran "${trimmed}" sudah ada!`);
      return;
    }

    setErrorMessage("");
    setPayList((prev) => [...prev, { name: trimmed, color: newPayColor }]);
    setNewPayName("");
    const nextIdx = (COLOR_PALETTE.indexOf(newPayColor) + 1) % COLOR_PALETTE.length;
    setNewPayColor(COLOR_PALETTE[nextIdx]);
  };

  const handleAddIncome = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newIncName.trim();
    if (!trimmed) return;

    if (incList.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Sumber pemasukan "${trimmed}" sudah ada!`);
      return;
    }

    setErrorMessage("");
    setIncList((prev) => [...prev, { name: trimmed, color: newIncColor }]);
    setNewIncName("");
    const nextIdx = (COLOR_PALETTE.indexOf(newIncColor) + 1) % COLOR_PALETTE.length;
    setNewIncColor(COLOR_PALETTE[nextIdx]);
  };

  // ─── INSTANT CONNECT FOR EXISTING SPREADSHEET (NO WIZARD) ───
  const handleConnectExisting = async () => {
    if (!existingSheetUrl.trim()) {
      setErrorMessage("Masukkan link atau ID Google Spreadsheet.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const match = existingSheetUrl.match(/[-\w]{25,}/);
      const finalId = match ? match[0] : existingSheetUrl.trim();
      const finalName = "Spreadsheet Terhubung";

      // Clear local mock data so fresh real data from sheet will populate
      await db.transactions.clear();
      await db.savings.clear();
      await db.budgets.clear();

      await setSpreadsheet(finalId, finalName);
      await updateProfile({
        reminderEnabled,
        reminderTime,
      });

      // Trigger initial pull from the existing spreadsheet
      await syncNow().catch(() => {});

      router.replace("/");
    } catch (e: any) {
      setErrorMessage(e.message || "Gagal menghubungkan spreadsheet.");
      setIsProcessing(false);
    }
  };

  // ─── FINISH CREATING NEW SPREADSHEET ───
  const handleFinishNew = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      let finalId = "finlog_sheet_" + Date.now();
      const finalName = sheetName || "FinLog";

      // Prepare categories & payment methods to seed
      const categoriesToAdd = [
        ...expList.map((c, idx) => ({
          id: "cat_exp_" + (idx + 1),
          name: c.name,
          color: c.color,
          type: "expense_category" as const,
          order: idx + 1,
        })),
        ...incList.map((c, idx) => ({
          id: "cat_inc_" + (idx + 1),
          name: c.name,
          color: c.color,
          type: "income_category" as const,
          order: idx + 1,
        })),
        ...payList.map((p, idx) => ({
          id: "cat_pay_" + (idx + 1),
          name: p.name,
          color: p.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
          type: "payment_method" as const,
          order: idx + 1,
        })),
      ];

      if (accessToken) {
        try {
          const created = await createFinLogSpreadsheet(accessToken, finalName, categoriesToAdd);
          finalId = created.spreadsheetId;
        } catch (err: any) {
          console.error("Error creating Google Sheet via API:", err);
          setErrorMessage(
            "Gagal membuat Spreadsheet: Pastikan Google Sheets API dan Google Drive API sudah aktif di Google Cloud Console milikmu."
          );
          setIsProcessing(false);
          return;
        }
      }

      await db.transactions.clear();
      await db.savings.clear();
      await db.budgets.clear();

      // Seed categories & payment methods in db.categories
      await db.categories.clear();
      await db.categories.bulkAdd(categoriesToAdd);

      await setSpreadsheet(finalId, finalName);
      await updateProfile({
        reminderEnabled,
        reminderTime,
      });

      router.replace("/");
    } catch (e: any) {
      setErrorMessage(e.message || "Gagal menyiapkan spreadsheet.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Fin<span className="text-emerald-500">Log</span>
            <span className="text-slate-400 dark:text-slate-500 font-semibold text-base ml-1.5">— Setup</span>
          </span>
        </div>

        {/* Step Indicator (Only shown if creating new sheet) */}
        {sheetMode === "new" ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-emerald-500" : i < step ? "w-3 bg-emerald-700" : "w-3 bg-slate-800"
                }`}
              />
            ))}
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            Hubungkan Sheet
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-2">
        {/* STEP 1: SPREADSHEET SETUP */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Hubungkan Google Spreadsheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Semua data tersimpan otomatis di Google Drive Anda secara real-time.
              </p>
            </div>

            {/* Mode Selection Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setSheetMode("new");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sheetMode === "new"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Buat Sheet Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setSheetMode("existing");
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sheetMode === "existing"
                    ? "bg-emerald-500 text-slate-950 shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Gunakan yang Ada
              </button>
            </div>

            {/* MODE: NEW */}
            {sheetMode === "new" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Spreadsheet:
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Contoh: FinLog Keluarga"
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Otomatis Dibuatkan 6 Tab Standar</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sistem akan otomatis membuat tab: Transaksi, Anggaran, Tabungan, Riwayat Tabungan, Otomasi Tagihan, dan Konfigurasi.
                  </p>
                </div>
              </div>
            )}

            {/* MODE: EXISTING */}
            {sheetMode === "existing" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Link atau ID Google Spreadsheet:
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 shadow-sm">
                    <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={existingSheetUrl}
                      onChange={(e) => setExistingSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-500 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Sinkronisasi Instan Tanpa Wizard</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kategori, metode pembayaran, anggaran, dan seluruh riwayat transaksi akan otomatis ditarik dari spreadsheet tersebut.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EXPENSE CATEGORIES (Only for New Sheet) */}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Kategori Pengeluaran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sesuaikan kategori yang sering Anda gunakan.
              </p>
            </div>

            {/* ADD CATEGORY INPUT */}
            <form onSubmit={handleAddExpense} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
              <div className="relative flex items-center pl-2">
                <input
                  type="color"
                  value={newExpColor}
                  onChange={(e) => setNewExpColor(e.target.value)}
                  className="w-5 h-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                />
              </div>
              <input
                type="text"
                value={newExpName}
                onChange={(e) => {
                  setErrorMessage("");
                  setNewExpName(e.target.value);
                }}
                placeholder="Tambah kategori baru..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newExpName.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {expList.map((cat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                  </div>
                  {expList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setExpList((l) => l.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT METHODS (Only for New Sheet) */}
        {step === 3 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Metode Pembayaran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilihan dompet/rekening saat mencatat transaksi.
              </p>
            </div>

            {/* ADD PAYMENT METHOD INPUT WITH COLOR PICKER */}
            <form onSubmit={handleAddPayment} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
              <div className="relative flex items-center pl-2">
                <input
                  type="color"
                  value={newPayColor}
                  onChange={(e) => setNewPayColor(e.target.value)}
                  className="w-5 h-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                />
              </div>
              <input
                type="text"
                value={newPayName}
                onChange={(e) => {
                  setErrorMessage("");
                  setNewPayName(e.target.value);
                }}
                placeholder="Tambah dompet/metode (cth: GoPay, BCA)..."
                className="flex-1 bg-transparent px-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newPayName.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {payList.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {p.name}
                    </span>
                  </div>
                  {payList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPayList((l) => l.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: INCOME CATEGORIES & REMINDER (Only for New Sheet) */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Sumber Pemasukan & Pengingat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tahap terakhir sebelum mulai mencatat.
              </p>
            </div>

            {/* ADD INCOME CATEGORY INPUT */}
            <form onSubmit={handleAddIncome} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
              <div className="relative flex items-center pl-2">
                <input
                  type="color"
                  value={newIncColor}
                  onChange={(e) => setNewIncColor(e.target.value)}
                  className="w-5 h-5 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                />
              </div>
              <input
                type="text"
                value={newIncName}
                onChange={(e) => {
                  setErrorMessage("");
                  setNewIncName(e.target.value);
                }}
                placeholder="Tambah sumber pemasukan..."
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 font-medium focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newIncName.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
              {incList.map((cat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                  </div>
                  {incList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIncList((l) => l.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* REMINDER CARD WITH BEAUTIFUL EMERALD SWITCH */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Pengingat Harian</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {reminderEnabled ? `Ingatkan catat setiap jam ${reminderTime}` : "Pengingat dinonaktifkan"}
                    </p>
                  </div>
                </div>

                {/* Explicit Emerald Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderEnabled}
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer flex items-center shrink-0 ${
                    reminderEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      reminderEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {reminderEnabled && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Pilih Jam Pengingat:</span>
                  </div>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="pt-4 space-y-2">
        {sheetMode === "existing" && step === 1 ? (
          <button
            type="button"
            onClick={handleConnectExisting}
            disabled={isProcessing}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            {isProcessing ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Hubungkan & Sinkronkan Data</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setStep((s) => (s - 1) as any);
                }}
                className="py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setStep((s) => (s + 1) as any);
                }}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Lanjut: {step === 1 ? "Atur Kategori" : step === 2 ? "Metode Pembayaran" : "Sumber Pemasukan"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishNew}
                disabled={isProcessing}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Selesai & Mulai Mencatat</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="w-full py-2.5 text-center text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
        >
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}
