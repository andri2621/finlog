import Dexie, { Table } from "dexie";
import {
  Transaction,
  Budget,
  SavingsGoal,
  SavingsLog,
  RecurringExpense,
  CategoryConfig,
  SyncQueueItem,
  UserProfile,
} from "./types";

export class FinLogDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  savings!: Table<SavingsGoal, string>;
  savings_logs!: Table<SavingsLog, string>;
  recurring!: Table<RecurringExpense, string>;
  categories!: Table<CategoryConfig, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  user_profile!: Table<UserProfile, string>;

  constructor() {
    super("FinLogDB");
    this.version(1).stores({
      transactions: "id, date, type, category, paymentMethod, recordedBy, createdAt, synced",
      budgets: "id, month, category",
      savings: "id, name",
      savings_logs: "id, date, savingsId, pocket, createdAt",
      recurring: "id, isActive, dayOfMonth",
      categories: "id, type, name, order",
      sync_queue: "++id, action, entity, createdAt",
      user_profile: "id, email",
    });
  }
}

export const db = new FinLogDatabase();
