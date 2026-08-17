"use client";

import React, { useState, useEffect } from "react";
import { Users, X, Copy, Check, Share2, Heart, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerModal({ isOpen, onClose }: PartnerModalProps) {
  const { user, partner, spreadsheetId, spreadsheetName, inviteCode } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeCode, setActiveCode] = useState<string>(inviteCode || "");
  const supabase = createClient();

  // Ensure active invite record exists in partner_invites table
  useEffect(() => {
    async function ensureInviteRecord() {
      if (!isOpen || !spreadsheetId) return;

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          // Check profile's invite_code or create one
          const { data: profile } = await supabase
            .from("profiles")
            .select("invite_code")
            .eq("id", authUser.id)
            .single();

          let code = profile?.invite_code;
          if (!code) {
            code = "FIN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
            await supabase.from("profiles").update({ invite_code: code }).eq("id", authUser.id);
          }

          setActiveCode(code);

          // Upsert active invite record in partner_invites table
          await supabase.from("partner_invites").upsert(
            {
              inviter_id: authUser.id,
              invite_code: code,
              spreadsheet_id: spreadsheetId,
              spreadsheet_name: spreadsheetName || "FINLOG",
              status: "active",
            },
            { onConflict: "invite_code" }
          );
        }
      } catch (e) {
        console.warn("Partner invite record sync:", e);
      }
    }

    ensureInviteRecord();
  }, [isOpen, spreadsheetId, spreadsheetName, supabase]);

  if (!isOpen) return null;

  const host = typeof window !== "undefined" ? window.location.origin : "https://finlog.app";
  const displayCode = activeCode || inviteCode || "FIN-PAIR";
  const inviteLink = `${host}/invite/${displayCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    const textMessage = `Yuk catat keuangan bareng di FinLog! Klik link ini untuk gabung ke spreadsheet kita: ${inviteLink}`;
    if (navigator.share) {
      navigator.share({
        title: "Yuk catat keuangan bareng di FinLog!",
        text: textMessage,
        url: inviteLink,
      });
    } else {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
      window.open(waUrl, "_blank");
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
              <h3 className="text-base font-bold text-white">Ajak Pasangan</h3>
              <p className="text-xs text-slate-400">Catat keuangan bersama di 1 Google Sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
              Kirimkan link undangan ini ke pasanganmu. Saat pasanganmu membuka link ini dan login, akun kalian otomatis terhubung ke Google Sheet yang sama secara instan!
            </p>
          </div>

          {/* Invite Code & Link Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Link Undangan Pasangan:
              </label>
              <span className="text-[11px] font-bold text-pink-400 font-mono bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                Kode: {displayCode}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Tersalin" : "Salin"}</span>
              </button>
            </div>
          </div>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan via WhatsApp ke Pasangan</span>
          </button>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data tersimpan aman di Google Drive Anda berdua.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
