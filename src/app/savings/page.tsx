"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  ArrowLeft,
  Gem,
  Home,
  Car,
  Plane,
  GraduationCap,
  Smartphone,
  Shield,
  CheckCircle2,
  Trash2,
  Pencil,
  Calendar,
  Wallet,
  Coins,
  AlertCircle,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR } from "@/lib/utils";
import { SavingsGoalModal } from "@/components/savings/SavingsGoalModal";
import { TempatUangModal } from "@/components/savings/TempatUangModal";
import { UserFilterDropdown } from "@/components/ui/UserFilterDropdown";
import { SavingsGoal } from "@/lib/db/types";

const renderGoalIcon = (iconName?: string) => {
  switch (iconName) {
    case "Home": return <Home className="w-4 h-4" />;
    case "Car": return <Car className="w-4 h-4" />;
    case "Plane": return <Plane className="w-4 h-4" />;
    case "GraduationCap": return <GraduationCap className="w-4 h-4" />;
    case "Smartphone": return <Smartphone className="w-4 h-4" />;
    case "Shield": return <Shield className="w-4 h-4" />;
    case "Target": return <Target className="w-4 h-4" />;
    case "Gem":
    default:
      return <Gem className="w-4 h-4" />;
  }
};

export default function SavingsPage() {
  const {
    savings,
    savingsLogs,
    pockets,
    getPocketBalance,
    totalPocketBalance,
    totalSavingsBalance,
    totalNetWorth,
    deleteSavingsGoal,
  } = useFinance();
  const [modalMode, setModalMode] = useState<"new_goal" | "edit_goal" | "deposit">("new_goal");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);
  const [isTempatUangModalOpen, setIsTempatUangModalOpen] = useState(false);
  const [selectedPocketForEdit, setSelectedPocketForEdit] = useState<string | undefined>(undefined);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  const handleOpenNewGoal = () => {
    setModalMode("new_goal");
    setSelectedGoalId(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditGoal = (goalId: string) => {
    setModalMode("edit_goal");
    setSelectedGoalId(goalId);
    setIsModalOpen(true);
  };

  const handleOpenDeposit = (goalId?: string) => {
    setModalMode("deposit");
    setSelectedGoalId(goalId || savings[0]?.id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    await deleteSavingsGoal(goalToDelete.id);
    setGoalToDelete(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span>Tabungan & Tempat Uang</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pantau saldo akun (kantong) & alokasi tujuan impian
          </p>
        </div>

        <UserFilterDropdown />
      </div>

      {/* HEADER CARD: TOTAL TABUNGAN & TOTAL ASSETS */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#0F3A2B] via-[#0B251D] to-[#0A101D] border border-emerald-500/40 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Total Tabungan Terkumpul
            </p>
            <p className="text-3xl font-extrabold text-white tracking-tight mt-1">
              {formatIDR(totalSavingsBalance)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-emerald-300/90">
              <span>{savings.length} tujuan impian</span>
              <span>•</span>
              <span>Total Aset: <strong className="text-white font-bold">{formatIDR(totalNetWorth)}</strong></span>
            </div>
          </div>

          {/* Decorative circular badge */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
            <Coins className="w-7 h-7" />
          </div>
        </div>

        {/* Action Button: Single prominent Goal creation button */}
        <div className="mt-4 pt-3 border-t border-emerald-500/20">
          <button
            type="button"
            onClick={handleOpenNewGoal}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>+ Buat Tujuan Impian Baru</span>
          </button>
        </div>
      </div>

      {/* TEMPAT UANG (POCKETS & SALDO) */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Tempat Uang (Akun)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Saldo Cair: <strong className="text-emerald-500 font-bold">{formatIDR(totalPocketBalance)}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedPocketForEdit(undefined);
              setIsTempatUangModalOpen(true);
            }}
            className="py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            + Atur / Tambah
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {pockets.map((p) => {
            const bal = getPocketBalance(p.name);
            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPocketForEdit(p.name);
                  setIsTempatUangModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 flex flex-col justify-between gap-1 shadow-sm cursor-pointer transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Klik atur</span>
                </div>
                <p className={`text-xs font-bold tracking-tight ${bal < 0 ? "text-red-500" : bal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {formatIDR(bal)}
                </p>
              </div>
            );
          })}
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: goal.color }}
                    >
                      {renderGoalIcon(goal.icon)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{goal.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatIDR(goal.currentAmount)}</strong>
                        <span className="text-slate-400"> / {formatIDR(goal.targetAmount)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditGoal(goal.id)}
                      title="Edit Tujuan"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalToDelete(goal)}
                      title="Hapus Tujuan"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeposit(goal.id)}
                      className="py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs border border-emerald-500/30 transition-colors cursor-pointer ml-0.5"
                    >
                      + Setor
                    </button>
                  </div>
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

      {/* Modals */}
      <SavingsGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        selectedGoalId={selectedGoalId}
      />

      <TempatUangModal
        isOpen={isTempatUangModalOpen}
        onClose={() => setIsTempatUangModalOpen(false)}
        selectedPocketName={selectedPocketForEdit}
      />

      {/* DELETE GOAL CONFIRMATION MODAL */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0D1326] border border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Tujuan Impian?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Yakin ingin menghapus tujuan <strong>&quot;{goalToDelete.name}&quot;</strong>? Target tabungan akan dihapus namun saldo Tempat Uang tidak akan terpengaruh.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
