/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef } from "react";
import {
  Scan,
  Camera,
  X,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Key,
} from "lucide-react";
import { formatIDR } from "@/lib/utils";

interface ReceiptScannerModalProps {
  onScanResult?: (result: {
    description: string;
    amount: number;
    category: string;
    date: string;
  }) => void;
}

export function ReceiptScannerModal({ onScanResult }: ReceiptScannerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    store: string;
    items: string;
    amount: number;
    category: string;
    date: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageWithGemini = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setExtractedData(null);

    const apiKey =
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      (typeof window !== "undefined" ? localStorage.getItem("finlog_gemini_api_key") : null);

    if (!apiKey) {
      setIsProcessing(false);
      setErrorMessage(
        "API Key Gemini belum diset di file .env.local (NEXT_PUBLIC_GEMINI_API_KEY). Silakan masukkan API Key Gemini gratis Anda dari Google AI Studio."
      );
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: "Analyze this real shopping receipt image in Indonesia. Extract strictly in JSON format with keys: store (string name of merchant/store), items (string summary of main items purchased), amount (numeric integer total price in IDR without punctuation), category (must be one of: Makanan, Transportasi, Tagihan, Kesehatan, Hiburan, Belanja), and date (YYYY-MM-DD format of transaction date). Return ONLY the raw valid JSON object without markdown formatting.",
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
            setExtractedData({
              store: parsed.store || "Toko Belanja",
              items: parsed.items || "Belanjaan",
              amount: Number(parsed.amount) || 0,
              category: parsed.category || "Belanja",
              date: parsed.date || new Date().toISOString().split("T")[0],
            });
          } else {
            throw new Error("Teks pada struk tidak terbaca jelas oleh AI. Coba foto lebih dekat.");
          }
        } catch (e: any) {
          console.error("Gemini Vision Error:", e);
          setErrorMessage(e.message || "Gagal memproses struk dengan AI.");
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || "Gagal memuat gambar struk.");
    }
  };

  const handleApplyToForm = () => {
    if (extractedData && onScanResult) {
      onScanResult({
        description: `${extractedData.store} - ${extractedData.items}`,
        amount: extractedData.amount,
        category: extractedData.category,
        date: extractedData.date,
      });
    }
    setIsOpen(false);
    setExtractedData(null);
    setPreviewImage(null);
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Pindai Struk Belanja"
        className="fixed bottom-20 right-4 sm:right-[calc(50%-200px)] z-30 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer touch-manipulation"
      >
        <Scan className="w-6 h-6 stroke-[2.2] group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
        </span>
      </button>

      {/* SCANNER MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300"
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
                      Live Vision
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otomatis membaca foto struk belanja nyata
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content / Camera View Area */}
            <div className="my-4 space-y-4">
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center transition-all">
                {previewImage ? (
                  <div className="w-full max-h-48 rounded-xl overflow-hidden mb-3 border border-slate-200 dark:border-slate-700">
                    <img
                      src={previewImage}
                      alt="Preview Struk"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-emerald-500 mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                )}

                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Ambil Foto atau Upload Struk Asli
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
                  Google Gemini 1.5 Flash Vision akan membaca nama toko, total rupiah, dan kategori secara langsung dari foto.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setPreviewImage(URL.createObjectURL(file));
                      processImageWithGemini(file);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer touch-manipulation"
                >
                  <UploadCloud className="w-4 h-4" />
                  Pilih Foto dari Galeri / Kamera
                </button>
              </div>

              {/* Processing Loader */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-300">
                    <p className="font-semibold">AI Sedang Membaca Struk Nyata...</p>
                    <p className="text-[11px]">Mengekstrak harga & kategori</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Extracted Result Preview */}
              {extractedData && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/40 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-emerald-500 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Hasil Bacaan AI Berhasil
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Toko:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{extractedData.store}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Barang:</span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {extractedData.items}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Kategori:</span>
                      <span className="font-semibold text-emerald-500">{extractedData.category}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Total Nominal:</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatIDR(extractedData.amount)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="w-full mt-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer touch-manipulation"
                  >
                    Gunakan Data Ini ke Form Pengeluaran
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
