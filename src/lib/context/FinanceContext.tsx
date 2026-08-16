"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  Transaction,
  Budget,
  SavingsGoal,
  SavingsLog,
  RecurringExpense,
  CategoryConfig,
} from "../db/types";
import { useAuth } from "./AuthContext";
import { syncEngine, SyncStatus } from "../google/sync";
import {
  generateId,
  getCurrentMonthString,
  getTodayString,
} from "../utils";

interface FinanceContextType {
  transactions: Transaction[];
  currentMonthTransactions: Transaction[];
  categories: CategoryConfig[];
  expenseCategories: CategoryConfig[];
  incomeCategories: CategoryConfig[];
  paymentMethods: CategoryConfig[];
  pockets: CategoryConfig[];
  budgets: Budget[];
  currentMonthBudgets: Budget[];
  savings: SavingsGoal[];
  savingsLogs: SavingsLog[];
  recurring: RecurringExpense[];
  syncStatus: SyncStatus;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  
  // Financial metrics for selected month
  totalExpenseMonth: number;
  totalIncomeMonth: number;
  netBalanceMonth: number;
  totalAllTimeBalance: number;
  overallBudget: Budget | undefined;
  overallBudgetPercent: number;
  isBudgetWarning80: boolean;
  isBudgetExceeded100: boolean;
  
  // Actions
  addTransaction: (tx: Omit<Transaction, "id" | "recordedBy" | "createdAt" | "updatedAt">) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  undoLastTransaction: () => Promise<void>;
  lastSavedTransaction: Transaction | null;
  clearLastSavedTransaction: () => void;
  
  setBudget: (category: string, amount: number, month?: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "currentAmount">) => Promise<void>;
  depositSavings: (savingsId: string, amount: number, pocket: string) => Promise<void>;
  addRecurringExpense: (rec: Omit<RecurringExpense, "id" | "isActive">) => Promise<void>;
  toggleRecurringExpense: (id: string, active: boolean) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  
  // Category management
  addCategoryItem: (type: CategoryConfig["type"], name: string, color: string, icon?: string) => Promise<void>;
  deleteCategoryItem: (id: string) => Promise<void>;
  
  syncNow: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, spreadsheetId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [lastSavedTransaction, setLastSavedTransaction] = useState<Transaction | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
  });

  // Dexie live queries with safe async fallbacks
  const transactions =
    useLiveQuery(
      async () => {
        try {
          const list = await db.transactions.toArray();
          return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        } catch {
          return [];
        }
      },
      []
    ) || [];

  const dbCategories =
    useLiveQuery(
      async () => {
        try {
          const list = await db.categories.toArray();
          return list.sort((a, b) => a.order - b.order);
        } catch {
          return [];
        }
      },
      []
    ) || [];

  const categories = dbCategories.length > 0 ? dbCategories : [
    { id: "1", type: "expense_category", name: "Makanan", color: "#F59E0B", icon: "Utensils", order: 1 },
    { id: "2", type: "expense_category", name: "Transportasi", color: "#3B82F6", icon: "Car", order: 2 },
    { id: "3", type: "expense_category", name: "Tagihan", color: "#A855F7", icon: "Receipt", order: 3 },
    { id: "4", type: "expense_category", name: "Kesehatan", color: "#EF4444", icon: "HeartPulse", order: 4 },
    { id: "5", type: "expense_category", name: "Hiburan", color: "#EC4899", icon: "Gamepad2", order: 5 },
    { id: "6", type: "expense_category", name: "Belanja", color: "#6366F1", icon: "ShoppingBag", order: 6 },
    { id: "7", type: "income_category", name: "Gaji", color: "#10B981", icon: "Banknote", order: 7 },
    { id: "8", type: "income_category", name: "Freelance", color: "#8B5CF6", icon: "Laptop", order: 8 },
    { id: "9", type: "income_category", name: "Lainnya", color: "#64748B", icon: "PlusCircle", order: 9 },
    { id: "10", type: "payment_method", name: "Cash", color: "#10B981", icon: "Wallet", order: 10 },
    { id: "11", type: "payment_method", name: "Debit Card", color: "#3B82F6", icon: "CreditCard", order: 11 },
    { id: "12", type: "payment_method", name: "Credit Card", color: "#8B5CF6", icon: "CreditCard", order: 12 },
    { id: "13", type: "payment_method", name: "E-Wallet", color: "#06B6D4", icon: "Smartphone", order: 13 },
    { id: "14", type: "payment_method", name: "Bank Transfer", color: "#F97316", icon: "Building2", order: 14 },
    { id: "15", type: "payment_method", name: "Other", color: "#64748B", icon: "CircleDot", order: 15 },
    { id: "16", type: "pocket", name: "Tunai", color: "#10B981", icon: "Wallet", order: 16 },
    { id: "17", type: "pocket", name: "BCA", color: "#0066AE", icon: "Building2", order: 17 },
    { id: "18", type: "pocket", name: "Mandiri", color: "#003D79", icon: "Building2", order: 18 },
  ] as CategoryConfig[];

  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const savings = useLiveQuery(() => db.savings.toArray(), []) || [];
  const savingsLogs =
    useLiveQuery(
      async () => {
        try {
          const list = await db.savings_logs.toArray();
          return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        } catch {
          return [];
        }
      },
      []
    ) || [];
  const recurring = useLiveQuery(() => db.recurring.toArray(), []) || [];

  // Listen to sync engine
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  // Check recurring on startup
  useEffect(() => {
    if (user?.name) {
      syncEngine.checkRecurringExpenses(user.name);
    }
  }, [user?.name]);

  // Derived categorized configs
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense_category"),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income_category"),
    [categories]
  );
  const paymentMethods = useMemo(
    () => categories.filter((c) => c.type === "payment_method"),
    [categories]
  );
  const pockets = useMemo(
    () => categories.filter((c) => c.type === "pocket"),
    [categories]
  );

  // Filter transactions for selected month
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Filter budgets for selected month
  const currentMonthBudgets = useMemo(() => {
    return budgets.filter((b) => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  // Monthly totals
  const totalExpenseMonth = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [currentMonthTransactions]);

  const totalIncomeMonth = useMemo(() => {
    return currentMonthTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [currentMonthTransactions]);

  const netBalanceMonth = useMemo(() => {
    return totalIncomeMonth - totalExpenseMonth;
  }, [totalIncomeMonth, totalExpenseMonth]);

  // All time net balance
  const totalAllTimeBalance = useMemo(() => {
    const totalInc = transactions
      .filter((tx) => tx.type === "income")
      .reduce((s, tx) => s + tx.amount, 0);
    const totalExp = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((s, tx) => s + tx.amount, 0);
    return totalInc - totalExp;
  }, [transactions]);

  // Overall budget metrics
  const overallBudget = useMemo(() => {
    return currentMonthBudgets.find((b) => b.category === "TOTAL");
  }, [currentMonthBudgets]);

  const overallBudgetPercent = useMemo(() => {
    if (!overallBudget || overallBudget.limitAmount <= 0) return 0;
    return Math.round((totalExpenseMonth / overallBudget.limitAmount) * 100);
  }, [totalExpenseMonth, overallBudget]);

  const isBudgetWarning80 = overallBudgetPercent >= 80 && overallBudgetPercent < 100;
  const isBudgetExceeded100 = overallBudgetPercent >= 100;

  // Actions
  const addTransaction = async (
    data: Omit<Transaction, "id" | "recordedBy" | "createdAt" | "updatedAt">
  ): Promise<Transaction> => {
    const userName = user?.name || "Andri Setiawan";
    const newTx: Transaction = {
      ...data,
      id: generateId("tx"),
      recordedBy: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };

    await db.transactions.add(newTx);
    await syncEngine.queueAction("create", "transactions", newTx);

    // Update streak if today
    if (user && data.date === getTodayString()) {
      const today = getTodayString();
      if (user.lastActiveDate !== today) {
        const updatedStreak = (user.streakCount || 0) + 1;
        await db.user_profile.update(user.id, {
          streakCount: updatedStreak,
          lastActiveDate: today,
        });
      }
    }

    setLastSavedTransaction(newTx);

    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setLastSavedTransaction((current) => (current?.id === newTx.id ? null : current));
    }, 5000);

    return newTx;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updatedData = { ...updates, updatedAt: new Date().toISOString() };
    await db.transactions.update(id, updatedData);
    const full = await db.transactions.get(id);
    if (full) {
      await syncEngine.queueAction("update", "transactions", full);
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = await db.transactions.get(id);
    if (tx) {
      await db.transactions.delete(id);
      await syncEngine.queueAction("delete", "transactions", { id });
    }
  };

  const undoLastTransaction = async () => {
    if (lastSavedTransaction) {
      await deleteTransaction(lastSavedTransaction.id);
      setLastSavedTransaction(null);
    }
  };

  const clearLastSavedTransaction = () => {
    setLastSavedTransaction(null);
  };

  const setBudget = async (category: string, amount: number, month = selectedMonth) => {
    const budgetId = `bgt_${month}_${category}`;
    const budgetData: Budget = {
      id: budgetId,
      month,
      category,
      limitAmount: amount,
    };
    await db.budgets.put(budgetData);
    await syncEngine.queueAction("create", "budgets", budgetData);
  };

  const deleteBudget = async (id: string) => {
    await db.budgets.delete(id);
    await syncEngine.queueAction("delete", "budgets", { id });
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, "id" | "currentAmount">) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: generateId("sav"),
      currentAmount: 0,
    };
    await db.savings.add(newGoal);
    await syncEngine.queueAction("create", "savings", newGoal);
  };

  const depositSavings = async (savingsId: string, amount: number, pocket: string) => {
    const goal = await db.savings.get(savingsId);
    if (!goal) return;

    const newCurrent = goal.currentAmount + amount;
    await db.savings.update(savingsId, { currentAmount: newCurrent });

    const log: SavingsLog = {
      id: generateId("sav_log"),
      date: getTodayString(),
      savingsId,
      savingsName: goal.name,
      pocket,
      amount,
      recordedBy: user?.name || "Andri Setiawan",
      createdAt: new Date().toISOString(),
    };
    await db.savings_logs.add(log);
    await syncEngine.queueAction("create", "savings_logs", log);
  };

  const addRecurringExpense = async (rec: Omit<RecurringExpense, "id" | "isActive">) => {
    const newRec: RecurringExpense = {
      ...rec,
      id: generateId("rec"),
      isActive: true,
    };
    await db.recurring.add(newRec);
    await syncEngine.queueAction("create", "recurring", newRec);
  };

  const toggleRecurringExpense = async (id: string, active: boolean) => {
    await db.recurring.update(id, { isActive: active });
  };

  const deleteRecurringExpense = async (id: string) => {
    await db.recurring.delete(id);
    await syncEngine.queueAction("delete", "recurring", { id });
  };

  const addCategoryItem = async (
    type: CategoryConfig["type"],
    name: string,
    color: string,
    icon = "Tag"
  ) => {
    const existing = await db.categories.where("type").equals(type).toArray();
    const newCat: CategoryConfig = {
      id: generateId("cat"),
      type,
      name,
      color,
      icon,
      order: existing.length + 1,
    };
    await db.categories.add(newCat);
    await syncEngine.queueAction("create", "config", newCat);
  };

  const deleteCategoryItem = async (id: string) => {
    await db.categories.delete(id);
    await syncEngine.queueAction("delete", "config", { id });
  };

  const syncNow = async () => {
    await syncEngine.syncNow(accessToken || undefined, spreadsheetId || undefined);
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        currentMonthTransactions,
        categories,
        expenseCategories,
        incomeCategories,
        paymentMethods,
        pockets,
        budgets,
        currentMonthBudgets,
        savings,
        savingsLogs,
        recurring,
        syncStatus,
        selectedMonth,
        setSelectedMonth,
        totalExpenseMonth,
        totalIncomeMonth,
        netBalanceMonth,
        totalAllTimeBalance,
        overallBudget,
        overallBudgetPercent,
        isBudgetWarning80,
        isBudgetExceeded100,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        undoLastTransaction,
        lastSavedTransaction,
        clearLastSavedTransaction,
        setBudget,
        deleteBudget,
        addSavingsGoal,
        depositSavings,
        addRecurringExpense,
        toggleRecurringExpense,
        deleteRecurringExpense,
        addCategoryItem,
        deleteCategoryItem,
        syncNow,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
