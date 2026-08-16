export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  description: string;
  category: string;
  paymentMethod: string;
  amount: number;
  recordedBy: string; // "Andri (andri@gmail.com)" or "Pasangan"
  userAvatar?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  synced?: boolean;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  category: string; // category name or "TOTAL" for overall budget
  limitAmount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // YYYY-MM-DD
  icon: string;
  color: string;
}

export interface SavingsLog {
  id: string;
  date: string;
  savingsId: string;
  savingsName: string;
  pocket: string; // "Tunai", "Bank Mandiri", "BCA", etc.
  amount: number;
  recordedBy: string;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentMethod: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  dayOfMonth: number; // 1 - 31
  autoRecord: boolean; // whether to automatically record as transaction
  lastRecordedDate?: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface CategoryConfig {
  id: string;
  type: "expense_category" | "income_category" | "payment_method" | "pocket";
  name: string;
  color: string;
  icon?: string;
  order: number;
}

export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  entity: "transactions" | "budgets" | "savings" | "savings_logs" | "recurring" | "config";
  data: any;
  createdAt: string;
  attempts: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  isPartner?: boolean;
  streakCount: number;
  lastActiveDate: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  reminderTime?: string; // e.g. "20:00"
  reminderEnabled?: boolean;
  theme?: "dark" | "light" | "system";
}
