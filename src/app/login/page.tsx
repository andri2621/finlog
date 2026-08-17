"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Users,
  WifiOff,
  Sliders,
  TrendingUp,
  ShieldCheck,
  Heart,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, spreadsheetId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-between p-5 max-w-md mx-auto relative overflow-hidden">
      {/* BACKGROUND GLOW */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

      {/* TOP HEADER */}
      <div className="w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Fin<span className="text-emerald-500">Log</span>
          </span>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="my-auto py-8 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Catat Berdua Pasangan • Real-time</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          Catat Keuangan Bareng Pasangan di{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
            Google Sheets
          </span>
        </h1>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          Tanpa database eksternal. Semua data tersimpan aman langsung di Google Drive Anda berdua. Bekerja 100% offline-first.
        </p>

        {/* HIGHLIGHT FEATURES GRID */}
        <div className="grid grid-cols-2 gap-2.5 pt-4 text-left">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">1 Sheet, 2 Akun</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Satu spreadsheet untuk pencatatan bersama.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 w-fit">
              <WifiOff className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Offline-First</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Catat tanpa sinyal, otomatis sync saat online.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 w-fit">
              <Sliders className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Batas Anggaran</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Peringatan otomatis di 80% & 100%.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500 w-fit">
              <Heart className="w-4 h-4 fill-pink-500/30" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Tujuan Impian</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Target tabungan nikah, rumah & liburan.
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="w-full space-y-2.5 pb-2">
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#0A0F1D"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#0A0F1D"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#0A0F1D"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#0A0F1D"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>

        {/* <button
          type="button"
          onClick={handleDemo}
          className="w-full py-3 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-2xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <span>Login / Setup Spreadsheet Manual</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button> */}
        

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privasi 100% aman di Google Drive Anda.</span>
        </div>
      </div>
    </div>
  );
}
