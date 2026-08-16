"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Bell,
  FileSpreadsheet,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { db } from "@/lib/db/db";

const COLOR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E",
  "#10B981", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#64748B"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setSpreadsheet, updateProfile } = useAuth();
  const { expenseCategories, paymentMethods, incomeCategories } = useFinance();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sheetName, setSheetName] = useState("TES-DUITLOG");

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
    await setSpreadsheet("duitlog_sheet_" + Date.now(), sheetName || "TES-DUITLOG");
    await updateProfile({
      reminderEnabled,
      reminderTime: "20:00",
    });
    router.push("/");
  };

  return (
    <div className="p-5 flex flex-col min-h-screen bg-[#0A0F1D]">
      {/* ONBOARDING STEPPER HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold text-white">
            Duit<span className="text-emerald-400">Log</span>
          </span>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-xs font-semibold text-slate-400 hover:text-white"
        >
          Lewati
        </button>
      </div>

      {/* STEP NUMBERS */}
      <div className="flex items-center justify-between mb-8 px-2">
        {[
          { num: 1, label: "Spreadsheet" },
          { num: 2, label: "Kategori" },
          { num: 3, label: "Metode" },
          { num: 4, label: "Pemasukan" },
        ].map((s, idx) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? "bg-white text-slate-950 font-extrabold"
                      : isCurrent
                      ? "bg-slate-800 text-white border-2 border-emerald-400 font-extrabold"
                      : "bg-slate-900 text-slate-500 border border-slate-800"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <span className="text-[10px] font-medium text-slate-400">{s.label}</span>
              </div>
              {idx < 3 && <div className="flex-1 h-[1px] bg-slate-800 mx-2 -mt-4" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP CONTENTS */}
      <div className="flex-1">
        {/* STEP 1: SPREADSHEET */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-white">Buat spreadsheet baru</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              DuitLog akan membuat Google Sheet baru di Drive kamu untuk menyimpan pengeluaran & tabungan berdua.
            </p>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Nama Spreadsheet (Opsional)
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="TES-DUITLOG"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <span>Semua data tersimpan langsung di Google Drive Anda.</span>
            </div>

            <div className="pt-8">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-2xl text-sm transition-all"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: KATEGORI PENGELUARAN */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-white">Kategori pengeluaran</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bagaimana kamu mengelompokkan pengeluaran? Sesuaikan sesuka hati.
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {expList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5"
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
                      className="bg-transparent text-sm font-semibold text-white focus:outline-none w-full"
                    />
                    <button
                      onClick={() => setExpList(expList.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Color dots picker */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const next = [...expList];
                          next[idx].color = c;
                          setExpList(next);
                        }}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          item.color === c ? "scale-125 ring-2 ring-white" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setExpList([...expList, { name: "Kategori Baru", color: "#10B981" }])}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              + Tambah kategori
            </button>

            <div className="grid grid-cols-2 gap-2 pt-4">
              <button
                onClick={() => setStep(1)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
              >
                Kembali
              </button>
              <button
                onClick={() => setStep(3)}
                className="py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-2xl text-xs"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: METODE PEMBAYARAN */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-white">Metode pembayaran</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bagaimana cara kamu membayar? Tambahkan metode yang biasa dipakai.
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {payList.map((name, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const next = [...payList];
                      next[idx] = e.target.value;
                      setPayList(next);
                    }}
                    className="bg-transparent text-sm font-semibold text-white focus:outline-none w-full"
                  />
                  <button
                    onClick={() => setPayList(payList.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPayList([...payList, "Metode Baru"])}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-700 text-xs font-semibold text-slate-300 hover:text-white"
            >
              + Tambah metode
            </button>

            <div className="grid grid-cols-2 gap-2 pt-4">
              <button
                onClick={() => setStep(2)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
              >
                Kembali
              </button>
              <button
                onClick={() => setStep(4)}
                className="py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-2xl text-xs"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUMBER PEMASUKAN & NOTIFIKASI */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-white">Sumber pemasukan</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dari mana saja pemasukan kamu? Bisa diubah nanti.
            </p>

            <div className="space-y-3">
              {incList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const next = [...incList];
                        next[idx].name = e.target.value;
                        setIncList(next);
                      }}
                      className="bg-transparent text-sm font-semibold text-white focus:outline-none w-full"
                    />
                    <button
                      onClick={() => setIncList(incList.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pengingat Harian Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 mt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pengingat harian?</h4>
                  <p className="text-[11px] text-slate-400">
                    Kami bisa kirim notifikasi 20:00 supaya kamu nggak lupa catat.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReminderEnabled(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    reminderEnabled
                      ? "bg-white text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Aktifkan
                </button>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    !reminderEnabled
                      ? "bg-white text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Nanti saja
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-6">
              <button
                onClick={() => setStep(3)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
              >
                Kembali
              </button>
              <button
                onClick={handleFinish}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
