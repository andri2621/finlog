"use client";

import React from "react";
import { AlertCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR } from "@/lib/utils";

interface BudgetAlertBannerProps {
  onOpenBudgetModal?: () => void;
}

export function BudgetAlertBanner({ onOpenBudgetModal }: BudgetAlertBannerProps) {
  const {
    overallBudget,
    totalExpenseMonth,
    overallBudgetPercent,
    isBudgetWarning80,
    isBudgetExceeded100,
  } = useFinance();

  if (!overallBudget || overallBudget.limitAmount <= 0) return null;

  if (isBudgetExceeded100) {
    return (
      <div
        onClick={onOpenBudgetModal}
        className="cursor-pointer mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/60 via-red-900/30 to-red-950/60 border border-red-500/40 text-red-200 flex items-center justify-between shadow-lg shadow-red-950/40 hover:scale-[1.01] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
            <AlertCircle className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-300">
              ⚠️ Anggaran Melebihi Batas ({overallBudgetPercent}%)
            </p>
            <p className="text-[11px] text-red-400/90">
              Pengeluaran {formatIDR(totalExpenseMonth)} dari limit {formatIDR(overallBudget.limitAmount)}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-red-400" />
      </div>
    );
  }

  if (isBudgetWarning80) {
    return (
      <div
        onClick={onOpenBudgetModal}
        className="cursor-pointer mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-amber-950/60 border border-amber-500/40 text-amber-200 flex items-center justify-between shadow-lg shadow-amber-950/40 hover:scale-[1.01] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-300">
              ⚡ Pengeluaran Mencapai {overallBudgetPercent}%
            </p>
            <p className="text-[11px] text-amber-400/90">
              Sisa batas belanja bulan ini: {formatIDR(Math.max(0, overallBudget.limitAmount - totalExpenseMonth))}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </div>
    );
  }

  return null;
}
