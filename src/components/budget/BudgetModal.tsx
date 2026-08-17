"use client";

import React, { useState } from "react";
import { X, Sliders, Check, AlertTriangle } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, formatInputNumber, parseInputNumber } from "@/lib/utils";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BudgetModal({ isOpen, onClose }: BudgetModalProps) {
  const {
    expenseCategories,
    currentMonthBudgets,
    overallBudget,
    setBudget,
    selectedMonth,
  } = useFinance();

  const [totalBudgetInput, setTotalBudgetInput] = useState<string>(
    overallBudget && overallBudget.limitAmount > 0 ? formatInputNumber(String(overallBudget.limitAmount)) : ""
  );

  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    expenseCategories.forEach((cat) => {
      const existing = currentMonthBudgets.find((b) => b.category === cat.name);
      initial[cat.name] = existing && existing.limitAmount > 0 ? formatInputNumber(String(existing.limitAmount)) : "";
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    // Save overall budget
    const totalAmount = parseInputNumber(totalBudgetInput);
    await setBudget("TOTAL", totalAmount, selectedMonth);

    // Save per-category budgets
    for (const [catName, val] of Object.entries(categoryBudgets)) {
      const amt = parseInputNumber(val);
      await setBudget(catName, amt, selectedMonth);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0D1326] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Atur Anggaran</h3>
              <p className="text-xs text-slate-400">
                Peringatan otomatis saat pengeluaran mencapai 80% & 100%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-4 space-y-4">
          {/* Overall Budget */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Anggaran Keseluruhan / Bulan
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={totalBudgetInput}
                onChange={(e) => setTotalBudgetInput(formatInputNumber(e.target.value))}
                placeholder="5.000.000"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-11 pr-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {formatIDR(parseInputNumber(totalBudgetInput))} batas belanja per bulan
            </p>
          </div>

          {/* Per Category Budget */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Batas Anggaran Per Kategori (Opsional):
            </p>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span className="text-xs font-medium text-slate-200">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 w-36">
                    <span className="text-[11px] text-slate-500 font-semibold">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={categoryBudgets[cat.name] || ""}
                      onChange={(e) =>
                        setCategoryBudgets({
                          ...categoryBudgets,
                          [cat.name]: formatInputNumber(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-medium text-right text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              Kamu dan pasangan akan mendapatkan notifikasi visual saat pengeluaran menyentuh <strong>80%</strong> dan peringatan merah jika melebihi <strong>100%</strong>.
            </p>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" />
            Simpan Anggaran
          </button>
        </div>
      </div>
    </div>
  );
}
