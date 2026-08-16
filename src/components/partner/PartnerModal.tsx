"use client";

import React, { useState } from "react";
import { Users, X, Copy, Check, Share2, Heart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerModal({ isOpen, onClose }: PartnerModalProps) {
  const { user, partner, activeProfile, switchUser, spreadsheetId } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `https://finlog.app/join?sheetId=${spreadsheetId || "demo-finlog-sheet"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Yuk catat keuangan bareng di FinLog!",
        text: "Aku mengundang kamu untuk mencatat pengeluaran & tabungan bersama di Google Sheet FinLog kita.",
        url: inviteLink,
      });
    } else {
      handleCopy();
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
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Heart className="w-5 h-5 fill-pink-500/30" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ajak Pasangan (Fifin ❤️)</h3>
              <p className="text-xs text-slate-400">Catat keuangan bersama di 1 Google Sheet</p>
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/30 via-slate-900 to-slate-900 border border-pink-500/20">
            <div className="flex items-center gap-2 text-pink-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                1 Spreadsheet, 2 Pengguna
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kirimkan link undangan ini ke Fifin / pasanganmu. Saat pasanganmu mencatat di FinLog, data langsung tersimpan ke Google Sheet yang sama secara real-time tanpa database luar!
            </p>
          </div>

          {/* Invite Link Box */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Link Undangan Pasangan:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-pink-500/20"
          >
            <Share2 className="w-4 h-4" />
            Bagikan via WhatsApp ke Pasangan
          </button>

          {/* Quick Demo Switcher */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              Uji Coba Ganti Akun Pasangan:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  switchUser("primary");
                  onClose();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  activeProfile === "primary"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                👤 Andri Setiawan
              </button>
              <button
                type="button"
                onClick={() => {
                  switchUser("partner");
                  onClose();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  activeProfile === "partner"
                    ? "bg-pink-500 text-slate-950 font-bold shadow-md shadow-pink-500/20"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                }`}
              >
                ❤️ Fifin (Pasangan)
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data tersimpan aman di Google Drive Anda berdua.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
