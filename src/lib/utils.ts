import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format integer/number to Indonesian Rupiah (e.g. "Rp 25.000")
export function formatIDR(amount: number): string {
  if (isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, " ");
}

// Format raw number string to formatted number string with dots (e.g. "1.000.000")
export function formatNumberOnly(amount: number | string): string {
  const numeric = typeof amount === "string" ? Number(amount.replace(/\D/g, "")) : amount;
  if (isNaN(numeric) || numeric === 0) return "0";
  return new Intl.NumberFormat("id-ID").format(numeric);
}

// Helper for live inputs to format with dots automatically
export function formatInputNumber(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (!clean) return "";
  const num = Number(clean);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function parseInputNumber(formattedValue: string): number {
  const clean = formattedValue.replace(/\D/g, "");
  return Number(clean) || 0;
}

// Generate unique timestamp-based ID
export function generateId(prefix = "id"): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${randomStr}`;
}

// Date helpers
export function parseLocalDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr || typeof dateStr !== "string") return new Date();
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  return new Date(dateStr);
}

export function formatDateIndo(dateStr: string | Date): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return "";
  
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function formatDateGroup(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const fullDays = [
    "MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"
  ];
  const months = [
    "JAN", "FEB", "MAR", "APR", "MEI", "JUN", 
    "JUL", "AGT", "SEP", "OKT", "NOV", "DES"
  ];
  
  const dayName = fullDays[d.getDay()];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  
  return `${dayName}, ${day} ${monthName}`;
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthDisplayName(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${shortMonths[mIndex] || month} ${year}`;
}
