"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  X,
  Copy,
  Check,
  Share2,
  Heart,
  ShieldCheck,
  Sparkles,
  Link2,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "invite" | "join";
}

export function PartnerModal({ isOpen, onClose, defaultTab = "invite" }: PartnerModalProps) {
  if (!isOpen) return null;

  return (
    <PartnerModalContent
      key={defaultTab}
      onClose={onClose}
      defaultTab={defaultTab}
    />
  );
}

function PartnerModalContent({
  onClose,
  defaultTab,
}: {
  onClose: () => void;
  defaultTab: "invite" | "join";
}) {
  const { user, partner, spreadsheetId, spreadsheetName, inviteCode, setSpreadsheet } = useAuth();
  const { syncNow } = useFinance();
  const [activeTab, setActiveTab] = useState<"invite" | "join">(defaultTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeCode, setActiveCode] = useState<string>(inviteCode || "");
  
  // Join with code state
  const [inputCode, setInputCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState(false);

  const supabase = createClient();

  // Ensure active invite record exists in partner_invites table
  useEffect(() => {
    async function ensureInviteRecord() {
      if (!spreadsheetId) return;

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
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

          // Upsert active invite record
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
  }, [spreadsheetId, spreadsheetName, supabase]);

  const host = typeof window !== "undefined" ? window.location.origin : "https://finlog.app";
  const displayCode = activeCode || inviteCode || "FIN-PAIR";
  const inviteLink = `${host}/invite/${displayCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShare = () => {
    const textMessage = `Yuk catat keuangan bareng di FinLog! 💕\n\n1. Buka link ini untuk gabung:\n${inviteLink}\n\n2. Atau jika sudah install aplikasinya, masukkan kode undangan:\n👉 KODE: ${displayCode}`;
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

  const handleJoinWithCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formattedCode = inputCode.trim().toUpperCase();
    if (!formattedCode) {
      setJoinError("Masukkan kode undangan pasangan.");
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      // 1. Try RPC get_invite_details first
      let targetInvite: any = null;
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_invite_details", {
        p_invite_code: formattedCode,
      });

      if (!rpcErr && rpcData && rpcData.spreadsheet_id) {
        targetInvite = rpcData;
      } else {
        // Fallback to direct select
        const { data, error: selectErr } = await supabase
          .from("partner_invites")
          .select("id, inviter_id, invite_code, spreadsheet_id, spreadsheet_name, status")
          .eq("invite_code", formattedCode)
          .eq("status", "active")
          .maybeSingle();

        if (selectErr || !data) {
          setJoinError("Kode undangan tidak ditemukan atau sudah tidak aktif.");
          setIsJoining(false);
          return;
        }
        targetInvite = data;
      }

      // Check if user is trying to connect with their own code
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser && targetInvite.inviter_id === authUser.id) {
        setJoinError("Ini adalah kode undangan Anda sendiri. Masukkan kode dari pasangan Anda.");
        setIsJoining(false);
        return;
      }

      // 2. Link in Supabase profiles
      if (authUser) {
        await supabase
          .from("profiles")
          .update({
            partner_id: targetInvite.inviter_id,
            spreadsheet_id: targetInvite.spreadsheet_id,
            spreadsheet_name: targetInvite.spreadsheet_name || "FINLOG",
            onboarding_completed: true,
          })
          .eq("id", authUser.id);

        await supabase
          .from("profiles")
          .update({
            partner_id: authUser.id,
          })
          .eq("id", targetInvite.inviter_id);
      }

      // 3. Set spreadsheet locally
      await setSpreadsheet(targetInvite.spreadsheet_id, targetInvite.spreadsheet_name || "FINLOG");
      await syncNow().catch(() => {});

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#EC4899", "#10B981", "#3B82F6"],
      });

      setJoinSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setJoinError("Terjadi kendala saat menghubungkan akun. Silakan coba lagi.");
    } finally {
      setIsJoining(false);
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
              <h3 className="text-base font-bold text-white">Kolaborasi Pasangan</h3>
              <p className="text-xs text-slate-400">1 Spreadsheet Google, dikelola berdua</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Partner already connected indicator */}
        {partner && (
          <div className="my-3 p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                {partner.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Terhubung dengan {partner.name}</p>
                <p className="text-[10px] text-emerald-400 font-medium">Sinkronisasi bersama aktif</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
        )}

        {/* Tab Switcher: Invite vs Join with Code */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-2xl border border-slate-800 my-4">
          <button
            type="button"
            onClick={() => setActiveTab("invite")}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "invite"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-pink-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Ajak Pasangan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("join")}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "join"
                ? "bg-slate-800 text-white shadow-sm ring-1 ring-pink-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Gabung dengan Kode
          </button>
        </div>

        {/* TAB 1: INVITE PARTNER */}
        {activeTab === "invite" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-950/30 via-slate-900 to-slate-900 border border-pink-500/20 space-y-2">
              <div className="flex items-center gap-2 text-pink-400">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cara Kerja Undangan
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kirim link atau kode undangan ini ke pasanganmu. Pasanganmu bisa langsung klik link atau memasukkan kode ini di aplikasi FinLog miliknya.
              </p>
            </div>

            {/* Code Highlight Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Kode Undangan Pasangan:</p>
                <p className="text-base font-extrabold text-pink-400 font-mono tracking-wider">{displayCode}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Disalin" : "Salin Kode"}</span>
              </button>
            </div>

            {/* Link Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Link Undangan Cepat:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer border border-slate-700"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Tersalin" : "Salin Link"}</span>
                </button>
              </div>
            </div>

            {/* Share WhatsApp Button */}
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/25 active:scale-[0.98] cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan via WhatsApp ke Pasangan</span>
            </button>
          </div>
        )}

        {/* TAB 2: JOIN WITH CODE */}
        {activeTab === "join" && (
          <form onSubmit={handleJoinWithCode} className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-900 border border-blue-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-400">
                <Link2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Masukkan Kode dari Pasangan
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Punya kode undangan dari pasanganmu? Masukkan di bawah ini untuk langsung terhubung ke spreadsheet yang sama.
              </p>
            </div>

            {joinSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-white">Berhasil Terhubung!</p>
                <p className="text-[11px] text-emerald-400/90">
                  Akun Anda dan pasangan kini otomatis tersinkronisasi ke Google Sheet yang sama.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Kode Undangan (6 Karakter)
                  </label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setJoinError("");
                      setInputCode(e.target.value.toUpperCase());
                    }}
                    placeholder="Contoh: FIN-7A2B atau 7A2B"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-3 text-sm font-mono font-extrabold text-white tracking-widest placeholder:tracking-normal placeholder:text-xs placeholder:font-normal focus:outline-none focus:border-pink-500 uppercase"
                  />
                </div>

                {joinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoining || !inputCode.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 cursor-pointer"
                >
                  {isJoining ? (
                    <RotateCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Hubungkan Akun Pasangan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        )}

        {/* Privacy Note */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center pt-3 mt-2 border-t border-slate-800/80">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data keuangan tersimpan aman di Google Drive Anda berdua.</span>
        </div>
      </div>
    </div>
  );
}
