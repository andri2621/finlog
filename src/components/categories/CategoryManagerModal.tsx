"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Tag,
  Plus,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
  Pencil,
  RotateCw,
  Sparkles,
} from "lucide-react";
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
  if (!isOpen) return null;

  return (
    <CategoryManagerContent
      key={defaultTab}
      onClose={onClose}
      defaultTab={defaultTab}
    />
  );
}

function CategoryManagerContent({
  onClose,
  defaultTab,
}: {
  onClose: () => void;
  defaultTab: CategoryConfig["type"];
}) {
  const {
    expenseCategories,
    paymentMethods,
    incomeCategories,
    addCategoryItem,
    updateCategoryItem,
    reorderCategoryItems,
    deleteCategoryItem,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<CategoryConfig["type"]>(defaultTab);
  const [newItemName, setNewItemName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#10B981");
  const [errorMessage, setErrorMessage] = useState("");

  // Edit / Rename states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [editError, setEditError] = useState("");

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<CategoryConfig | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);

  const currentList =
    activeTab === "expense_category"
      ? expenseCategories
      : activeTab === "payment_method"
      ? paymentMethods
      : incomeCategories;

  const handleAdd = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    if (currentList.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`"${trimmed}" sudah ada di daftar!`);
      return;
    }

    setErrorMessage("");
    await addCategoryItem(activeTab, trimmed, selectedColor);
    setNewItemName("");

    // Auto-scroll list to bottom smoothly so user sees the newly added item
    setTimeout(() => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTo({
          top: listContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const handleStartEdit = (item: CategoryConfig) => {
    setEditingItemId(item.id);
    setEditingName(item.name);
    setEditingColor(item.color);
    setEditError("");
  };

  const handleSaveEdit = async (item: CategoryConfig) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditError("Nama tidak boleh kosong!");
      return;
    }

    const isDuplicate = currentList.some(
      (c) => c.id !== item.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(`Nama "${trimmed}" sudah digunakan!`);
      return;
    }

    await updateCategoryItem(item.id, {
      name: trimmed,
      color: editingColor,
    });
    setEditingItemId(null);
    setEditError("");
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const items = [...currentList];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;

    await reorderCategoryItems(
      activeTab,
      items.map((i) => i.id)
    );
  };

  const handleMoveDown = async (index: number) => {
    if (index >= currentList.length - 1) return;
    const items = [...currentList];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;

    await reorderCategoryItems(
      activeTab,
      items.map((i) => i.id)
    );
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    await deleteCategoryItem(itemToDelete.id);
    setItemToDelete(null);
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
              <p className="text-xs text-slate-400">Ubah urutan, rename, & tambah opsi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Alert */}
        {itemToDelete && (
          <div className="my-3 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 space-y-2.5 animate-in fade-in duration-200">
            <p className="text-xs font-bold text-red-300">
              Hapus &quot;{itemToDelete.name}&quot;?
            </p>
            <p className="text-[11px] text-red-400/90 leading-relaxed">
              Opsi ini akan dihapus dari pilihan input. Catatan transaksi lama yang sudah menggunakan opsi ini tetap aman tersimpan.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Tab Selectors */}
        <div className="grid grid-cols-3 gap-1.5 my-3 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("expense_category");
              setItemToDelete(null);
              setEditingItemId(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "expense_category"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("payment_method");
              setItemToDelete(null);
              setEditingItemId(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "payment_method"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Metode Bayar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("income_category");
              setItemToDelete(null);
              setEditingItemId(null);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "income_category"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* List of items with Reorder & Rename */}
        <div
          ref={listContainerRef}
          className="space-y-2 max-h-64 overflow-y-auto pr-1 scroll-smooth"
        >
          {currentList.map((item, index) => {
            const isEditing = editingItemId === item.id;

            if (isEditing) {
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-900 border-2 border-blue-500/80 space-y-2.5 animate-in fade-in duration-150"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => {
                        setEditError("");
                        setEditingName(e.target.value);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Simpan Nama"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {editError && (
                    <p className="text-[10px] text-red-400 font-medium">{editError}</p>
                  )}

                  {/* Inline Color Palette for Edit */}
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                          editingColor === c ? "scale-125 ring-2 ring-white" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="p-2.5 px-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-2 group hover:border-slate-700 transition-all"
              >
                {/* Left info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {item.name}
                  </span>
                </div>

                {/* Actions: Move Up, Move Down, Rename, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Pindahkan ke atas"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === currentList.length - 1}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title="Pindahkan ke bawah"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit / Rename */}
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item)}
                    className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer ml-1"
                    title="Ubah Nama & Warna"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setItemToDelete(item)}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                    title={`Hapus ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
              onChange={(e) => {
                setErrorMessage("");
                setNewItemName(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Contoh: Skincare, Sedekah, QRIS..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newItemName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>

          {errorMessage && (
            <p className="text-[11px] text-red-400 font-medium animate-in fade-in">
              {errorMessage}
            </p>
          )}

          {/* Color palette */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
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
