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
  const [extractedData, setExtractedData] = useState<{
    store: string;
    items: string;
    amount: number;
    category: string;
    date: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSimulateScan = (sampleType: "indomaret" | "resto" | "kopi") => {
    setIsProcessing(true);
    setExtractedData(null);

    setTimeout(() => {
      setIsProcessing(false);
      if (sampleType === "indomaret") {
        setExtractedData({
          store: "Indomaret Point",
          items: "Susu UHT, Roti Tawar & Air Mineral",
          amount: 48500,
          category: "Belanja",
          date: new Date().toISOString().split("T")[0],
        });
      } else if (sampleType === "resto") {
        setExtractedData({
          store: "Nasi Padang Sederhana",
          items: "2 Paket Ayam Gulai + Es Teh Manis",
          amount: 65000,
          category: "Makanan",
          date: new Date().toISOString().split("T")[0],
        });
      } else {
        setExtractedData({
          store: "Kopi Kenangan",
          items: "Kopi Kenangan Mantan Large",
          amount: 24000,
          category: "Makanan",
          date: new Date().toISOString().split("T")[0],
        });
      }
    }, 1200);
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
        className="fixed bottom-20 right-4 sm:right-[calc(50%-200px)] z-30 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all duration-200 group"
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
            className="w-full max-w-md bg-[#0D1326] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Pindai Struk AI
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Fase Terakhir
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Otomatis ekstrak total belanja dari struk
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content / Camera View Area */}
            <div className="my-4">
              <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center transition-all">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>

                <p className="text-sm font-semibold text-white mb-1">
                  Ambil Foto atau Unggah Struk
                </p>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Sistem AI (Gemini Vision) akan mendeteksi total harga, toko, dan barang belanja secara otomatis.
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
                      handleSimulateScan("indomaret");
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  Pilih Foto dari Galeri / Kamera
                </button>
              </div>

              {/* Quick Simulator Buttons */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Tes Simulasi Scan Struk Cepat:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSimulateScan("indomaret")}
                    className="p-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left transition-all"
                  >
                    <p className="text-xs font-medium text-white">🏪 Indomaret</p>
                    <p className="text-[11px] text-emerald-400">Rp 48.500</p>
                  </button>
                  <button
                    onClick={() => handleSimulateScan("resto")}
                    className="p-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left transition-all"
                  >
                    <p className="text-xs font-medium text-white">🍛 Nasi Padang</p>
                    <p className="text-[11px] text-emerald-400">Rp 65.000</p>
                  </button>
                  <button
                    onClick={() => handleSimulateScan("kopi")}
                    className="p-2.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left transition-all"
                  >
                    <p className="text-xs font-medium text-white">☕ Kopi Kenangan</p>
                    <p className="text-[11px] text-emerald-400">Rp 24.000</p>
                  </button>
                </div>
              </div>

              {/* Processing Loader */}
              {isProcessing && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-xs text-emerald-300">
                    <p className="font-semibold">AI Sedang Membaca Struk...</p>
                    <p className="text-[11px] text-emerald-400/80">Mengekstrak harga & kategori</p>
                  </div>
                </div>
              )}

              {/* Extracted Result Preview */}
              {extractedData && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Hasil Scan Berhasil
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Toko:</span>
                      <span className="font-semibold text-white">{extractedData.store}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Barang:</span>
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {extractedData.items}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Kategori:</span>
                      <span className="font-semibold text-emerald-400">{extractedData.category}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Total Nominal:</span>
                      <span className="text-sm font-bold text-white">
                        {formatIDR(extractedData.amount)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyToForm}
                    className="w-full mt-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
                  >
                    Gunakan Data Ini ke Form Pengeluaran
                  </button>
                </div>
              )}

              {/* Under Construction Banner */}
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Catatan Rilis:</strong> Fitur Scan Struk otomatis berbasis OCR/Vision AI terdaftar pada rilis tahap akhir. Anda sudah dapat mengujinya dengan simulasi di atas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
