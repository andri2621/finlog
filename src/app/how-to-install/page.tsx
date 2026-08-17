"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Share2,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  Wifi,
  Smartphone,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Apple,
  Play,
  Pause,
} from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePWAInstall } from "@/lib/context/PWAContext";

export default function HowToInstallPage() {
  const { user } = useAuth();
  const { installApp, isInstalled, platform: detectedPlatform, isInstallable } = usePWAInstall();
  
  // Platform tab state (defaults to detected platform)
  const [platform, setPlatform] = useState<"ios" | "android">(() => {
    if (detectedPlatform === "android") return "android";
    return "ios";
  });

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-advance stepper timer (loops 1 -> 2 -> 3 -> 4 -> 1 every 3.2s)
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 3200);

    return () => clearInterval(interval);
  }, [isAutoPlay, platform]);

  const handleInstallClick = async () => {
    const result = await installApp();
    if (result === "installed") {
      setToastMessage("FinLog telah terpasang di perangkat Anda!");
      setTimeout(() => setToastMessage(null), 3500);
    } else if (result === "guide_ios") {
      setToastMessage("Pada Safari, tap ikon Bagikan (kotak panah ke atas) lalu pilih 'Tambah ke Layar Utama'");
      setActiveStep(2);
      setTimeout(() => setToastMessage(null), 4500);
    } else if (result === "guide_manual") {
      setToastMessage("Tap menu titik tiga (kanan atas) di browser Anda lalu pilih 'Install app' / 'Tambahkan ke Layar Utama'");
      setActiveStep(2);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  const iosSteps = [
    {
      num: "01",
      title: "Buka finlog di Safari",
      desc: "Pastikan kamu pakai Safari di iPhone/iPad, bukan Chrome atau aplikasi browser lain.",
    },
    {
      num: "02",
      title: "Tap ikon Bagikan di toolbar bawah",
      desc: "Cari ikon kotak dengan panah ke atas di bagian bawah layar Safari kamu.",
    },
    {
      num: "03",
      title: 'Pilih "Tambah ke Layar Utama"',
      desc: 'Scroll ke bawah di menu share sheet kalau opsi "Add to Home Screen" belum kelihatan.',
    },
    {
      num: "04",
      title: 'Tap "Tambah" di pojok kanan atas',
      desc: "Ikon FinLog langsung muncul di Layar Utama HP kamu seperti aplikasi biasa.",
    },
  ];

  const androidSteps = [
    {
      num: "01",
      title: "Buka finlog di Chrome",
      desc: "Pastikan kamu pakai Google Chrome agar bisa install langsung ke Home Screen.",
    },
    {
      num: "02",
      title: "Tap menu titik tiga di kanan atas",
      desc: "Atau langsung tap pop-up banner 'Install app' kalau muncul otomatis di layar.",
    },
    {
      num: "03",
      title: 'Pilih "Install app" / "Add to Home screen"',
      desc: "Nama opsinya tergantung versi Google Chrome di HP Android kamu.",
    },
    {
      num: "04",
      title: 'Tap "Install" untuk konfirmasi',
      desc: "FinLog langsung terpasang mandiri di HP kamu tanpa makan banyak memori.",
    },
  ];

  const currentSteps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D1A] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090D1A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Fin<span className="text-emerald-500">Log</span></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
              Panduan PWA
            </span>
            <Link
              href={user ? "/" : "/login"}
              className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {user ? "Buka Aplikasi" : "Masuk"}
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full flex flex-col items-center">
        {/* HERO TITLE & PLATFORM SWITCHER */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Install FinLog • Cuma 30 Detik</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              <span className="text-emerald-500 underline decoration-emerald-500/40 underline-offset-4">4 langkah</span> buat install FinLog di <span className="underline decoration-emerald-500/40 underline-offset-4">Layar Utama.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Setelah ter-install, FinLog jalan kayak aplikasi biasa — fullscreen, ada ikon di home, dan bisa dipakai offline.
            </p>
          </div>

          {/* OS Platform Switcher */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shrink-0 self-start md:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => { setPlatform("ios"); setActiveStep(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                platform === "ios"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Apple className="w-4 h-4 text-slate-900 dark:text-white" />
              <span>iOS Safari</span>
            </button>

            <button
              type="button"
              onClick={() => { setPlatform("android"); setActiveStep(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                platform === "android"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-emerald-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Android Chrome</span>
            </button>
          </div>
        </div>

        {/* 3-COLUMN INTERACTIVE STEPPER & MOCKUP */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto">
          {/* LEFT COLUMN: Step 1 & Step 2 */}
          <div className="lg:col-span-4 flex flex-col gap-4 order-2 lg:order-1">
            {[0, 1].map((idx) => {
              const step = currentSteps[idx];
              const stepNum = idx + 1;
              const isActive = activeStep === stepNum;

              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(stepNum)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden ${
                    isActive
                      ? "bg-white dark:bg-[#0F162A] border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                      : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {step.num}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Progress Timer Line */}
                  {isActive && isAutoPlay && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        key={`progress-left-${activeStep}-${platform}`}
                        className="h-full bg-emerald-500 animate-step-progress"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CENTER COLUMN: PHONE MOCKUP */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2">
            {/* Step badge on top of phone with auto-play toggle */}
            <div className="mb-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white dark:bg-slate-850 text-[10px] font-extrabold uppercase tracking-wider border border-slate-700/80 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LANGKAH 0{activeStep} / 04</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoPlay(!isAutoPlay);
                }}
                className="ml-1 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                title={isAutoPlay ? "Jeda animasi (Pause)" : "Putar otomatis (Play)"}
              >
                {isAutoPlay ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
            </div>

            {/* Smartphone Mockup Container */}
            <div className="w-[280px] sm:w-[300px] h-[520px] rounded-[42px] bg-slate-950 p-3 shadow-2xl ring-1 ring-slate-800 relative flex flex-col justify-between border-4 border-slate-700/80">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-end px-2">
                <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-800" />
              </div>

              {/* Inside Screen Content */}
              <div className="w-full h-full bg-white dark:bg-[#0B1120] rounded-[32px] overflow-hidden flex flex-col justify-between relative text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800/80 pt-6">
                
                {/* Simulated App / Browser Header */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-slate-400" />
                    <span className="text-[9px]">100%</span>
                  </div>
                </div>

                {/* Step specific illustration inside phone */}
                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center space-y-4">
                  {platform === "ios" ? (
                    <>
                      {activeStep === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                            <Apple className="w-6 h-6" />
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                            safari: finlog.id
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Buka website FinLog di browser Safari bawaan iPhone kamu.
                          </p>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                              <Share2 className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold">Tombol Bagikan (Share)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Klik tombol Share di toolbar bagian bawah layar Safari.
                          </p>
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="space-y-3 animate-in fade-in duration-300 w-full">
                          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-emerald-500 text-left flex items-center gap-2.5 shadow-md">
                            <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950">
                              <PlusSquare className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-slate-900 dark:text-white">Tambah ke Layar Utama</p>
                              <p className="text-[9px] text-slate-500">Add to Home Screen</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Pilih menu Tambah ke Layar Utama dari daftar opsi share sheet.
                          </p>
                        </div>
                      )}

                      {activeStep === 4 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-2xl shadow-xl shadow-emerald-500/30 mx-auto">
                            FL
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">FinLog Terpasang!</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ikon FinLog langsung siap digunakan di Home Screen kamu.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {activeStep === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center mx-auto">
                            <Smartphone className="w-6 h-6" />
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                            chrome: finlog.id
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Buka FinLog menggunakan Google Chrome di Android.
                          </p>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                              <MoreVertical className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold">Menu Titik Tiga (Kanan Atas)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Buka menu browser Chrome di sudut kanan atas layar.
                          </p>
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="space-y-3 animate-in fade-in duration-300 w-full">
                          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-emerald-500 text-left flex items-center gap-2.5 shadow-md">
                            <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950">
                              <Download className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-slate-900 dark:text-white">Install Aplikasi</p>
                              <p className="text-[9px] text-slate-500">Tambahkan ke Layar Utama</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Pilih opsi Install app / Add to Home screen.
                          </p>
                        </div>
                      )}

                      {activeStep === 4 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-2xl shadow-xl shadow-emerald-500/30 mx-auto">
                            FL
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Aplikasi Mandiri Aktif!</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Buka FinLog kapan saja tanpa bilah browser.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom navigation pill */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
                  <div className="w-20 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>
            </div>

            {/* Stepper Dots below phone */}
            <div className="flex items-center gap-1.5 mt-4">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setActiveStep(step)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeStep === step ? "w-6 bg-emerald-500" : "w-2 bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label={`Pilih langkah ${step}`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: Step 3 & Step 4 */}
          <div className="lg:col-span-4 flex flex-col gap-4 order-3">
            {[2, 3].map((idx) => {
              const step = currentSteps[idx];
              const stepNum = idx + 1;
              const isActive = activeStep === stepNum;

              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStep(stepNum)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden ${
                    isActive
                      ? "bg-white dark:bg-[#0F162A] border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                      : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {step.num}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Progress Timer Line */}
                  {isActive && isAutoPlay && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                      <div
                        key={`progress-right-${activeStep}-${platform}`}
                        className="h-full bg-emerald-500 animate-step-progress"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BIG INSTALL ACTION BUTTON */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleInstallClick}
            className="py-4 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>{isInstalled ? "FinLog Sudah Terpasang" : "Install FinLog Sekarang"}</span>
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Gratis • Ringan &lt; 2MB • Tidak perlu download dari App Store
          </p>
        </div>
      </main>

      {/* FOOTER PERKS & LOGIN CTA */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#090D1A]/60 py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-slate-500 dark:text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bisa offline</span>
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
              <span>Buka langsung dari Home Screen</span>
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tanpa App Store</span>
            </span>
          </div>

          <Link
            href={user ? "/" : "/login"}
            className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 flex items-center gap-1 transition-colors"
          >
            <span>Sudah terinstall? Masuk dengan Google</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
