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
  selectedUserFilter: "all" | "me" | "partner";
  setSelectedUserFilter: (filter: "all" | "me" | "partner") => void;
  allCurrentMonthTransactions: Transaction[];
  
  // Financial metrics for selected month
  totalExpenseMonth: number;
  totalIncomeMonth: number;
  netBalanceMonth: number;
  totalAllTimeBalance: number;
  overallBudget: Budget | undefined;
  overallBudgetPercent: number;
  isBudgetWarning80: boolean;
  isBudgetExceeded100: boolean;

  // Account / Tempat Uang Balances
  pocketBalances: Record<string, number>;
  getPocketBalance: (name: string) => number;
  totalPocketBalance: number;
  totalSavingsBalance: number;
  totalNetWorth: number;
  
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
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  depositSavings: (savingsId: string, amount: number, pocket: string) => Promise<void>;
  addRecurringExpense: (rec: Omit<RecurringExpense, "id" | "isActive">) => Promise<void>;
  toggleRecurringExpense: (id: string, active: boolean) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  
  // Category management
  addCategoryItem: (type: CategoryConfig["type"], name: string, color: string, icon?: string) => Promise<void>;
  updateCategoryItem: (
    id: string,
    updates: Partial<Pick<CategoryConfig, "name" | "color" | "icon" | "order">>
  ) => Promise<void>;
  reorderCategoryItems: (type: CategoryConfig["type"], orderedIds: string[]) => Promise<void>;
  deleteCategoryItem: (id: string) => Promise<void>;
  
  syncNow: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, partner, accessToken, spreadsheetId, refreshGoogleToken } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [selectedUserFilter, setSelectedUserFilter] = useState<"all" | "me" | "partner">("all");
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

  // Update syncEngine credentials & register token refresh handler
  useEffect(() => {
    syncEngine.setCredentials(accessToken || null, spreadsheetId || null);
    syncEngine.setTokenRefreshHandler(refreshGoogleToken);
    if (accessToken && spreadsheetId) {
      syncEngine.syncNow().catch(console.error);
    }
  }, [accessToken, spreadsheetId, refreshGoogleToken]);

  // Check recurring on startup
  useEffect(() => {
    if (user?.name) {
      syncEngine.checkRecurringExpenses(user.name);
    }
  }, [user?.name]);

  // Derived categorized configs (sorted by order)
  const expenseCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === "expense_category")
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories]
  );
  const incomeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === "income_category")
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories]
  );
  const paymentMethods = useMemo(
    () =>
      categories
        .filter((c) => c.type === "payment_method")
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [categories]
  );
  
  // Pockets are unified with payment methods (Bank, E-Wallet, Cash)
  const pockets = useMemo(() => {
    const seen = new Set<string>();
    const list: CategoryConfig[] = [];
    categories.forEach((c) => {
      if (c.type === "payment_method" || c.type === "pocket") {
        const key = c.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(c);
        }
      }
    });
    return list;
  }, [categories]);

  // Live balance calculation for each pocket / payment method
  const pocketBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    pockets.forEach((p) => {
      balances[p.name] = 0;
    });

    // Income adds, Expense subtracts
    transactions.forEach((tx) => {
      if (tx.paymentMethod) {
        if (balances[tx.paymentMethod] === undefined) {
          balances[tx.paymentMethod] = 0;
        }
        if (tx.type === "income") {
          balances[tx.paymentMethod] += tx.amount;
        } else if (tx.type === "expense") {
          balances[tx.paymentMethod] -= tx.amount;
        }
      }
    });

    // Savings deposits subtract from available pocket balance
    savingsLogs.forEach((log) => {
      if (log.pocket) {
        if (balances[log.pocket] === undefined) {
          balances[log.pocket] = 0;
        }
        balances[log.pocket] -= log.amount;
      }
    });

    return balances;
  }, [pockets, transactions, savingsLogs]);

  const getPocketBalance = (name: string) => {
    return pocketBalances[name] || 0;
  };

  const totalSavingsBalance = useMemo(() => {
    return savings.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [savings]);

  const totalPocketBalance = useMemo(() => {
    return Object.values(pocketBalances).reduce((sum, b) => sum + b, 0);
  }, [pocketBalances]);

  const totalNetWorth = useMemo(() => {
    return totalPocketBalance + totalSavingsBalance;
  }, [totalPocketBalance, totalSavingsBalance]);

  // All transactions for selected month (unfiltered by user)
  const allCurrentMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Filter transactions for selected month based on selectedUserFilter ("all" | "me" | "partner")
  const currentMonthTransactions = useMemo(() => {
    return allCurrentMonthTransactions.filter((tx) => {
      if (selectedUserFilter === "all") return true;
      const rec = (tx.recordedBy || "").trim().toLowerCase();
      const meName = (user?.name || "").trim().toLowerCase();
      const meEmail = (user?.email || "").trim().toLowerCase();
      const partnerName = (partner?.name || "").trim().toLowerCase();
      const partnerEmail = (partner?.email || "").trim().toLowerCase();

      const isMe = Boolean((meName && rec === meName) || (meEmail && rec === meEmail));
      const isPartner = Boolean((partnerName && rec === partnerName) || (partnerEmail && rec === partnerEmail) || (!isMe && rec !== ""));

      if (selectedUserFilter === "me") {
        if (!isMe && meName) return false;
        return true;
      }
      if (selectedUserFilter === "partner") {
        if (!isPartner) return false;
        return true;
      }
      return true;
    });
  }, [allCurrentMonthTransactions, selectedUserFilter, user?.name, user?.email, partner?.name, partner?.email]);

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

  // All time net balance (filtered by selectedUserFilter)
  const totalAllTimeBalance = useMemo(() => {
    const txs = transactions.filter((tx) => {
      if (selectedUserFilter === "all") return true;
      const rec = (tx.recordedBy || "").trim().toLowerCase();
      const meName = (user?.name || "").trim().toLowerCase();
      const meEmail = (user?.email || "").trim().toLowerCase();
      const partnerName = (partner?.name || "").trim().toLowerCase();
      const partnerEmail = (partner?.email || "").trim().toLowerCase();

      const isMe = Boolean((meName && rec === meName) || (meEmail && rec === meEmail));
      const isPartner = Boolean((partnerName && rec === partnerName) || (partnerEmail && rec === partnerEmail) || (!isMe && rec !== ""));

      if (selectedUserFilter === "me") {
        if (!isMe && meName) return false;
        return true;
      }
      if (selectedUserFilter === "partner") {
        if (!isPartner) return false;
        return true;
      }
      return true;
    });

    const totalInc = txs
      .filter((tx) => tx.type === "income")
      .reduce((s, tx) => s + tx.amount, 0);
    const totalExp = txs
      .filter((tx) => tx.type === "expense")
      .reduce((s, tx) => s + tx.amount, 0);
    return totalInc - totalExp;
  }, [transactions, selectedUserFilter, user?.name, partner?.name]);

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

    // Auto-sync immediately to Google Sheets if connected
    syncEngine.syncNow().catch(console.error);

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
    // Use put() instead of update() to reliably trigger useLiveQuery re-render
    const existing = await db.transactions.get(id);
    if (!existing) return;
    const merged: Transaction = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.transactions.put(merged);
    await syncEngine.queueAction("update", "transactions", merged);
    syncEngine.syncNow().catch(console.error);
  };

  const deleteTransaction = async (id: string) => {
    const tx = await db.transactions.get(id);
    if (tx) {
      await db.transactions.delete(id);
      await syncEngine.queueAction("delete", "transactions", { id });
      syncEngine.syncNow().catch(console.error);
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
    syncEngine.syncNow().catch(console.error);
  };

  const deleteBudget = async (id: string) => {
    await db.budgets.delete(id);
    await syncEngine.queueAction("delete", "budgets", { id });
    syncEngine.syncNow().catch(console.error);
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, "id" | "currentAmount">) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: generateId("sav"),
      currentAmount: 0,
    };
    await db.savings.add(newGoal);
    await syncEngine.queueAction("create", "savings", newGoal);
    syncEngine.syncNow().catch(console.error);
  };

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    const existing = await db.savings.get(id);
    if (!existing) return;

    const merged: SavingsGoal = { ...existing, ...updates };
    await db.savings.put(merged);

    // If name changed, cascade update to savings_logs
    if (updates.name && updates.name !== existing.name) {
      const logs = await db.savings_logs.where("savingsId").equals(id).toArray();
      for (const log of logs) {
        await db.savings_logs.put({ ...log, savingsName: updates.name });
      }
    }

    await syncEngine.queueAction("update", "savings", merged);
    syncEngine.syncNow().catch(console.error);
  };

  const deleteSavingsGoal = async (id: string) => {
    const existing = await db.savings.get(id);
    if (!existing) return;

    await db.savings.delete(id);
    await syncEngine.queueAction("delete", "savings", { id });
    syncEngine.syncNow().catch(console.error);
  };

  const depositSavings = async (savingsId: string, amount: number, pocket: string) => {
    const goal = await db.savings.get(savingsId);
    if (!goal) return;

    const newCurrent = goal.currentAmount + amount;
    await db.savings.update(savingsId, { currentAmount: newCurrent });

    const updatedGoal = await db.savings.get(savingsId);
    if (updatedGoal) {
      await syncEngine.queueAction("update", "savings", updatedGoal);
    }

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
    syncEngine.syncNow().catch(console.error);
  };

  const addRecurringExpense = async (rec: Omit<RecurringExpense, "id" | "isActive">) => {
    const newRec: RecurringExpense = {
      ...rec,
      id: generateId("rec"),
      isActive: true,
    };
    await db.recurring.add(newRec);
    await syncEngine.queueAction("create", "recurring", newRec);
    syncEngine.syncNow().catch(console.error);
  };

  const toggleRecurringExpense = async (id: string, active: boolean) => {
    await db.recurring.update(id, { isActive: active });
    const updated = await db.recurring.get(id);
    if (updated) {
      await syncEngine.queueAction("update", "recurring", updated);
      syncEngine.syncNow().catch(console.error);
    }
  };

  const deleteRecurringExpense = async (id: string) => {
    await db.recurring.delete(id);
    await syncEngine.queueAction("delete", "recurring", { id });
    syncEngine.syncNow().catch(console.error);
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
    syncEngine.syncNow().catch(console.error);
  };

  const updateCategoryItem = async (
    id: string,
    updates: Partial<Pick<CategoryConfig, "name" | "color" | "icon" | "order">>
  ) => {
    const existing = await db.categories.get(id);
    if (!existing) return;

    const oldName = existing.name;
    await db.categories.update(id, updates);
    const updated = await db.categories.get(id);
    if (updated) {
      await syncEngine.queueAction("update", "config", updated);
      syncEngine.syncNow().catch(console.error);
    }

    // Cascade rename to existing transactions and budgets if name changed
    if (updates.name && updates.name !== oldName) {
      const newName = updates.name;
      if (existing.type === "expense_category") {
        const affectedTxs = await db.transactions.where("category").equals(oldName).toArray();
        for (const tx of affectedTxs) {
          await db.transactions.update(tx.id, { category: newName });
          const upTx = await db.transactions.get(tx.id);
          if (upTx) await syncEngine.queueAction("update", "transactions", upTx);
        }
        const affectedBudgets = await db.budgets.where("category").equals(oldName).toArray();
        for (const bgt of affectedBudgets) {
          await db.budgets.update(bgt.id, { category: newName });
          const upBgt = await db.budgets.get(bgt.id);
          if (upBgt) await syncEngine.queueAction("update", "budgets", upBgt);
        }
      } else if (existing.type === "income_category") {
        const affectedTxs = await db.transactions.where("category").equals(oldName).toArray();
        for (const tx of affectedTxs) {
          await db.transactions.update(tx.id, { category: newName });
          const upTx = await db.transactions.get(tx.id);
          if (upTx) await syncEngine.queueAction("update", "transactions", upTx);
        }
      } else if (existing.type === "payment_method" || existing.type === "pocket") {
        const affectedTxs = await db.transactions.where("paymentMethod").equals(oldName).toArray();
        for (const tx of affectedTxs) {
          await db.transactions.update(tx.id, { paymentMethod: newName });
          const upTx = await db.transactions.get(tx.id);
          if (upTx) await syncEngine.queueAction("update", "transactions", upTx);
        }
        const affectedLogs = await db.savings_logs.where("pocket").equals(oldName).toArray();
        for (const log of affectedLogs) {
          await db.savings_logs.update(log.id, { pocket: newName });
          const upLog = await db.savings_logs.get(log.id);
          if (upLog) await syncEngine.queueAction("update", "savings_logs", upLog);
        }
      }
    }
  };

  const reorderCategoryItems = async (type: CategoryConfig["type"], orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const order = i + 1;
      await db.categories.update(id, { order });
      const updated = await db.categories.get(id);
      if (updated) {
        await syncEngine.queueAction("update", "config", updated);
      }
    }
    syncEngine.syncNow().catch(console.error);
  };

  const deleteCategoryItem = async (id: string) => {
    await db.categories.delete(id);
    await syncEngine.queueAction("delete", "config", { id });
    syncEngine.syncNow().catch(console.error);
  };

  const syncNow = async () => {
    await syncEngine.syncNow();
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
        selectedUserFilter,
        setSelectedUserFilter,
        allCurrentMonthTransactions,
        totalExpenseMonth,
        totalIncomeMonth,
        netBalanceMonth,
        totalAllTimeBalance,
        overallBudget,
        overallBudgetPercent,
        isBudgetWarning80,
        isBudgetExceeded100,
        pocketBalances,
        getPocketBalance,
        totalPocketBalance,
        totalSavingsBalance,
        totalNetWorth,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        undoLastTransaction,
        lastSavedTransaction,
        clearLastSavedTransaction,
        setBudget,
        deleteBudget,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
        depositSavings,
        addRecurringExpense,
        toggleRecurringExpense,
        deleteRecurringExpense,
        addCategoryItem,
        updateCategoryItem,
        reorderCategoryItems,
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
