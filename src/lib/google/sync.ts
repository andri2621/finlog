import { db } from "../db/db";
import { appendTransactionToSheet, fetchTransactionsFromSheet } from "./sheets";
import { Transaction, RecurringExpense } from "../db/types";
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

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
      this.updatePendingCount();

      // Auto-sync every 2 minutes to catch partner changes
      setInterval(() => {
        if (this.status.isOnline && this.credentials.accessToken && this.credentials.spreadsheetId) {
          this.syncNow().catch(() => {});
        }
      }, 2 * 60 * 1000);
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

  /**
   * Queue a transaction or entity for offline-first sync
   */
  private credentials: { accessToken?: string; spreadsheetId?: string } = {};

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
   * Trigger immediate sync of queue & pull latest from Google Sheet
   */
  public async syncNow(accessToken?: string, spreadsheetId?: string) {
    if (this.status.isSyncing) return;
    if (!this.status.isOnline) return;

    const token = accessToken || this.credentials.accessToken;
    const sheetId = spreadsheetId || this.credentials.spreadsheetId;

    this.status.isSyncing = true;
    this.status.error = null;
    this.notify();

    try {
      // 1. Process pending offline mutations
      const queue = await db.sync_queue.toArray();
      for (const item of queue) {
        if (item.entity === "transactions" && item.action === "create") {
          if (token && sheetId) {
            try {
              const success = await appendTransactionToSheet(
                token,
                sheetId,
                item.data as Transaction
              );
              if (success && item.id) {
                await db.sync_queue.delete(item.id);
              }
            } catch (err: any) {
              // If token expired (401), stop trying
              if (err?.status === 401 || err?.message?.includes("401")) {
                this.status.error = "Token expired";
                break;
              }
            }
          }
          // Leave in queue if no token — will retry when token is refreshed
        }
        // Other entity types stay in queue until full sync support is added
      }

      // 2. If Google Sheet connected, pull latest changes from partner
      if (token && sheetId) {
        const remoteTxs = await fetchTransactionsFromSheet(token, sheetId);
        if (remoteTxs.length > 0) {
          await db.transactions.bulkPut(remoteTxs);
        }
      }

      this.status.lastSyncedAt = new Date();
      await this.updatePendingCount();
    } catch (err: any) {
      this.status.error = err?.message || "Sync failed";
    } finally {
      this.status.isSyncing = false;
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
        // Create transaction
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

        // Update recurring record date
        await db.recurring.update(rec.id, {
          lastRecordedDate: today,
        });

        recordedCount++;
      }
    }

    return recordedCount;
  }
}

export const syncEngine = SyncEngine.getInstance();
