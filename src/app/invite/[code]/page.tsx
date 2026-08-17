"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useFinance } from "@/lib/context/FinanceContext";
import confetti from "canvas-confetti";

interface InviteData {
  id: string;
  invite_code: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  status: string;
  inviter: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = typeof params.code === "string" ? params.code.toUpperCase() : "";
  const { user, loginWithGoogle, setSpreadsheet } = useAuth();
  const { syncNow } = useFinance();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadInvite() {
      if (!inviteCode) {
        setError("Kode undangan tidak valid.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from("partner_invites")
          .select(`
            id,
            invite_code,
            spreadsheet_id,
            spreadsheet_name,
            status,
            inviter:profiles!inviter_id (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq("invite_code", inviteCode)
          .eq("status", "active")
          .single();

        if (fetchErr || !data) {
          setError("Undangan tidak ditemukan atau sudah tidak aktif.");
        } else {
          setInviteData(data as any);
        }
      } catch (err: any) {
        console.error(err);
        setError("Gagal memuat data undangan.");
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [inviteCode, supabase]);

  const handleAcceptLoggedIn = async () => {
    if (!inviteData || !user) return;
    setIsAccepting(true);

    try {
      // 1. Update user profile in Supabase
      const { data: authSession } = await supabase.auth.getSession();
      const currentUserId = authSession?.session?.user?.id;

      if (currentUserId) {
        await supabase
          .from("profiles")
          .update({
            partner_id: inviteData.inviter.id,
            spreadsheet_id: inviteData.spreadsheet_id,
            spreadsheet_name: inviteData.spreadsheet_name || "FINLOG",
            onboarding_completed: true,
          })
          .eq("id", currentUserId);

        // Also link inviter to this user
        await supabase
          .from("profiles")
          .update({
            partner_id: currentUserId,
          })
          .eq("id", inviteData.inviter.id);
      }

      // 2. Set spreadsheet in local finance context and Dexie DB
      await setSpreadsheet(inviteData.spreadsheet_id, inviteData.spreadsheet_name || "FINLOG");

      // 3. Trigger initial sync pull from spreadsheet
      await syncNow().catch(() => {});

      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#EC4899", "#10B981", "#3B82F6"],
      });

      setTimeout(() => {
        router.replace("/");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError("Gagal menerima undangan. Coba lagi.");
      setIsAccepting(false);
    }
  };

  const handleAcceptWithGoogle = async () => {
    try {
      setIsAccepting(true);
      // Initiate OAuth with invite_code param so the callback automatically links
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?invite_code=${inviteCode}&next=/`,
          scopes: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file email profile",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal masuk dengan Google");
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500">Memeriksa undangan...</p>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20 shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
          Undangan Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
          {error || "Kode undangan ini mungkin sudah kadaluwarsa atau tidak valid."}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="py-3 px-6 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md cursor-pointer"
        >
          Kembali ke FinLog
        </button>
      </div>
    );
  }

  const inviterName = inviteData.inviter?.name || "Pasanganmu";

  return (
    <div className="min-h-screen p-4 sm:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0D1628] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/30 text-pink-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">
            <Heart className="w-3.5 h-3.5 fill-pink-500 animate-pulse" />
            <span>Undangan Kolaborasi FinLog</span>
          </div>
        </div>

        {/* Inviter Avatar & Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-pink-500/25 ring-4 ring-white dark:ring-[#0D1628]">
            {inviterName.charAt(0)}
          </div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {inviterName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Mengundangmu untuk mencatat & mengelola keuangan bersama di Google Sheets.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 rounded-2xl bg-slate-50 dark:bg-[#0F1E36] p-3.5 border border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <span>Dashboard & anggaran bersama real-time</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0">
              <Heart className="w-3.5 h-3.5" />
            </div>
            <span>Target impian & tabungan masa depan</span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span>Otomatis sinkron ke 1 Spreadsheet</span>
          </div>
        </div>

        {/* Action Button */}
        {user ? (
          <button
            type="button"
            onClick={handleAcceptLoggedIn}
            disabled={isAccepting}
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
          >
            {isAccepting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Heart className="w-4 h-4 fill-white" />
                <span>Terima & Gabung Bersama {inviterName}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAcceptWithGoogle}
            disabled={isAccepting}
            className="w-full py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-pink-500 text-slate-900 dark:text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
          >
            {isAccepting ? (
              <span className="inline-block w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk Google & Terima Undangan</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
