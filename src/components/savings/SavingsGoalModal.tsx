"use client";

import React, { useState } from "react";
import {
  X,
  Target,
  Plus,
  Check,
  Wallet,
  Gem,
  Home,
  Car,
  Plane,
  GraduationCap,
  Smartphone,
  Shield,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, formatInputNumber, parseInputNumber } from "@/lib/utils";

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "new_goal" | "edit_goal" | "deposit";
  selectedGoalId?: string;
}

const ICONS = [
  { id: "Gem", label: "Cincin / Menikah", icon: Gem },
  { id: "Home", label: "Rumah", icon: Home },
  { id: "Car", label: "Kendaraan", icon: Car },
  { id: "Plane", label: "Liburan", icon: Plane },
  { id: "GraduationCap", label: "Pendidikan", icon: GraduationCap },
  { id: "Smartphone", label: "Gadget", icon: Smartphone },
  { id: "Shield", label: "Dana Darurat", icon: Shield },
  { id: "Target", label: "Umum", icon: Target },
];

const COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#64748B",
];

export function SavingsGoalModal({
  isOpen,
  onClose,
  mode,
  selectedGoalId,
}: SavingsGoalModalProps) {
  if (!isOpen) return null;

  return (
    <SavingsGoalModalContent
      key={`${mode}-${selectedGoalId}`}
      onClose={onClose}
      mode={mode}
      selectedGoalId={selectedGoalId}
    />
  );
}

function SavingsGoalModalContent({
  onClose,
  mode,
  selectedGoalId,
}: {
  onClose: () => void;
  mode: "new_goal" | "edit_goal" | "deposit";
  selectedGoalId?: string;
}) {
  const {
    savings,
    pockets,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    depositSavings,
    getPocketBalance,
  } = useFinance();

  const editingGoal = savings.find((g) => g.id === selectedGoalId) || (mode === "edit_goal" ? savings[0] : null);

  // Form states
  const [goalName, setGoalName] = useState(() => editingGoal?.name || "");
  const [targetAmountInput, setTargetAmountInput] = useState(() =>
    editingGoal ? formatInputNumber(String(editingGoal.targetAmount)) : ""
  );
  const [targetDate, setTargetDate] = useState(() => editingGoal?.targetDate || "");
  const [selectedIcon, setSelectedIcon] = useState(() => editingGoal?.icon || "Gem");
  const [selectedColor, setSelectedColor] = useState(() => editingGoal?.color || "#EC4899");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deposit form states
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [targetGoalId, setTargetGoalId] = useState(selectedGoalId || (savings[0]?.id || ""));
  const [selectedPocket, setSelectedPocket] = useState(pockets[0]?.name || "Tunai");

  const currentGoal =
    savings.find((g) => g.id === targetGoalId) ||
    savings.find((g) => g.id === selectedGoalId) ||
    savings[0];

  const pocketBalance = getPocketBalance(selectedPocket);
  const numericDeposit = parseInputNumber(depositAmountInput);
  const isInsufficient = numericDeposit > pocketBalance && pocketBalance >= 0;

  const handleSaveGoal = async () => {
    const amount = parseInputNumber(targetAmountInput);
    if (!goalName.trim() || amount <= 0) return;

    if (mode === "edit_goal" && editingGoal) {
      await updateSavingsGoal(editingGoal.id, {
        name: goalName.trim(),
        targetAmount: amount,
        targetDate: targetDate || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
    } else {
      await addSavingsGoal({
        name: goalName.trim(),
        targetAmount: amount,
        targetDate: targetDate || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
    }

    onClose();
  };

  const handleDeleteGoal = async () => {
    if (!editingGoal) return;
    await deleteSavingsGoal(editingGoal.id);
    onClose();
  };

  const handleSaveDeposit = async () => {
    const amount = parseInputNumber(depositAmountInput);
    if (amount <= 0 || !currentGoal) return;

    await depositSavings(currentGoal.id, amount, selectedPocket);
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
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === "new_goal"
                  ? "Tujuan Impian Baru"
                  : mode === "edit_goal"
                  ? "Edit Tujuan Impian"
                  : "Setor Tabungan"}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === "deposit"
                  ? "Setorkan dana dari Tempat Uang ke pos impian ini"
                  : "Atur target nominal, waktu & visual impian Anda"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-4 space-y-4">
          {mode === "new_goal" || mode === "edit_goal" ? (
            <>
              {/* Goal Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Nama Tujuan / Impian
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Contoh: Beli Rumah / Seserahan"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Target Nominal (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetAmountInput}
                    onChange={(e) => setTargetAmountInput(formatInputNumber(e.target.value))}
                    placeholder="50.000.000"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-11 pr-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Target Tanggal (Opsional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Pilih Ikon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[9px] truncate w-full text-center">{item.label.split("/")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Pilih Warna
                </label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        selectedColor === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Delete button and confirmation for edit mode */}
              {mode === "edit_goal" && editingGoal && (
                <div className="pt-2 border-t border-slate-800">
                  {showDeleteConfirm ? (
                    <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 space-y-2 animate-in fade-in">
                      <p className="text-xs font-bold text-red-400">
                        Hapus impian &quot;{editingGoal.name}&quot;?
                      </p>
                      <p className="text-[11px] text-red-400/80">
                        Tujuan impian ini akan dihapus dari daftar. Saldo di Tempat Uang tidak akan terpengaruh.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteGoal}
                          className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Tujuan Impian Ini</span>
                    </button>
                  )}
                </div>
              )}

              {/* Submit Goal */}
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={!goalName.trim() || parseInputNumber(targetAmountInput) <= 0}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{mode === "edit_goal" ? "Perbarui Tujuan Impian" : "Simpan Tujuan Impian"}</span>
              </button>
            </>
          ) : (
            <>
              {/* Target Goal Banner / Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tujuan Tabungan
                </label>
                {selectedGoalId && currentGoal ? (
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: currentGoal.color }}
                      >
                        <Gem className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{currentGoal.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Terkumpul: <strong className="text-emerald-400">{formatIDR(currentGoal.currentAmount)}</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                      Target: {formatIDR(currentGoal.targetAmount)}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {savings.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setTargetGoalId(g.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          targetGoalId === g.id
                            ? "bg-pink-500/20 border-pink-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <p className="text-xs font-bold truncate">{g.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatIDR(g.currentAmount)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Deposit Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Nominal Setor (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={depositAmountInput}
                    onChange={(e) => setDepositAmountInput(formatInputNumber(e.target.value))}
                    placeholder="100.000"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-11 pr-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Choose Pocket with live balance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Tempat Uang (Sumber Dana)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Saldo: <strong className="text-emerald-400">{formatIDR(pocketBalance)}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {pockets.map((p) => {
                    const bal = getPocketBalance(p.name);
                    const isSelected = selectedPocket === p.name;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPocket(p.name)}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-0.5 transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 text-white font-semibold"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 pl-3.5">
                          {formatIDR(bal)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Insufficient balance warning */}
              {numericDeposit > 0 && isInsufficient && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Saldo {selectedPocket} ({formatIDR(pocketBalance)}) tidak mencukupi untuk setoran ini.</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleSaveDeposit}
                disabled={numericDeposit <= 0 || !currentGoal}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Setoran Tabungan</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
