"use client";

import React, { useState, useRef } from "react";
import { TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { useAuth } from "@/lib/context/AuthContext";
import { formatIDR, getTodayString, formatInputNumber, parseInputNumber } from "@/lib/utils";
import confetti from "canvas-confetti";

export default function IncomePage() {
  const { user } = useAuth();
  const { incomeCategories, paymentMethods, addTransaction } = useFinance();

  const [amountStr, setAmountStr] = useState<string>("0");
  const [description, setDescription] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>(
    incomeCategories[0]?.name || "Gaji"
  );
  const [selectedPaymentMethod] = useState<string>(
    paymentMethods[0]?.name || "Bank Transfer"
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const numericAmount = parseInputNumber(amountStr);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await addTransaction({
        date: selectedDate,
        type: "income",
        description: description.trim() || selectedSource,
        category: selectedSource,
        paymentMethod: selectedPaymentMethod,
        amount: numericAmount,
      });

      confetti({
        particleCount: 30,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#10B981", "#06B6D4", "#F59E0B"],
      });

      setShowSuccessToast(true);
      setAmountStr("0");
      setDescription("");
      setTimeout(() => setShowSuccessToast(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-full">
      {/* SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-[#0E2A23] to-[#0D1E2A] border border-emerald-500/40 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Pemasukan Berhasil Disimpan!</p>
              <p className="text-[11px] text-emerald-300">
                Data langsung sinkron ke Google Sheet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Catat Pemasukan
          </h1>
          <p className="text-[11px] text-slate-400">
            Dicatat oleh <span className="text-emerald-400 font-semibold">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* BIG NUMERIC DISPLAY */}
        <div className="pb-3 border-b border-slate-700/80">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-400">IDR</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountStr === "0" ? "" : amountStr}
              onChange={(e) => {
                const formatted = formatInputNumber(e.target.value);
                setAmountStr(formatted || "0");
              }}
              placeholder="0"
              className="w-full bg-transparent text-4xl sm:text-5xl font-extrabold text-[var(--foreground)] placeholder:text-slate-600 focus:outline-none tracking-tight"
            />
          </div>
        </div>

        {/* CATATAN (OPSIONAL) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Catatan (Opsional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Gaji April, Bonus Project, Penjualan"
            className="w-full bg-[#0F162A] border border-slate-700/80 hover:border-slate-600 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all"
          />
        </div>

        {/* TANGGAL (Full-area Clickable) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Tanggal
          </label>
          <div
            onClick={() => {
              try {
                dateInputRef.current?.showPicker?.();
              } catch {}
              dateInputRef.current?.focus();
            }}
            className="relative cursor-pointer"
          >
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#0F162A] border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            />
            <Calendar className="w-5 h-5 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* SUMBER PEMASUKAN PILLS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Sumber Pemasukan
          </label>
          <div className="grid grid-cols-3 gap-2">
            {incomeCategories.map((source) => {
              const isSelected = selectedSource === source.name;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedSource(source.name)}
                  className={`py-3 px-2 rounded-2xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-800/95 border-emerald-400 text-white font-semibold ring-1 ring-emerald-500/40"
                      : "bg-[#0F162A]/80 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="truncate">{source.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SIMPAN BUTTON */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={numericAmount <= 0 || isSubmitting}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
              numericAmount > 0
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98] cursor-pointer"
                : "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-70"
            }`}
          >
            {isSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Simpan"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
