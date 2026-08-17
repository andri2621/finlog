"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Calendar,
  Wallet,
  Infinity as InfinityIcon,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, getMonthDisplayName } from "@/lib/utils";
import { BudgetModal } from "@/components/budget/BudgetModal";
import { BudgetAlertBanner } from "@/components/budget/BudgetAlertBanner";
import { UserFilterDropdown } from "@/components/ui/UserFilterDropdown";

export default function ReportsPage() {
  const {
    currentMonthTransactions,
    expenseCategories,
    currentMonthBudgets,
    overallBudget,
    selectedMonth,
    setSelectedMonth,
    totalExpenseMonth,
    totalIncomeMonth,
    netBalanceMonth,
    totalAllTimeBalance,
  } = useFinance();

  const [showAllTimeDetails, setShowAllTimeDetails] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [activeDayData, setActiveDayData] = useState<{ day: string; amount: number } | null>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Calculate days in month & average
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [selectedMonth]);

  const avgPerDay = Math.round(totalExpenseMonth / (daysInMonth || 30));
  const saveRate = totalIncomeMonth > 0 ? Math.max(0, Math.round((netBalanceMonth / totalIncomeMonth) * 100)) : 0;

  // Category Distribution & Budgets
  const categoryStats = useMemo(() => {
    const expenseTxs = currentMonthTransactions.filter((tx) => tx.type === "expense");
    const catMap: Record<string, { total: number; count: number; color: string }> = {};

    expenseCategories.forEach((c) => {
      catMap[c.name] = { total: 0, count: 0, color: c.color };
    });

    expenseTxs.forEach((tx) => {
      if (!catMap[tx.category]) {
        catMap[tx.category] = { total: 0, count: 0, color: "#64748B" };
      }
      catMap[tx.category].total += tx.amount;
      catMap[tx.category].count += 1;
    });

    return Object.entries(catMap)
      .filter(([_, data]) => data.total > 0)
      .map(([name, data]) => {
        const catBudget = currentMonthBudgets.find((b) => b.category === name);
        const percentOfTotal = totalExpenseMonth > 0 ? Math.round((data.total / totalExpenseMonth) * 100) : 0;
        const percentOfBudget = catBudget && catBudget.limitAmount > 0 ? Math.round((data.total / catBudget.limitAmount) * 100) : 0;

        return {
          name,
          total: data.total,
          count: data.count,
          color: data.color,
          percentOfTotal,
          percentOfBudget,
          budgetLimit: catBudget?.limitAmount || 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [currentMonthTransactions, expenseCategories, currentMonthBudgets, totalExpenseMonth]);

  // Daily Trend Chart Data (1 to 30/31)
  const dailyChartData = useMemo(() => {
    const daysArray: { day: string; fullDay: string; amount: number }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, "0");
      const fullDateStr = `${selectedMonth}-${dayStr}`;
      
      const dayTotal = currentMonthTransactions
        .filter((tx) => tx.type === "expense" && tx.date === fullDateStr)
        .reduce((sum, tx) => sum + tx.amount, 0);

      daysArray.push({
        day: dayStr,
        fullDay: fullDateStr,
        amount: dayTotal,
      });
    }
    return daysArray;
  }, [currentMonthTransactions, selectedMonth, daysInMonth]);

  // Top Largest Expenses
  const topExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => tx.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [currentMonthTransactions]);

  return (
    <div className="p-4 space-y-4">
      {/* HEADER & MONTH PICKER & USER FILTER */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Laporan Bulanan</h1>
          <p className="text-[11px] text-slate-400">Ringkasan finansial & anggaran</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <UserFilterDropdown />
          <div
            onClick={() => {
              try {
                monthInputRef.current?.showPicker?.();
              } catch {
                monthInputRef.current?.focus();
              }
            }}
            className="relative flex items-center gap-1.5 bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0 pointer-events-none" />
            <span className="pointer-events-none whitespace-nowrap text-xs">
              {getMonthDisplayName(selectedMonth)}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 pointer-events-none" />
            <input
              ref={monthInputRef}
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              onClick={(e) => {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch {}
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Budget Warning Banner (80% & 100%) */}
      <BudgetAlertBanner onOpenBudgetModal={() => setShowBudgetModal(true)} />

      {/* CARD 1: MONTHLY CASH FLOW SUMMARY (Matches Screenshot) */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#0F2228] via-[#0D1826] to-[#0A101D] border border-emerald-500/30 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pemasukan
            </p>
            <p className="text-lg font-bold text-emerald-400">
              {formatIDR(totalIncomeMonth)}
            </p>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2">
              Pengeluaran
            </p>
            <p className="text-2xl font-extrabold text-white tracking-tight">
              {formatIDR(totalExpenseMonth)}
            </p>

            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Sisa Saldo</p>
              <p className={`text-base font-bold ${netBalanceMonth >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                {formatIDR(netBalanceMonth)}
              </p>
            </div>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="w-8 h-8 opacity-80" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>{currentMonthTransactions.length} transaksi • Rata-rata {formatIDR(avgPerDay)}/hari</span>
          {saveRate > 0 && (
            <span className="text-emerald-400 font-semibold">Hemat {saveRate}%</span>
          )}
        </div>
      </div>

      {/* CARD 2: TOTAL KESELURUHAN (ALL TIME ACCUMULATION) */}
      <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md">
        <button
          onClick={() => setShowAllTimeDetails(!showAllTimeDetails)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
              <InfinityIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Total Keseluruhan</p>
              <p className="text-[11px] text-slate-400">Akumulasi sepanjang waktu</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-slate-800/80 px-2.5 py-1 rounded-xl">
            <span>{showAllTimeDetails ? "Tutup" : "Lihat"}</span>
            {showAllTimeDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showAllTimeDetails && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20">
              <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                Saldo Bersih Sepanjang Waktu
              </p>
              <p className="text-xl font-extrabold text-white mt-1">
                {formatIDR(totalAllTimeBalance)}
              </p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full w-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CARD 3: ATUR ANGGARAN CTA CARD */}
      <div
        onClick={() => setShowBudgetModal(true)}
        className="cursor-pointer p-4 rounded-3xl bg-gradient-to-r from-[#0D241E]/80 to-[#0F162A] border border-emerald-500/30 flex items-center justify-between hover:border-emerald-400 transition-all shadow-md group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Atur Anggaran Bulanan</p>
            <p className="text-[11px] text-slate-400">
              Pantau batas pengeluaran & dapat peringatan di 80% & 100%
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 ml-2 text-emerald-400 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* CARD 4: PENGELUARAN PER KATEGORI */}
      <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Pengeluaran per Kategori
            </h3>
            <p className="text-[10px] text-slate-400">Distribusi & pemakaian anggaran</p>
          </div>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
          >
            Atur anggaran →
          </button>
        </div>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Belum ada data pengeluaran bulan ini.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {categoryStats.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-500">{item.count}x</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-white">
                      {item.budgetLimit > 0
                        ? `${formatIDR(item.total)} / ${formatIDR(item.budgetLimit)}`
                        : formatIDR(item.total)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1.5 font-semibold">
                      • {item.percentOfTotal}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800/90 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, item.percentOfTotal)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 5: TREN HARIAN (INTERACTIVE BAR CHART) */}
      <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Tren Harian
            </h3>
            <p className="text-[10px] text-slate-400">
              {activeDayData
                ? `Tgl ${activeDayData.day}: ${formatIDR(activeDayData.amount)}`
                : "Ketuk grafik untuk lihat detail"}
            </p>
          </div>

          {activeDayData && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              {formatIDR(activeDayData.amount)}
            </span>
          )}
        </div>

        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyChartData}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  setActiveDayData(data.activePayload[0].payload);
                }
              }}
            >
              <XAxis
                dataKey="day"
                tick={{ fill: "#64748B", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs shadow-xl">
                        <p className="text-[10px] text-slate-400">{d.fullDay}</p>
                        <p className="font-bold text-emerald-400">{formatIDR(d.amount)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {dailyChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.amount > 0 ? "#10B981" : "#1E293B"}
                    className="hover:opacity-80 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CARD 6: TOP EXPENSES */}
      {topExpenses.length > 0 && (
        <div className="p-4 rounded-3xl bg-[#0F162A] border border-slate-800 shadow-md space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Pengeluaran Terbesar
          </h3>
          <div className="space-y-2">
            {topExpenses.map((tx, idx) => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{tx.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {tx.date} • {tx.category}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold text-white">{formatIDR(tx.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} />
    </div>
  );
}
