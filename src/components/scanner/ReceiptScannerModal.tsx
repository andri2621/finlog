/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef } from "react";
import {
  Scan,
  Camera,
  X,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Save,
} from "lucide-react";
import { getTodayString, formatInputNumber, parseInputNumber } from "@/lib/utils";
import { useFinance } from "@/lib/context/FinanceContext";
import confetti from "canvas-confetti";

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToForm?: (data: {
    description: string;
    amountStr: string;
    category: string;
    paymentMethod: string;
    date: string;
  }) => void;
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onApplyToForm,
}: ReceiptScannerModalProps) {
  const { addTransaction, expenseCategories, paymentMethods } = useFinance();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState<{
    description: string;
    amountStr: string;
    category: string;
    paymentMethod: string;
    date: string;
  } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setPreviewImage(null);
    setErrorMessage(null);
    setFormData(null);
    setSaveSuccess(false);
    onClose();
  };

  const processImageWithGemini = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setFormData(null);
    setSaveSuccess(false);

    const apiKey =
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      (typeof window !== "undefined" ? localStorage.getItem("finlog_gemini_api_key") : null);

    if (!apiKey) {
      setIsProcessing(false);
      setErrorMessage("API Key Gemini belum diset. Tambahkan NEXT_PUBLIC_GEMINI_API_KEY di file .env.local");
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: "Analyze this shopping receipt image from Indonesia. Extract strictly as a raw JSON object (no markdown) with these exact keys: store (string: merchant/store brand name only, e.g. 'BreadTalk', 'Alfamart', 'Indomaret'), items (string: all purchased items with their quantities in format 'qty item name' comma-separated, e.g. '1 Cream Bruille, 1 Choco Croissant, 2 Teh Pucuk'), amount (integer: TOTAL price in IDR, digits only, no punctuation), category (one of: Makanan, Transportasi, Tagihan, Kesehatan, Hiburan, Belanja), date (YYYY-MM-DD from receipt, or today if not found). Return ONLY the raw JSON object.",
                      },
                      {
                        inline_data: {
                          mime_type: file.type || "image/jpeg",
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gagal membaca struk via Gemini API: ${errText}`);
          }

          const data = await response.json();
          const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResult) {
            const cleanJson = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            const amount = Number(parsed.amount) || 0;
            const defaultCategory =
              expenseCategories.find((c) => c.name === parsed.category)?.name ||
              expenseCategories[0]?.name ||
              "Makanan";
            const defaultPayment = paymentMethods[0]?.name || "Cash";
            const rawDate = parsed.date || getTodayString();
            const dateStr = rawDate.match(/^\d{4}-\d{2}-\d{2}$/) ? rawDate : getTodayString();

            setFormData({
              description: `${parsed.store || "Toko"} - ${parsed.items || "Belanjaan"}`,
              amountStr: formatInputNumber(String(amount)),
              category: defaultCategory,
              paymentMethod: defaultPayment,
              date: dateStr,
            });
          } else {
            throw new Error("Struk tidak terbaca jelas. Coba foto lebih dekat / terang.");
          }
        } catch (e: any) {
          console.error("Gemini Vision Error:", e);
          setErrorMessage(e.message || "Gagal memproses struk dengan AI.");
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (e: any) {
      console.error("File Read Error:", e);
      setErrorMessage("Gagal membaca file foto struk.");
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;
    const finalAmount = parseInputNumber(formData.amountStr);
    if (!formData.description.trim() || finalAmount <= 0) {
      setErrorMessage("Deskripsi dan nominal harus valid.");
      return;
    }

    setIsSaving(true);
    try {
      await addTransaction({
        date: formData.date || getTodayString(),
        type: "expense",
        description: formData.description.trim(),
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        amount: finalAmount,
      });

      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10B981", "#3B82F6", "#F59E0B"],
      });

      setSaveSuccess(true);
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      console.error(err);
      setErrorMessage("Gagal menyimpan transaksi. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewImage(URL.createObjectURL(file));
      processImageWithGemini(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300"
        role="dialog"
        aria-modal="true"
      >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Pindai Struk AI
                    <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Gemini Vision
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formData ? "Cek & edit sebelum disimpan" : "Foto struk atau pilih dari galeri"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* SUCCESS */}
              {saveSuccess && (
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Transaksi Tersimpan!</p>
                </div>
              )}

              {/* STEP 1: Upload (Camera or Gallery) */}
              {!formData && !saveSuccess && (
                <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-5 flex flex-col items-center justify-center text-center transition-all">
                  {previewImage ? (
                    <div className="w-full max-h-48 rounded-xl overflow-hidden mb-3 border border-slate-200 dark:border-slate-700">
                      <img src={previewImage} alt="Preview Struk" className="w-full h-48 object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-emerald-500 mb-2.5">
                      <Camera className="w-7 h-7" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Upload Struk Belanja</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                    AI membaca nama toko, rincian barang, dan total pengeluaran otomatis.
                  </p>

                  {/* Hidden Input 1: Direct Camera */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Hidden Input 2: Gallery / File Picker */}
                  <input
                    type="file"
                    accept="image/*"
                    ref={galleryInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* 2 Options: Camera vs Gallery */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer touch-manipulation"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-3 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer touch-manipulation"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                      <span>Pilih Galeri</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Processing */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-300">
                    <p className="font-semibold">AI Sedang Membaca Struk...</p>
                    <p className="text-[11px]">Mengekstrak harga & kategori</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* STEP 2: Editable Review Form */}
              {formData && !saveSuccess && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {previewImage && (
                    <div className="w-full h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={previewImage} alt="Struk" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Struk terbaca. Cek & edit jika perlu, lalu simpan.
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total (IDR)</label>
                    <div className="flex items-baseline gap-2 bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
                      <span className="text-sm font-bold text-slate-400">IDR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.amountStr === "0" ? "" : formData.amountStr}
                        onChange={(e) => {
                          const formatted = formatInputNumber(e.target.value);
                          setFormData((prev) => prev ? { ...prev, amountStr: formatted || "0" } : null);
                        }}
                        className="w-full bg-transparent text-2xl font-extrabold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Keterangan</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => prev ? { ...prev, description: e.target.value } : null)}
                      className="w-full bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kategori</label>
                    <div className="grid grid-cols-3 gap-2">
                      {expenseCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData((prev) => prev ? { ...prev, category: cat.name } : null)}
                          className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            formData.category === cat.name
                              ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 ring-1 ring-emerald-500/40"
                              : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Metode Bayar</label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setFormData((prev) => prev ? { ...prev, paymentMethod: method.name } : null)}
                          className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            formData.paymentMethod === method.name
                              ? "bg-slate-900 dark:bg-slate-800 text-white border-emerald-500 ring-1 ring-emerald-500/40"
                              : "bg-white dark:bg-[#0F162A]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <span className="truncate">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => prev ? { ...prev, date: e.target.value } : null)}
                      className="w-full bg-white dark:bg-[#0F162A] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setFormData(null); setPreviewImage(null); setErrorMessage(null); }}
                      className="py-3 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Scan Ulang
                    </button>
                    {onApplyToForm && (
                      <button
                        type="button"
                        onClick={() => {
                          if (formData) {
                            onApplyToForm(formData);
                            handleClose();
                          }
                        }}
                        className="py-3 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Gunakan di Form
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || parseInputNumber(formData.amountStr) <= 0}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer touch-manipulation"
                    >
                      {isSaving ? (
                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Simpan Langsung</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
