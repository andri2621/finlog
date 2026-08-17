import { db } from "./db";
import { CategoryConfig } from "./types";

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
    try {
      await db.categories.bulkPut(allConfigs);
    } catch (error) {
      console.error("Failed to seed categories:", error);
    }
  }
}
