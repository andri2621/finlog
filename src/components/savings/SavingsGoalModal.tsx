"use client";

import React, { useState } from "react";
import { X, Target, Plus, Check, Wallet, Gem, Home, Car, Plane, GraduationCap, Smartphone, Shield } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, formatInputNumber, parseInputNumber } from "@/lib/utils";

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "new_goal" | "deposit";
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
  const { savings, pockets, addSavingsGoal, depositSavings } = useFinance();

  // New goal form states
  const [goalName, setGoalName] = useState("");
  const [targetAmountInput, setTargetAmountInput] = useState("50.000.000");
  const [targetDate, setTargetDate] = useState("2026-12-27");
  const [selectedIcon, setSelectedIcon] = useState("Gem");
  const [selectedColor, setSelectedColor] = useState("#EC4899");

  // Deposit form states
  const [depositAmountInput, setDepositAmountInput] = useState("100.000");
  const [targetGoalId, setTargetGoalId] = useState(selectedGoalId || (savings[0]?.id || ""));
  const [selectedPocket, setSelectedPocket] = useState("Tunai");

  if (!isOpen) return null;

  const handleSaveGoal = async () => {
    const amount = parseInputNumber(targetAmountInput);
    if (!goalName || amount <= 0) return;

    await addSavingsGoal({
      name: goalName,
      targetAmount: amount,
      targetDate: targetDate || undefined,
      icon: selectedIcon,
      color: selectedColor,
    });

    setGoalName("");
    setTargetAmountInput("");
    onClose();
  };

  const handleSaveDeposit = async () => {
    const amount = parseInputNumber(depositAmountInput);
    if (amount <= 0 || !targetGoalId) return;

    await depositSavings(targetGoalId, amount, selectedPocket);
    setDepositAmountInput("");
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
                {mode === "new_goal" ? "Tujuan Menabung Baru" : "Catat Tabungan"}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === "new_goal"
                  ? "Atur impian finansial & target tabungan"
                  : "Tambahkan saldo ke tujuan menabung"}
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
          {mode === "new_goal" ? (
            <>
              {/* Goal Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Nama Tujuan
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="Contoh: Menikah, Beli Rumah, Liburan"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Target Amount with Auto Dots */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Jumlah Target (IDR)
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
                  Tenggat Waktu (Opsional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
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
                    const isSel = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSel
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                        <span className="text-[10px] truncate max-w-full">{item.label}</span>
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
                      className={`w-7 h-7 rounded-full transition-transform ${
                        selectedColor === c ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSaveGoal}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                Simpan Tujuan
              </button>
            </>
          ) : (
            <>
              {/* Deposit Mode */}
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

              {/* Choose Goal */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Pilih Tujuan Tabungan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {savings.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTargetGoalId(g.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        targetGoalId === g.id
                          ? "bg-pink-500/20 border-pink-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <p className="text-xs font-bold">{g.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatIDR(g.currentAmount)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Choose Pocket */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Tempat Dana (Sumber Uang)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pockets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPocket(p.name)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                        selectedPocket === p.name
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      ></span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSaveDeposit}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                Simpan Setoran Tabungan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
