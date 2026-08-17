"use client";

import React, { useState, useRef } from "react";
import {
  Calendar,
  CheckCircle2,
  Undo2,
  Edit2,
  Sparkles,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { useAuth } from "@/lib/context/AuthContext";
import { formatIDR, getTodayString, formatInputNumber, parseInputNumber } from "@/lib/utils";
import confetti from "canvas-confetti";
import { BudgetAlertBanner } from "@/components/budget/BudgetAlertBanner";
import { BudgetModal } from "@/components/budget/BudgetModal";

export default function AddExpensePage() {
  const { user } = useAuth();
  const {
    expenseCategories,
    paymentMethods,
    addTransaction,
    lastSavedTransaction,
    undoLastTransaction,
    clearLastSavedTransaction,
  } = useFinance();

  const [amountStr, setAmountStr] = useState<string>("0");
  const [description, setDescription] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    expenseCategories[0]?.name || "Makanan"
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    paymentMethods[0]?.name || "Cash"
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const numericAmount = parseInputNumber(amountStr);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await addTransaction({
        date: selectedDate,
        type: "expense",
        description: description.trim() || selectedCategory,
        category: selectedCategory,
        paymentMethod: selectedPaymentMethod,
        amount: numericAmount,
      });

      // Micro celebration confetti on save
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#10B981", "#3B82F6", "#F59E0B"],
      });

      // Reset amount & description for fast subsequent entry
      setAmountStr("0");
      setDescription("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-full">
      {/* SUCCESS TOAST WITH UNDO & EDIT (Auto dismisses in 5s) */}
      {lastSavedTransaction && (
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-[#0E2A23] to-[#0D1E2A] border border-emerald-500/40 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Transaksi tersimpan
                </p>
                <p className="text-[11px] text-emerald-300">
                  {formatIDR(lastSavedTransaction.amount)} • {lastSavedTransaction.category}
                </p>
              </div>
            </div>
            <button
              onClick={clearLastSavedTransaction}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setAmountStr(formatInputNumber(String(lastSavedTransaction.amount)));
                setDescription(lastSavedTransaction.description);
                setSelectedCategory(lastSavedTransaction.category);
                setSelectedPaymentMethod(lastSavedTransaction.paymentMethod);
                clearLastSavedTransaction();
              }}
              className="py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Ubah
            </button>
            <button
              type="button"
              onClick={undoLastTransaction}
              className="py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-red-300 flex items-center justify-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" /> Urungkan
            </button>
          </div>
        </div>
      )}

      {/* Budget Warning Banner (80% & 100%) */}
      <BudgetAlertBanner onOpenBudgetModal={() => setShowBudgetModal(true)} />

      {/* PAGE TITLE */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            Catat Pengeluaran
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Dicatat oleh <span className="text-emerald-500 font-semibold">{user?.name}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBudgetModal(true)}
          className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-500 flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
        >
          <span>Atur Anggaran</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* TRANSACTION INPUT FORM */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* BIG NUMERIC DISPLAY (IDR 0) */}
        <div className="pb-3 border-b border-slate-200 dark:border-slate-700/80">
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
              className="w-full bg-transparent text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none tracking-tight"
            />
          </div>
        </div>

        {/* ITEM / DESCRIPTION ("Apa yang kamu beli?") */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Barang
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Apa yang kamu beli?"
            className="w-full bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* CATEGORIES PILLS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Kategori
          </label>
          <div className="grid grid-cols-3 gap-2">
            {expenseCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-medium transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 shadow-md font-semibold ring-1 ring-emerald-500/40"
                      : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PAYMENT METHOD PILLS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => {
              const isSelected = selectedPaymentMethod === method.name;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.name)}
                  className={`py-2.5 px-2 rounded-2xl border text-xs font-medium transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 shadow-md font-semibold ring-1 ring-emerald-500/40"
                      : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">{method.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DATE PICKER */}
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
              className="w-full bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer shadow-sm"
            />
            <Calendar className="w-5 h-5 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* BIG SIMPAN BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={numericAmount <= 0 || isSubmitting}
            className={`w-full py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
              numericAmount > 0
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98] cursor-pointer"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700/60 cursor-not-allowed opacity-70"
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

      {/* Budget Modal */}
      <BudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} />
    </div>
  );
}
