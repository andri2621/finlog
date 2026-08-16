"use client";

import React, { useState } from "react";
import { X, Tag, Plus, Trash2, Check, CreditCard, Link2 } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { CategoryConfig } from "@/lib/db/types";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "expense_category" | "payment_method" | "income_category";
}

const COLOR_PALETTE = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E",
  "#10B981", "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#64748B"
];

export function CategoryManagerModal({
  isOpen,
  onClose,
  defaultTab = "expense_category",
}: CategoryManagerModalProps) {
  const {
    expenseCategories,
    paymentMethods,
    incomeCategories,
    addCategoryItem,
    deleteCategoryItem,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<CategoryConfig["type"]>(defaultTab);
  const [newItemName, setNewItemName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#10B981");

  if (!isOpen) return null;

  const currentList =
    activeTab === "expense_category"
      ? expenseCategories
      : activeTab === "payment_method"
      ? paymentMethods
      : incomeCategories;

  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    await addCategoryItem(activeTab, newItemName.trim(), selectedColor);
    setNewItemName("");
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
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Kelola Kategori & Metode</h3>
              <p className="text-xs text-slate-400">Kustomisasi pengelompokan transaksi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="grid grid-cols-3 gap-1.5 my-3 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab("expense_category")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "expense_category"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setActiveTab("payment_method")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "payment_method"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Metode Bayar
          </button>
          <button
            onClick={() => setActiveTab("income_category")}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "income_category"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* List of items */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {currentList.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-white">{item.name}</span>
              </div>

              <button
                onClick={() => deleteCategoryItem(item.id)}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Item Form */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            + Tambah {activeTab === "expense_category" ? "Kategori" : activeTab === "payment_method" ? "Metode" : "Sumber"} Baru
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Contoh: Skincare, Sedekah, QRIS..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newItemName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Color palette */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  selectedColor === c ? "scale-125 ring-2 ring-white" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
