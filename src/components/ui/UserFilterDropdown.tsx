"use client";

import React, { useState, useRef, useEffect } from "react";
import { Users, User, Heart, ChevronDown, Check } from "lucide-react";
import { useFinance } from "@/lib/context/FinanceContext";
import { useAuth } from "@/lib/context/AuthContext";

export function UserFilterDropdown() {
  const { user, partner } = useAuth();
  const { selectedUserFilter, setSelectedUserFilter } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If there's no partner linked, do not show filter or show subtle solo badge
  if (!partner) {
    return null;
  }

  const userName = user?.name ? user.name.split(" ")[0] : "Saya";
  const partnerName = partner?.name ? partner.name.split(" ")[0] : "Pasangan";

  const options: {
    id: "all" | "me" | "partner";
    label: string;
    sublabel: string;
    icon: React.ElementType;
    iconColor: string;
    avatar?: string;
  }[] = [
    {
      id: "all",
      label: "Semua",
      sublabel: "Gabungan keuangan berdua",
      icon: Users,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    },
    {
      id: "me",
      label: `Saya (${userName})`,
      sublabel: "Catatan keuangan milik Anda",
      icon: User,
      iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      avatar: user?.image || user?.avatarUrl,
    },
    {
      id: "partner",
      label: `Pasangan (${partnerName})`,
      sublabel: `Catatan keuangan milik ${partnerName}`,
      icon: Heart,
      iconColor: "text-pink-400 bg-pink-500/10 border-pink-500/30",
      avatar: partner?.image || partner?.avatarUrl,
    },
  ];

  const currentOption = options.find((o) => o.id === selectedUserFilter) || options[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all shadow-sm cursor-pointer"
        aria-label="Filter berdasarkan pengguna"
      >
        <div className="flex items-center gap-1.5">
          {currentOption.avatar ? (
            <img
              src={currentOption.avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover border border-slate-400/30"
            />
          ) : (
            <CurrentIcon className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className="font-bold">{currentOption.label}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-[#0D1326] border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filter Berdasarkan
            </p>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = selectedUserFilter === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserFilter(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.avatar ? (
                      <img
                        src={opt.avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${opt.iconColor}`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight truncate">{opt.sublabel}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
