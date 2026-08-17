import { db } from "../db/db";
import {
  appendTransactionToSheet,
  fetchTransactionsFromSheet,
  updateTransactionInSheet,
  deleteTransactionFromSheet,
  saveBudgetToSheet,
  deleteBudgetFromSheet,
  fetchBudgetsFromSheet,
  saveSavingsToSheet,
  deleteSavingsFromSheet,
  fetchSavingsFromSheet,
  appendSavingsLogToSheet,
  fetchSavingsLogsFromSheet,
  saveRecurringToSheet,
  deleteRecurringFromSheet,
  fetchRecurringFromSheet,
  saveCategoryToSheet,
  deleteCategoryFromSheet,
  fetchCategoriesFromSheet,
} from "./sheets";
import {
  Transaction,
  Budget,
  SavingsGoal,
  SavingsLog,
  RecurringExpense,
  CategoryConfig,
} from "../db/types";
import { getTodayString } from "../utils";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  error: string | null;
}

export class SyncEngine {
  private static instance: SyncEngine;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private status: SyncStatus = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
  };

  private credentials: { accessToken?: string; spreadsheetId?: string } = {};
  private syncPromise: Promise<void> | null = null;
  private needsAnotherSync = false;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
      this.updatePendingCount();

      // Auto-sync every 60 seconds to catch partner changes
      setInterval(() => {
        if (
          this.status.isOnline &&
          this.credentials.accessToken &&
          this.credentials.spreadsheetId
        ) {
          this.syncNow().catch(() => {});
        }
      }, 60 * 1000);
    }
  }

  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.status }));
  }

  private async updatePendingCount() {
    try {
      const count = await db.sync_queue.count();
      this.status.pendingCount = count;
      this.notify();
    } catch {
      // IndexedDB not ready
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.status.isOnline = isOnline;
    this.notify();
    if (isOnline) {
      this.syncNow();
    }
  }

  public setCredentials(accessToken: string | null, spreadsheetId: string | null) {
    this.credentials.accessToken = accessToken || undefined;
    this.credentials.spreadsheetId = spreadsheetId || undefined;
  }

  public async queueAction(
    action: "create" | "update" | "delete",
    entity: "transactions" | "budgets" | "savings" | "savings_logs" | "recurring" | "config",
    data: any
  ) {
    await db.sync_queue.add({
      action,
      entity,
      data,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    await this.updatePendingCount();

    if (this.status.isOnline) {
      this.syncNow();
    }
  }

  /**
   * Trigger immediate sync of all pending queue items & pull latest changes across all 6 tabs.
   * Uses a self-draining loop to ensure rapid consecutive mutations are never left in pending.
   */
  public async syncNow(accessToken?: string, spreadsheetId?: string): Promise<void> {
    if (!this.status.isOnline) return;

    if (this.status.isSyncing) {
      this.needsAnotherSync = true;
      return this.syncPromise || Promise.resolve();
    }

    this.syncPromise = this.performSync(accessToken, spreadsheetId);
    return this.syncPromise;
  }

  private async performSync(accessToken?: string, spreadsheetId?: string) {
    const token = accessToken || this.credentials.accessToken;
    const sheetId = spreadsheetId || this.credentials.spreadsheetId;

    if (!token || !sheetId) return;

    this.status.isSyncing = true;
    this.status.error = null;
    this.notify();

    try {
      do {
        this.needsAnotherSync = false;

        // ─────────────────────────────────────────────────────────────────────
        // 1. Process and drain all pending offline mutations
        // ─────────────────────────────────────────────────────────────────────
        let queue = await db.sync_queue.toArray();
        while (queue.length > 0) {
          for (const item of queue) {
            try {
              let success = false;

              // A. Transactions
              if (item.entity === "transactions") {
                if (item.action === "create") {
                  success = await appendTransactionToSheet(token, sheetId, item.data as Transaction);
                } else if (item.action === "update") {
                  success = await updateTransactionInSheet(token, sheetId, item.data as Transaction);
                } else if (item.action === "delete") {
                  success = await deleteTransactionFromSheet(token, sheetId, item.data?.id || "");
                }
              }

              // B. Budgets
              else if (item.entity === "budgets") {
                if (item.action === "create" || item.action === "update") {
                  success = await saveBudgetToSheet(token, sheetId, item.data as Budget);
                } else if (item.action === "delete") {
                  success = await deleteBudgetFromSheet(token, sheetId, item.data?.id || "");
                }
              }

              // C. Savings Goals
              else if (item.entity === "savings") {
                if (item.action === "create" || item.action === "update") {
                  success = await saveSavingsToSheet(token, sheetId, item.data as SavingsGoal);
                } else if (item.action === "delete") {
                  success = await deleteSavingsFromSheet(token, sheetId, item.data?.id || "");
                }
              }

              // D. Savings Logs
              else if (item.entity === "savings_logs") {
                if (item.action === "create") {
                  success = await appendSavingsLogToSheet(token, sheetId, item.data as SavingsLog);
                }
              }

              // E. Recurring
              else if (item.entity === "recurring") {
                if (item.action === "create" || item.action === "update") {
                  success = await saveRecurringToSheet(token, sheetId, item.data as RecurringExpense);
                } else if (item.action === "delete") {
                  success = await deleteRecurringFromSheet(token, sheetId, item.data?.id || "");
                }
              }

              // F. Config / Categories
              else if (item.entity === "config") {
                if (item.action === "create" || item.action === "update") {
                  success = await saveCategoryToSheet(token, sheetId, item.data as CategoryConfig);
                } else if (item.action === "delete") {
                  success = await deleteCategoryFromSheet(token, sheetId, item.data?.id || "");
                }
              }

              if (success && item.id) {
                await db.sync_queue.delete(item.id);
              }
            } catch (err: any) {
              if (err?.status === 401 || err?.message?.includes("401")) {
                this.status.error = "Token expired";
                return;
              }
            }
          }

          await this.updatePendingCount();
          // Check if new items were queued during execution
          queue = await db.sync_queue.toArray();
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. Pull latest data from all tabs in Google Sheet
        // ─────────────────────────────────────────────────────────────────────

        // 2A. Transactions (timestamp merge)
        const remoteTxs = await fetchTransactionsFromSheet(token, sheetId);
        if (remoteTxs.length > 0) {
          const localTxs = await db.transactions.toArray();
          const localMap = new Map(localTxs.map((tx) => [tx.id, tx]));

          const toWrite: Transaction[] = [];
          for (const remote of remoteTxs) {
            const local = localMap.get(remote.id);
            if (!local) {
              toWrite.push(remote);
            } else {
              const localUpdated = local.updatedAt || local.createdAt || "";
              const remoteUpdated = remote.updatedAt || remote.createdAt || "";
              if (remoteUpdated > localUpdated) {
                toWrite.push(remote);
              }
            }
          }

          if (toWrite.length > 0) {
            await db.transactions.bulkPut(toWrite);
          }
        }

        // 2B. Budgets
        const remoteBudgets = await fetchBudgetsFromSheet(token, sheetId);
        if (remoteBudgets.length > 0) {
          await db.budgets.bulkPut(remoteBudgets);
        }

        // 2C. Savings
        const remoteSavings = await fetchSavingsFromSheet(token, sheetId);
        if (remoteSavings.length > 0) {
          await db.savings.bulkPut(remoteSavings);
        }

        // 2D. Savings Logs
        const remoteLogs = await fetchSavingsLogsFromSheet(token, sheetId);
        if (remoteLogs.length > 0) {
          await db.savings_logs.bulkPut(remoteLogs);
        }

        // 2E. Recurring
        const remoteRecurring = await fetchRecurringFromSheet(token, sheetId);
        if (remoteRecurring.length > 0) {
          await db.recurring.bulkPut(remoteRecurring);
        }

        // 2F. Categories / Config
        const remoteCategories = await fetchCategoriesFromSheet(token, sheetId);
        if (remoteCategories.length > 0) {
          await db.categories.bulkPut(remoteCategories);
        }

      } while (this.needsAnotherSync);

      this.status.lastSyncedAt = new Date();
      await this.updatePendingCount();
    } catch (err: any) {
      console.error("Sync error:", err);
      this.status.error = err?.message || "Sync failed";
    } finally {
      this.status.isSyncing = false;
      this.syncPromise = null;
      this.notify();
    }
  }

  /**
   * Check and trigger recurring expenses due for this period
   */
  public async checkRecurringExpenses(userName: string): Promise<number> {
    const today = getTodayString();
    const currentDayOfMonth = new Date().getDate();
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const activeRecurring = await db.recurring
      .filter((r) => r.isActive && r.autoRecord)
      .toArray();

    let recordedCount = 0;

    for (const rec of activeRecurring) {
      const alreadyRecordedThisMonth =
        rec.lastRecordedDate && rec.lastRecordedDate.startsWith(currentMonth);

      if (!alreadyRecordedThisMonth && currentDayOfMonth >= rec.dayOfMonth) {
        const newTx: Transaction = {
          id: `tx_rec_${Date.now()}_${rec.id}`,
          date: today,
          type: "expense",
          description: `[Rutin] ${rec.name}`,
          category: rec.category,
          paymentMethod: rec.paymentMethod,
          amount: rec.amount,
          recordedBy: userName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          synced: false,
        };

        await db.transactions.add(newTx);
        await this.queueAction("create", "transactions", newTx);

        await db.recurring.update(rec.id, {
          lastRecordedDate: today,
        });
        const updatedRec = await db.recurring.get(rec.id);
        if (updatedRec) {
          await this.queueAction("update", "recurring", updatedRec);
        }

        recordedCount++;
      }
    }

    return recordedCount;
  }
}

export const syncEngine = SyncEngine.getInstance();
