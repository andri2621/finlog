"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  ArrowLeft,
  Gem,
  CheckCircle2,
  Trash2,
  Calendar,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR } from "@/lib/utils";
import { SavingsGoalModal } from "@/components/savings/SavingsGoalModal";

export default function SavingsPage() {
  const { savings, savingsLogs, pockets } = useFinance();
  const [modalMode, setModalMode] = useState<"new_goal" | "deposit">("deposit");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);

  // Total accumulated savings
  const totalSavings = useMemo(() => {
    return savings.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [savings]);

  const handleOpenNewGoal = () => {
    setModalMode("new_goal");
    setIsModalOpen(true);
  };

  const handleOpenDeposit = (goalId?: string) => {
    setModalMode("deposit");
    setSelectedGoalId(goalId || savings[0]?.id);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* TOP HEADER WITH BACK ARROW TO SETTINGS */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Pengaturan</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          Tabungan
        </span>
      </div>

      {/* HEADER CARD: TOTAL TABUNGAN */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#0F3A2B] via-[#0B251D] to-[#0A101D] border border-emerald-500/40 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Total Tabungan
            </p>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-1">
              {formatIDR(totalSavings)}
            </p>
            <p className="text-xs text-emerald-300/80 mt-1">
              {savings.length} tujuan impian terdaftar
            </p>
          </div>

          {/* Decorative circular badge */}
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-8 h-8" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-500/20">
          <button
            onClick={() => handleOpenDeposit()}
            className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/30 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Catat tabungan</span>
          </button>
          <button
            onClick={handleOpenNewGoal}
            className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/30 shadow-md cursor-pointer"
          >
            <Target className="w-4 h-4 text-pink-400" />
            <span>Tujuan baru</span>
          </button>
        </div>
      </div>

      {/* TEMPAT DANA (POCKETS) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Tempat Dana
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {pockets.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{p.name}</span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Aktif</span>
            </div>
          ))}
        </div>
      </div>

      {/* LIST OF SAVINGS GOALS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider px-1">
          Daftar Impian & Tabungan
        </h3>

        {savings.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <Target className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada tujuan menabung yang dibuat.</p>
          </div>
        ) : (
          savings.map((goal) => {
            const percent =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                : 0;

            return (
              <div
                key={goal.id}
                className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-md space-y-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: goal.color }}
                    >
                      <Gem className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{goal.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatIDR(goal.currentAmount)} / {formatIDR(goal.targetAmount)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDeposit(goal.id)}
                    className="py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl text-xs border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    + Setor
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span className="font-semibold text-emerald-500">{percent}%</span>
                    {goal.targetDate && (
                      <span>Tenggat: {goal.targetDate}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RECENT DEPOSITS LOG */}
      {savingsLogs.length > 0 && (
        <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Riwayat Setoran Tabungan
          </h3>
          <div className="space-y-2">
            {savingsLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{log.savingsName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {log.date} • {log.pocket} • Oleh {log.recordedBy}
                  </p>
                </div>
                <p className="font-bold text-emerald-500">+{formatIDR(log.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <SavingsGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        selectedGoalId={selectedGoalId}
      />
    </div>
  );
}
