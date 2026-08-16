import { db } from "./db";
import { CategoryConfig, UserProfile, Budget } from "./types";
import { getCurrentMonthString, getTodayString } from "../utils";

export const DEFAULT_EXPENSE_CATEGORIES: Array<Omit<CategoryConfig, "id">> = [
  { type: "expense_category", name: "Makanan", color: "#F59E0B", icon: "Utensils", order: 1 },
  { type: "expense_category", name: "Transportasi", color: "#3B82F6", icon: "Car", order: 2 },
  { type: "expense_category", name: "Tagihan", color: "#A855F7", icon: "Receipt", order: 3 },
  { type: "expense_category", name: "Kesehatan", color: "#EF4444", icon: "HeartPulse", order: 4 },
  { type: "expense_category", name: "Hiburan", color: "#EC4899", icon: "Gamepad2", order: 5 },
  { type: "expense_category", name: "Belanja", color: "#6366F1", icon: "ShoppingBag", order: 6 },
];

export const DEFAULT_INCOME_CATEGORIES: Array<Omit<CategoryConfig, "id">> = [
  { type: "income_category", name: "Gaji", color: "#10B981", icon: "Banknote", order: 1 },
  { type: "income_category", name: "Freelance", color: "#8B5CF6", icon: "Laptop", order: 2 },
  { type: "income_category", name: "Lainnya", color: "#64748B", icon: "PlusCircle", order: 3 },
];

export const DEFAULT_PAYMENT_METHODS: Array<Omit<CategoryConfig, "id">> = [
  { type: "payment_method", name: "Cash", color: "#10B981", icon: "Wallet", order: 1 },
  { type: "payment_method", name: "Debit Card", color: "#3B82F6", icon: "CreditCard", order: 2 },
  { type: "payment_method", name: "Credit Card", color: "#8B5CF6", icon: "CreditCard", order: 3 },
  { type: "payment_method", name: "E-Wallet", color: "#06B6D4", icon: "Smartphone", order: 4 },
  { type: "payment_method", name: "Bank Transfer", color: "#F97316", icon: "Building2", order: 5 },
  { type: "payment_method", name: "Other", color: "#64748B", icon: "CircleDot", order: 6 },
];

export const DEFAULT_POCKETS: Array<Omit<CategoryConfig, "id">> = [
  { type: "pocket", name: "Tunai", color: "#10B981", icon: "Wallet", order: 1 },
  { type: "pocket", name: "BCA", color: "#0066AE", icon: "Building2", order: 2 },
  { type: "pocket", name: "Mandiri", color: "#003D79", icon: "Building2", order: 3 },
  { type: "pocket", name: "GoPay / OVO", color: "#00AED6", icon: "Smartphone", order: 4 },
];

export async function initializeDatabaseIfEmpty() {
  if (typeof window === "undefined") return;

  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const allConfigs: CategoryConfig[] = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, id: `cat_exp_${i + 1}` })),
      ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ ...c, id: `cat_inc_${i + 1}` })),
      ...DEFAULT_PAYMENT_METHODS.map((c, i) => ({ ...c, id: `cat_pay_${i + 1}` })),
      ...DEFAULT_POCKETS.map((c, i) => ({ ...c, id: `cat_poc_${i + 1}` })),
    ];
    await db.categories.bulkAdd(allConfigs);
  }

  // Initialize sample user if none exists
  const userCount = await db.user_profile.count();
  if (userCount === 0) {
    const defaultUser: UserProfile = {
      id: "user_primary",
      name: "Andri Setiawan",
      email: "andri.setiawan996@gmail.com",
      streakCount: 1,
      lastActiveDate: getTodayString(),
      spreadsheetName: "TES-DUITLOG",
      reminderTime: "20:00",
      reminderEnabled: true,
      theme: "dark",
    };
    await db.user_profile.put(defaultUser);
  }

  // Seed sample transactions if empty to show realistic preview matching screenshots
  const txCount = await db.transactions.count();
  if (txCount === 0) {
    const today = getTodayString();
    const currentMonth = getCurrentMonthString();
    
    await db.transactions.bulkAdd([
      {
        id: "tx_sample_1",
        date: today,
        type: "expense",
        description: "Telur gulung",
        category: "Makanan",
        paymentMethod: "Cash",
        amount: 20000,
        recordedBy: "Andri Setiawan",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: true,
      },
      {
        id: "tx_sample_2",
        date: today,
        type: "expense",
        description: "1SN NAYA CELL",
        category: "Tagihan",
        paymentMethod: "Cash",
        amount: 105000,
        recordedBy: "Andri Setiawan",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        synced: true,
      },
      {
        id: "tx_sample_3",
        date: `${currentMonth}-01`,
        type: "income",
        description: "Gaji Bulanan",
        category: "Gaji",
        paymentMethod: "Bank Transfer",
        amount: 9200000,
        recordedBy: "Andri Setiawan",
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        synced: true,
      },
    ]);

    // Sample default budget (5,000,000 overall, 30,000 Makanan)
    await db.budgets.bulkAdd([
      {
        id: `bgt_${currentMonth}_TOTAL`,
        month: currentMonth,
        category: "TOTAL",
        limitAmount: 5000000,
      },
      {
        id: `bgt_${currentMonth}_Makanan`,
        month: currentMonth,
        category: "Makanan",
        limitAmount: 30000,
      },
    ]);

    // Sample savings goal
    await db.savings.put({
      id: "sav_wedding_01",
      name: "Menikah",
      targetAmount: 50000000,
      currentAmount: 0,
      targetDate: "2026-12-27",
      icon: "Gem",
      color: "#EC4899",
    });

    // Sample recurring expense
    await db.recurring.put({
      id: "rec_wifi_01",
      name: "IndiHome Wi-Fi",
      amount: 320000,
      category: "Tagihan",
      paymentMethod: "Bank Transfer",
      frequency: "monthly",
      dayOfMonth: 15,
      autoRecord: true,
      lastRecordedDate: `${currentMonth}-15`,
      isActive: true,
    });
  }
}
