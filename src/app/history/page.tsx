"use client";

import React, { useState, useMemo, useRef } from "react";
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
  ChevronDown,
  X,
} from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { useAuth } from "@/lib/context/AuthContext";
import {
  formatIDR,
  formatDateGroup,
  getMonthDisplayName,
  formatInputNumber,
  parseInputNumber,
} from "@/lib/utils";
import { Transaction } from "@/lib/db/types";
import { UserFilterDropdown } from "@/components/ui/UserFilterDropdown";

export default function HistoryPage() {
  const { user, partner } = useAuth();
  const {
    transactions,
    selectedMonth,
    setSelectedMonth,
    selectedUserFilter,
    deleteTransaction,
    updateTransaction,
    expenseCategories,
    incomeCategories,
    paymentMethods,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "expense" | "income"
  >("all");
  const [selectedTxForAction, setSelectedTxForAction] =
    useState<Transaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDate, setEditDate] = useState("");
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Month filter
      if (selectedMonth && tx.date && !tx.date.startsWith(selectedMonth))
        return false;

      // User filter (All, Me, Partner)
      const rec = (tx.recordedBy || "").trim().toLowerCase();
      const meName = (user?.name || "").trim().toLowerCase();
      const meEmail = (user?.email || "").trim().toLowerCase();
      const partnerName = (partner?.name || "").trim().toLowerCase();
      const partnerEmail = (partner?.email || "").trim().toLowerCase();

      const isMe = Boolean(
        (meName && rec === meName) || (meEmail && rec === meEmail),
      );
      const isPartner = Boolean(
        (partnerName && rec === partnerName) ||
        (partnerEmail && rec === partnerEmail) ||
        (!isMe && rec !== ""),
      );

      if (selectedUserFilter === "me") {
        if (!isMe && meName) return false;
      } else if (selectedUserFilter === "partner") {
        if (!isPartner) return false;
      }

      // Type filter
      if (activeFilter !== "all" && tx.type !== activeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = (tx.description || "").toLowerCase().includes(q);
        const matchCat = (tx.category || "").toLowerCase().includes(q);
        const matchPay = (tx.paymentMethod || "").toLowerCase().includes(q);
        const matchBy = (tx.recordedBy || "").toLowerCase().includes(q);
        if (!matchDesc && !matchCat && !matchPay && !matchBy) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedMonth,
    selectedUserFilter,
    user?.name,
    user?.email,
    partner?.name,
    partner?.email,
    activeFilter,
    searchQuery,
  ]);

  // Group by Date
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date || "Tanpa Tanggal";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a),
  );

  const handleStartEdit = (tx: Transaction) => {
    setSelectedTxForAction(tx);
    setEditDesc(tx.description || "");
    setEditAmount(formatInputNumber(String(tx.amount || 0)));
    setEditCategory(tx.category || "");
    setEditPaymentMethod(tx.paymentMethod || "");
    setEditDate(tx.date || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTxForAction) return;
    const amt = parseInputNumber(editAmount) || selectedTxForAction.amount;
    await updateTransaction(selectedTxForAction.id, {
      description: editDesc.trim(),
      amount: amt,
      category: editCategory,
      paymentMethod: editPaymentMethod,
      date: editDate || selectedTxForAction.date,
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
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Riwayat
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {filteredTransactions.length} catatan transaksi
          </p>
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

      {/* SEARCH BAR */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari transaksi, kategori, atau pencatat..."
          className="w-full bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveFilter("all")}
          className={`py-2 rounded-xl transition-all ${
            activeFilter === "all"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveFilter("expense")}
          className={`py-2 rounded-xl transition-all ${
            activeFilter === "expense"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Pengeluaran
        </button>
        <button
          onClick={() => setActiveFilter("income")}
          className={`py-2 rounded-xl transition-all ${
            activeFilter === "income"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Pemasukan
        </button>
      </div>

      {/* TRANSACTION LIST GROUPED BY DATE */}
      {sortedDates.length === 0 ? (
        <div className="my-auto py-12 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800">
          <Receipt className="w-10 h-10 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Tidak ada transaksi ditemukan
          </p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Belum ada catatan pada periode ini. Mulai mencatat pengeluaran atau
            pemasukan baru sekarang.
          </p>
          <Link
            href={
              activeFilter === "income"
                ? "/add?type=income"
                : activeFilter === "expense"
                  ? "/add?type=expense"
                  : "/add"
            }
            className="mt-4 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {activeFilter === "income"
                ? "Catat Pemasukan"
                : activeFilter === "expense"
                  ? "Catat Pengeluaran"
                  : "Catat Transaksi"}
            </span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedTransactions[dateStr] || [];
            const dayTotalExpense = dayTxs
              .filter((tx) => tx.type === "expense")
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            const dayTotalIncome = dayTxs
              .filter((tx) => tx.type === "income")
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span>{formatDateGroup(dateStr)}</span>
                  <div className="flex items-center gap-2">
                    {dayTotalIncome > 0 && activeFilter !== "expense" && (
                      <span className="text-emerald-500 font-semibold">
                        +{formatIDR(dayTotalIncome)}
                      </span>
                    )}
                    {dayTotalExpense > 0 && activeFilter !== "income" && (
                      <span className="text-rose-500 font-semibold">
                        -{formatIDR(dayTotalExpense)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items in this date */}
                <div className="rounded-3xl bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-md overflow-hidden">
                  {dayTxs.map((tx) => {
                    const isExpense = tx.type === "expense";
                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTxForAction(tx)}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                              isExpense
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}
                          >
                            {isExpense ? (
                              <ArrowDownRight className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {tx.description ||
                                (isExpense ? "Pengeluaran" : "Pemasukan")}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {tx.category || "Umum"} •{" "}
                              {tx.paymentMethod || "Cash"} • Oleh{" "}
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {tx.recordedBy || user?.name || "Saya"}
                              </span>
                            </p>
                            <p
                              className={`text-xs font-extrabold ${
                                isExpense
                                  ? "text-red-500"
                                  : "text-emerald-500"
                              }`}
                            >
                              {isExpense ? "-" : "+"}
                              {formatIDR(tx.amount || 0)}
                            </p>
                          </div>
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

      {/* DETAIL / ACTION MODAL */}
      {selectedTxForAction && !isEditing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detail Transaksi
              </h3>
              <button
                onClick={() => setSelectedTxForAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Deskripsi:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTxForAction.description}
                </span>
              </div>
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Jumlah:
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {formatIDR(selectedTxForAction.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Kategori:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedTxForAction.category}
                </span>
              </div>
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Metode Bayar:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedTxForAction.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Dicatat Oleh:
                </span>
                <span className="font-semibold text-emerald-500">
                  {selectedTxForAction.recordedBy || user?.name || "Saya"}
                </span>
              </div>
              <div className="flex justify-between py-1 gap-2">
                <span className="text-slate-500 dark:text-slate-400">
                  Tanggal:
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {selectedTxForAction.date}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleStartEdit(selectedTxForAction)}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(selectedTxForAction.id)}
                className="py-2.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/15 dark:hover:bg-red-500/25 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditing && selectedTxForAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
              Edit Transaksi
            </h3>

            {/* Deskripsi */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Deskripsi
              </label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Jumlah */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Jumlah (IDR)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={editAmount}
                onChange={(e) =>
                  setEditAmount(formatInputNumber(e.target.value))
                }
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Kategori — adapt to expense vs income */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Kategori
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(selectedTxForAction.type === "income"
                  ? incomeCategories
                  : expenseCategories
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEditCategory(cat.name)}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      editCategory === cat.name
                        ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 ring-1 ring-emerald-500/40"
                        : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setEditPaymentMethod(method.name)}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      editPaymentMethod === method.name
                        ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 ring-1 ring-emerald-500/40"
                        : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span className="truncate">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
