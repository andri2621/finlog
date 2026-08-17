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
  const { expenseCategories, paymentMethods, incomeCategories } = useFinance();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sheetMode, setSheetMode] = useState<"new" | "existing">(inviteSheetId ? "existing" : "new");
  const [sheetName, setSheetName] = useState("FinLog");
  const [existingSheetUrl, setExistingSheetUrl] = useState(inviteSheetId || "");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Editable lists
  const [expList, setExpList] = useState(
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

  const [payList, setPayList] = useState(
    paymentMethods.length > 0
      ? paymentMethods.map((m) => m.name)
      : ["Cash", "Debit Card", "Credit Card", "E-Wallet", "Bank Transfer", "Other"]
  );

  const [incList, setIncList] = useState(
    incomeCategories.length > 0
      ? incomeCategories.map((c) => ({ name: c.name, color: c.color }))
      : [
          { name: "Gaji", color: "#10B981" },
          { name: "Freelance", color: "#8B5CF6" },
          { name: "Lainnya", color: "#64748B" },
        ]
  );

  const [reminderEnabled, setReminderEnabled] = useState(true);

  const handleFinish = async () => {
    setIsCreatingSheet(true);
    setErrorMessage("");

    try {
      let finalId = "finlog_sheet_" + Date.now();
      let finalName = sheetName || "FinLog";

      if (sheetMode === "new") {
        if (accessToken) {
          try {
            // Create the REAL Google Spreadsheet in user's Google Drive
            const created = await createFinLogSpreadsheet(accessToken, finalName);
            finalId = created.spreadsheetId;
          } catch (err: any) {
            console.error("Error creating Google Sheet via API:", err);
            setErrorMessage("Gagal membuat Spreadsheet: Pastikan Google Sheets API dan Google Drive API sudah aktif di Google Cloud Console milikmu.");
            setIsCreatingSheet(false);
            return; // STOP execution, do not redirect
          }
        } else {
          setErrorMessage("Tidak ada akses token Google. Silakan login ulang.");
          setIsCreatingSheet(false);
          return;
        }
      } else if (sheetMode === "existing" && existingSheetUrl.trim()) {
        const match = existingSheetUrl.match(/[-\w]{25,}/);
        finalId = match ? match[0] : existingSheetUrl.trim();
        finalName = "Spreadsheet Terhubung";
      }

      // Clear dummy mock transactions so user starts with fresh real data
      await db.transactions.clear();
      await db.savings.clear();
      await db.budgets.clear();

      await setSpreadsheet(finalId, finalName);
      await updateProfile({
        reminderEnabled,
        reminderTime: "20:00",
      });

      router.push("/");
    } catch (e: any) {
      setErrorMessage(e.message || "Gagal menyiapkan spreadsheet");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  return (
    <div className="p-5 flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] max-w-md mx-auto">
      {/* HEADER MATCHING SCREENSHOT 3 */}
      <div className="flex items-center justify-between pb-4 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            Fin<span className="text-emerald-500">Log</span>
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer touch-manipulation"
        >
          Keluar
        </button>
      </div>

      {/* STEP CONTENT */}
      <div className="flex-1 space-y-4">
        {/* STEP 1: SPREADSHEET (MATCHING SCREENSHOT 3) */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              LANGKAH 1 DARI 4
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hubungkan Google Sheet kamu
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kami akan buat sheet baru di Drive kamu. Data kamu tetap milik kamu — tidak disimpan di server.
            </p>

            {/* TAB SELECTOR: BUAT BARU vs HUBUNGKAN LINK */}
            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSheetMode("new")}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer touch-manipulation ${
                  sheetMode === "new"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Buat Baru
              </button>
              <button
                type="button"
                onClick={() => setSheetMode("existing")}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer touch-manipulation ${
                  sheetMode === "existing"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Gunakan Link Sheet
              </button>
            </div>

            {/* CARD */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              {sheetMode === "new" ? (
                <>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Buat spreadsheet baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    FinLog akan membuat Google Sheet baru di Drive kamu untuk menyimpan pengeluaran & tabungan berdua.
                  </p>

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      NAMA SPREADSHEET (OPSIONAL)
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="FinLog"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Hubungkan spreadsheet yang sudah ada
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tempelkan link atau ID Google Sheet yang sudah pernah dibuat.
                  </p>

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      LINK / ID GOOGLE SPREADSHEET
                    </label>
                    <input
                      type="text"
                      value={existingSheetUrl}
                      onChange={(e) => setExistingSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer touch-manipulation shadow-md"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: KATEGORI PENGELUARAN */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              LANGKAH 2 DARI 4
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Kategori pengeluaran
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bagaimana kamu mengelompokkan pengeluaran? Sesuaikan sesuka hati.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {expList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...expList];
                        next[idx].name = e.target.value;
                        setExpList(next);
                      }}
                      className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setExpList(expList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 p-1 cursor-pointer touch-manipulation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Color dots picker */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const next = [...expList];
                          next[idx].color = c;
                          setExpList(next);
                        }}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer touch-manipulation ${
                          item.color === c ? "scale-125 ring-2 ring-emerald-500" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExpList([...expList, { name: "Kategori Baru", color: "#10B981" }])}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-500 transition-colors cursor-pointer touch-manipulation"
            >
              + Tambah kategori
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs cursor-pointer touch-manipulation"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-2xl text-xs cursor-pointer touch-manipulation"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: METODE PEMBAYARAN */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              LANGKAH 3 DARI 4
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Metode pembayaran
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bagaimana cara kamu membayar? Tambahkan metode yang biasa dipakai.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {payList.map((name, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const next = [...payList];
                      next[idx] = e.target.value;
                      setPayList(next);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setPayList(payList.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPayList([...payList, "Metode Baru"])}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-500 transition-colors cursor-pointer touch-manipulation"
            >
              + Tambah metode
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs cursor-pointer touch-manipulation"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-2xl text-xs cursor-pointer touch-manipulation"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUMBER PEMASUKAN & PENGINGAT */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              LANGKAH 4 DARI 4
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Sumber pemasukan
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Dari mana saja pemasukan kamu? Bisa diubah nanti.
            </p>

            <div className="space-y-2">
              {incList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const next = [...incList];
                      next[idx].name = e.target.value;
                      setIncList(next);
                    }}
                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setIncList(incList.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer touch-manipulation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Pengingat Harian Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 mt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pengingat harian?</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kami bisa kirim notifikasi jam 20:00 supaya kamu nggak lupa catat.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReminderEnabled(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                    reminderEnabled
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  Aktifkan
                </button>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                    !reminderEnabled
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  Nanti saja
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500 font-semibold">{errorMessage}</p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs cursor-pointer touch-manipulation"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isCreatingSheet}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer touch-manipulation flex items-center justify-center gap-2"
              >
                {isCreatingSheet ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    <span>Menyiapkan Akunmu...</span>
                  </>
                ) : (
                  "Selesai"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STEP INDICATORS BARS AT BOTTOM */}
      <div className="pt-6 pb-2 flex items-center justify-center gap-2 select-none">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-300 ${
              step >= s
                ? "w-10 bg-slate-900 dark:bg-white"
                : "w-6 bg-slate-200 dark:bg-slate-800"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
