"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MoreVertical,
  Trash2,
  Edit,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  PlusCircle,
  Calendar,
  X,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { formatIDR, formatDateGroup, getMonthDisplayName } from "@/lib/utils";
import { Transaction } from "@/lib/db/types";

export default function HistoryPage() {
  const {
    transactions,
    selectedMonth,
    setSelectedMonth,
    deleteTransaction,
    updateTransaction,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "expense" | "income">("all");
  const [selectedTxForAction, setSelectedTxForAction] = useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Month filter
      if (selectedMonth && !tx.date.startsWith(selectedMonth)) return false;

      // Type filter
      if (activeFilter !== "all" && tx.type !== activeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchPay = tx.paymentMethod.toLowerCase().includes(q);
        const matchBy = tx.recordedBy.toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchPay && !matchBy) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, activeFilter, searchQuery]);

  // Group by Date
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const handleStartEdit = (tx: Transaction) => {
    setSelectedTxForAction(tx);
    setEditDesc(tx.description);
    setEditAmount(String(tx.amount));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTxForAction) return;
    const amt = Number(editAmount.replace(/\D/g, "")) || selectedTxForAction.amount;
    await updateTransaction(selectedTxForAction.id, {
      description: editDesc,
      amount: amt,
    });
    setIsEditing(false);
    setSelectedTxForAction(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus transaksi ini?")) {
      await deleteTransaction(id);
      setSelectedTxForAction(null);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-full">
      {/* HEADER & MONTH PICKER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Riwayat</h1>
        <div className="flex items-center gap-1.5 bg-[#0F162A] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari item, kategori, atau sumber..."
          className="w-full bg-[#0F162A] border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* FILTER PILLS */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "all", label: "Semua" },
          { id: "expense", label: "Pengeluaran" },
          { id: "income", label: "Pemasukan" },
        ].map((f) => {
          const isSel = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`py-1.5 px-4 rounded-xl text-xs font-semibold transition-all ${
                isSel
                  ? "bg-white text-slate-950 shadow-md"
                  : "bg-[#0F162A] border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* TRANSACTION LIST GROUPED BY DATE */}
      {sortedDates.length === 0 ? (
        /* Empty State */
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Belum ada transaksi</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Mulai catat dari tab Tambah atau halaman Pemasukan.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <Link
              href="/"
              className="w-full py-3 bg-white text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-slate-100 transition-colors"
            >
              <span>Catat pengeluaran</span>
              <ArrowDownRight className="w-4 h-4" />
            </Link>
            <Link
              href="/income"
              className="w-full py-3 bg-[#0F162A] border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Catat pemasukan</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedTransactions[dateStr];
            const dayExpenseTotal = dayTxs
              .filter((t) => t.type === "expense")
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <div key={dateStr} className="space-y-2">
                {/* Date Group Header */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>{formatDateGroup(dateStr)}</span>
                  {dayExpenseTotal > 0 && (
                    <span className="text-slate-400 font-semibold">
                      ↓ {formatIDR(dayExpenseTotal)}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {dayTxs.map((tx) => {
                    const isExp = tx.type === "expense";
                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl bg-[#0F162A]/90 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar icon */}
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-extrabold uppercase shrink-0 ${
                              isExp
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                            }`}
                          >
                            {tx.description.charAt(0) || (isExp ? "P" : "I")}
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {tx.description}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {tx.category} • {tx.paymentMethod}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Oleh {tx.recordedBy}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p
                              className={`text-xs font-extrabold ${
                                isExp ? "text-white" : "text-emerald-400"
                              }`}
                            >
                              {isExp ? "" : "+"}
                              {formatIDR(tx.amount)}
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {new Date(tx.createdAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleStartEdit(tx)}
                            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT / DELETE MODAL */}
      {isEditing && selectedTxForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0D1326] border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">Edit Transaksi</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Deskripsi / Barang
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nominal (IDR)
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(selectedTxForAction.id)}
                className="py-2.5 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-300 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
