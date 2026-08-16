"use client";

import React, { useState } from "react";
import { X, RefreshCw, Plus, Trash2, Check, Calendar, AlertCircle } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, formatInputNumber, parseInputNumber } from "@/lib/utils";

interface RecurringManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecurringManagerModal({ isOpen, onClose }: RecurringManagerModalProps) {
  const {
    recurring,
    expenseCategories,
    paymentMethods,
    addRecurringExpense,
    toggleRecurringExpense,
    deleteRecurringExpense,
  } = useFinance();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]?.name || "Tagihan");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.name || "Cash");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [autoRecord, setAutoRecord] = useState(true);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const amt = parseInputNumber(amountInput);
    if (!name || amt <= 0) return;

    await addRecurringExpense({
      name,
      amount: amt,
      category,
      paymentMethod,
      frequency: "monthly",
      dayOfMonth: Number(dayOfMonth) || 1,
      autoRecord,
    });

    setName("");
    setAmountInput("");
    setIsAdding(false);
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
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Otomasi & Tagihan Rutin</h3>
              <p className="text-xs text-slate-400">
                Tercatat otomatis tiap periode tanggal
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
          {!isAdding ? (
            <>
              {/* Recurring List */}
              <div className="space-y-2.5">
                {recurring.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
                    <RefreshCw className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Belum ada pengeluaran rutin tersimpan.</p>
                  </div>
                ) : (
                  recurring.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{rec.name}</span>
                          <span className="text-[10px] font-medium bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                            Tiap Tgl {rec.dayOfMonth}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-emerald-400">
                          {formatIDR(rec.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {rec.category} • {rec.paymentMethod}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => toggleRecurringExpense(rec.id, !rec.isActive)}
                          className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                            rec.isActive ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              rec.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteRecurringExpense(rec.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Button */}
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" />
                + Tambah Pengeluaran Rutin Baru
              </button>
            </>
          ) : (
            /* Add Form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nama Tagihan / Langganan
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Netflix, Wi-Fi IndiHome, Kost"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nominal (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amountInput}
                    onChange={(e) => setAmountInput(formatInputNumber(e.target.value))}
                    placeholder="150.000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tanggal Eksekusi (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={autoRecord}
                      onChange={(e) => setAutoRecord(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <span className="text-xs text-slate-300">Otomatis Catat</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs"
                >
                  Simpan Rutin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
