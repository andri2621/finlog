"use client";

import React, { useState, useEffect } from "react";
import { X, Wallet, Plus, Trash2, Check, ArrowRight, RotateCw, Sparkles, ChevronDown } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { useAuth } from "@/lib/context/AuthContext";
import { formatIDR, formatInputNumber, parseInputNumber, getTodayString } from "@/lib/utils";
import { CategoryConfig } from "@/lib/db/types";

interface TempatUangModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPocketName?: string;
}

const COLOR_PALETTE = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#64748B",
  "#14B8A6", "#6366F1", "#D946EF", "#84CC16"
];

export function TempatUangModal({
  isOpen,
  onClose,
  selectedPocketName,
}: TempatUangModalProps) {
  const { user } = useAuth();
  const {
    pockets,
    paymentMethods,
    getPocketBalance,
    addCategoryItem,
    deleteCategoryItem,
    addTransaction,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<"adjust" | "new_account">("adjust");
  
  // Adjust balance states
  const [targetAccount, setTargetAccount] = useState<string>(selectedPocketName || pockets[0]?.name || "Cash");
  const [newBalanceInput, setNewBalanceInput] = useState<string>("");
  const [adjustNote, setAdjustNote] = useState<string>("");

  // New account states
  const [newAccountName, setNewAccountName] = useState<string>("");
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("#10B981");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (selectedPocketName) {
      setTargetAccount(selectedPocketName);
      const current = getPocketBalance(selectedPocketName);
      setNewBalanceInput(current > 0 ? formatInputNumber(String(current)) : "");
    } else if (pockets.length > 0) {
      setTargetAccount(pockets[0].name);
      const current = getPocketBalance(pockets[0].name);
      setNewBalanceInput(current > 0 ? formatInputNumber(String(current)) : "");
    }
  }, [selectedPocketName, pockets, isOpen]);

  if (!isOpen) return null;

  const currentBal = getPocketBalance(targetAccount);
  const targetBal = parseInputNumber(newBalanceInput);
  const difference = targetBal - currentBal;

  const handleAdjustBalance = async () => {
    if (!targetAccount) return;
    if (difference === 0) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      const today = getTodayString();
      const recordedBy = user?.name || user?.email || "Saya";

      if (difference > 0) {
        // Positive difference -> Add Income
        await addTransaction({
          type: "income",
          amount: difference,
          category: "Saldo Awal & Penyesuaian",
          paymentMethod: targetAccount,
          description: adjustNote.trim() || `Penyesuaian Saldo: ${targetAccount}`,
          date: today,
        });
      } else {
        // Negative difference -> Add Expense
        await addTransaction({
          type: "expense",
          amount: Math.abs(difference),
          category: "Lainnya",
          paymentMethod: targetAccount,
          description: adjustNote.trim() || `Penyesuaian Saldo: ${targetAccount}`,
          date: today,
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewAccount = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      setErrorMessage("Nama Tempat Uang / Rekening tidak boleh kosong!");
      return;
    }

    if (pockets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`"${trimmed}" sudah ada di daftar!`);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Add as payment method / pocket
      await addCategoryItem("payment_method", trimmed, selectedColor);

      // 2. If initial balance provided > 0, record initial balance income
      const initAmount = parseInputNumber(newAccountInitialBalance);
      if (initAmount > 0) {
        const today = getTodayString();

        await addTransaction({
          type: "income",
          amount: initAmount,
          category: "Saldo Awal & Penyesuaian",
          paymentMethod: trimmed,
          description: `Saldo Awal: ${trimmed}`,
          date: today,
        });
      }

      setNewAccountName("");
      setNewAccountInitialBalance("");
      setErrorMessage("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Kelola Tempat Uang</h3>
              <p className="text-xs text-slate-400">Atur saldo rekening & tambah akun baru</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 my-4">
          <button
            type="button"
            onClick={() => setActiveTab("adjust")}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "adjust"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sesuaikan Saldo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new_account")}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "new_account"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            + Akun / Rekening Baru
          </button>
        </div>

        {/* Form Body */}
        {activeTab === "adjust" ? (
          <div className="space-y-4">
            {/* Account Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Pilih Tempat Uang
              </label>
              <div className="relative">
                <select
                  value={targetAccount}
                  onChange={(e) => {
                    setTargetAccount(e.target.value);
                    const bal = getPocketBalance(e.target.value);
                    setNewBalanceInput(bal > 0 ? formatInputNumber(String(bal)) : "");
                  }}
                  className="w-full appearance-none bg-slate-900 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {pockets.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (Saldo Saat Ini: {formatIDR(getPocketBalance(p.name))})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Current vs New Balance Display */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Saldo di Aplikasi:</span>
                <span className="font-bold text-white">{formatIDR(currentBal)}</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Ubah Saldo Menjadi (IDR):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newBalanceInput}
                    onChange={(e) => setNewBalanceInput(formatInputNumber(e.target.value))}
                    placeholder="10.000.000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm font-extrabold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {difference !== 0 && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Penyesuaian Otomatis:</span>
                  <span className={`font-bold ${difference > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {difference > 0 ? `+${formatIDR(difference)} (Pemasukan)` : `-${formatIDR(Math.abs(difference))} (Pengeluaran)`}
                  </span>
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Catatan Penyesuaian (Opsional)
              </label>
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Contoh: Set Saldo Awal, Sinkronisasi Buku Tabungan"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdjustBalance}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* New Account Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Nama Tempat Uang / Rekening
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="Contoh: BCA, Mandiri, GoPay, Seabank"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Initial Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Saldo Awal (Opsional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newAccountInitialBalance}
                  onChange={(e) => setNewAccountInitialBalance(formatInputNumber(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Pilih Warna Ikon
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className="w-8 h-8 rounded-full transition-transform cursor-pointer relative flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && (
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddNewAccount}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Tambah Tempat Uang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
