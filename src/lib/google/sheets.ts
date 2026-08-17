import {
  Transaction,
  Budget,
  SavingsGoal,
  SavingsLog,
  RecurringExpense,
  CategoryConfig,
} from "../db/types";

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  accessToken?: string;
}

export const SHEETS_TABS = {
  TRANSACTIONS: "Transactions",
  BUDGETS: "Budgets",
  SAVINGS: "Savings",
  SAVINGS_LOGS: "Savings_Logs",
  RECURRING: "Recurring",
  CONFIG: "Config",
};

/**
 * Creates the standard FinLog multi-tab spreadsheet in user's Google Drive.
 */
export async function createFinLogSpreadsheet(
  accessToken: string,
  title: string = "FINLOG",
  initialCategories?: CategoryConfig[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: SHEETS_TABS.TRANSACTIONS,
            gridProperties: { rowCount: 1000, columnCount: 10, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.BUDGETS,
            gridProperties: { rowCount: 100, columnCount: 5, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.SAVINGS,
            gridProperties: { rowCount: 50, columnCount: 8, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.SAVINGS_LOGS,
            gridProperties: { rowCount: 500, columnCount: 8, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.RECURRING,
            gridProperties: { rowCount: 50, columnCount: 10, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.CONFIG,
            gridProperties: { rowCount: 100, columnCount: 6, frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Google Sheet: ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl =
    data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers to all sheets
  await initializeSheetHeaders(accessToken, spreadsheetId);

  // Write initial categories to Config tab if provided
  if (initialCategories && initialCategories.length > 0) {
    await populateInitialCategories(accessToken, spreadsheetId, initialCategories);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Populate initial categories and payment methods to the Config tab
 */
export async function populateInitialCategories(
  accessToken: string,
  spreadsheetId: string,
  categories: CategoryConfig[]
) {
  if (!categories || categories.length === 0) return;
  const rows = categories.map((cat) => [
    cat.id,
    cat.type,
    cat.name,
    cat.color,
    cat.icon || "Tag",
    cat.order,
  ]);

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.CONFIG}!A2:F${rows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      }
    );
  } catch (err) {
    console.warn("Failed to populate initial categories into Google Sheet:", err);
  }
}

/**
 * Populate standard column headers for all 6 tabs
 */
export async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  const headerData = [
    {
      range: `${SHEETS_TABS.TRANSACTIONS}!A1:J1`,
      values: [
        [
          "ID",
          "Tanggal",
          "Tipe",
          "Deskripsi",
          "Kategori",
          "Metode Pembayaran",
          "Jumlah (IDR)",
          "Dicatat Oleh",
          "Created At",
          "Updated At",
        ],
      ],
    },
    {
      range: `${SHEETS_TABS.BUDGETS}!A1:D1`,
      values: [["ID", "Bulan", "Kategori", "Batas Anggaran (IDR)"]],
    },
    {
      range: `${SHEETS_TABS.SAVINGS}!A1:G1`,
      values: [
        [
          "ID",
          "Nama Target",
          "Target Jumlah",
          "Terkumpul",
          "Tenggat Tanggal",
          "Ikon",
          "Warna",
        ],
      ],
    },
    {
      range: `${SHEETS_TABS.SAVINGS_LOGS}!A1:H1`,
      values: [
        [
          "ID",
          "Tanggal",
          "Savings ID",
          "Nama Target",
          "Tempat Dana",
          "Jumlah",
          "Dicatat Oleh",
          "Created At",
        ],
      ],
    },
    {
      range: `${SHEETS_TABS.RECURRING}!A1:J1`,
      values: [
        [
          "ID",
          "Nama Tagihan",
          "Jumlah",
          "Kategori",
          "Metode Pembayaran",
          "Frekuensi",
          "Hari Eksekusi",
          "Otomatis Catat",
          "Terakhir Dicatat",
          "Status Aktif",
        ],
      ],
    },
    {
      range: `${SHEETS_TABS.CONFIG}!A1:F1`,
      values: [["ID", "Tipe", "Nama", "Warna", "Ikon", "Urutan"]],
    },
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: headerData,
      }),
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRANSACTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction
) {
  const row = [
    tx.id,
    tx.date,
    tx.type,
    tx.description,
    tx.category,
    tx.paymentMethod,
    tx.amount,
    tx.recordedBy,
    tx.createdAt,
    tx.updatedAt,
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.TRANSACTIONS}!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  return response.ok;
}

export async function updateTransactionInSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: Transaction
): Promise<boolean> {
  const readResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.TRANSACTIONS}!A2:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!readResponse.ok) return false;

  const readData = await readResponse.json();
  const idRows: string[][] = readData.values || [];

  const rowIndex = idRows.findIndex((r) => r[0] === tx.id);
  if (rowIndex === -1) {
    return appendTransactionToSheet(accessToken, spreadsheetId, tx);
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEETS_TABS.TRANSACTIONS}!A${sheetRow}:J${sheetRow}`;
  const row = [
    tx.id,
    tx.date,
    tx.type,
    tx.description,
    tx.category,
    tx.paymentMethod,
    tx.amount,
    tx.recordedBy,
    tx.createdAt,
    tx.updatedAt,
  ];

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );

  return updateResponse.ok;
}

export async function deleteTransactionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  txId: string
): Promise<boolean> {
  return deleteRowByTabAndId(accessToken, spreadsheetId, SHEETS_TABS.TRANSACTIONS, txId);
}

export async function fetchTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Transaction[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.TRANSACTIONS}!A2:J`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    date: row[1] || "",
    type: (row[2] || "expense") as "expense" | "income",
    description: row[3] || "",
    category: row[4] || "",
    paymentMethod: row[5] || "",
    amount: Number(row[6]) || 0,
    recordedBy: row[7] || "",
    createdAt: row[8] || new Date().toISOString(),
    updatedAt: row[9] || new Date().toISOString(),
    synced: true,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUDGETS TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveBudgetToSheet(
  accessToken: string,
  spreadsheetId: string,
  budget: Budget
): Promise<boolean> {
  const readResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.BUDGETS}!A2:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!readResponse.ok) return false;

  const readData = await readResponse.json();
  const idRows: string[][] = readData.values || [];
  const rowIndex = idRows.findIndex((r) => r[0] === budget.id);

  const row = [budget.id, budget.month, budget.category, budget.limitAmount];

  if (rowIndex === -1) {
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.BUDGETS}!A:D:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );
    return appendResponse.ok;
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEETS_TABS.BUDGETS}!A${sheetRow}:D${sheetRow}`;
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  return updateResponse.ok;
}

export async function deleteBudgetFromSheet(
  accessToken: string,
  spreadsheetId: string,
  budgetId: string
): Promise<boolean> {
  return deleteRowByTabAndId(accessToken, spreadsheetId, SHEETS_TABS.BUDGETS, budgetId);
}

export async function fetchBudgetsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Budget[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.BUDGETS}!A2:D`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    month: row[1] || "",
    category: row[2] || "",
    limitAmount: Number(row[3]) || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAVINGS TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveSavingsToSheet(
  accessToken: string,
  spreadsheetId: string,
  savings: SavingsGoal
): Promise<boolean> {
  const readResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.SAVINGS}!A2:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!readResponse.ok) return false;

  const readData = await readResponse.json();
  const idRows: string[][] = readData.values || [];
  const rowIndex = idRows.findIndex((r) => r[0] === savings.id);

  const row = [
    savings.id,
    savings.name,
    savings.targetAmount,
    savings.currentAmount,
    savings.targetDate || "",
    savings.icon,
    savings.color,
  ];

  if (rowIndex === -1) {
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.SAVINGS}!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );
    return appendResponse.ok;
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEETS_TABS.SAVINGS}!A${sheetRow}:G${sheetRow}`;
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  return updateResponse.ok;
}

export async function deleteSavingsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  savingsId: string
): Promise<boolean> {
  return deleteRowByTabAndId(accessToken, spreadsheetId, SHEETS_TABS.SAVINGS, savingsId);
}

export async function fetchSavingsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SavingsGoal[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.SAVINGS}!A2:G`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    name: row[1] || "",
    targetAmount: Number(row[2]) || 0,
    currentAmount: Number(row[3]) || 0,
    targetDate: row[4] || undefined,
    icon: row[5] || "Target",
    color: row[6] || "#EC4899",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SAVINGS_LOGS TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function appendSavingsLogToSheet(
  accessToken: string,
  spreadsheetId: string,
  log: SavingsLog
): Promise<boolean> {
  const row = [
    log.id,
    log.date,
    log.savingsId,
    log.savingsName,
    log.pocket,
    log.amount,
    log.recordedBy,
    log.createdAt,
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.SAVINGS_LOGS}!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  return response.ok;
}

export async function fetchSavingsLogsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SavingsLog[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.SAVINGS_LOGS}!A2:H`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    date: row[1] || "",
    savingsId: row[2] || "",
    savingsName: row[3] || "",
    pocket: row[4] || "",
    amount: Number(row[5]) || 0,
    recordedBy: row[6] || "",
    createdAt: row[7] || new Date().toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RECURRING TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveRecurringToSheet(
  accessToken: string,
  spreadsheetId: string,
  rec: RecurringExpense
): Promise<boolean> {
  const readResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.RECURRING}!A2:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!readResponse.ok) return false;

  const readData = await readResponse.json();
  const idRows: string[][] = readData.values || [];
  const rowIndex = idRows.findIndex((r) => r[0] === rec.id);

  const row = [
    rec.id,
    rec.name,
    rec.amount,
    rec.category,
    rec.paymentMethod,
    rec.frequency,
    rec.dayOfMonth,
    rec.autoRecord ? "TRUE" : "FALSE",
    rec.lastRecordedDate || "",
    rec.isActive ? "TRUE" : "FALSE",
  ];

  if (rowIndex === -1) {
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.RECURRING}!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );
    return appendResponse.ok;
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEETS_TABS.RECURRING}!A${sheetRow}:J${sheetRow}`;
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  return updateResponse.ok;
}

export async function deleteRecurringFromSheet(
  accessToken: string,
  spreadsheetId: string,
  recurringId: string
): Promise<boolean> {
  return deleteRowByTabAndId(accessToken, spreadsheetId, SHEETS_TABS.RECURRING, recurringId);
}

export async function fetchRecurringFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<RecurringExpense[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.RECURRING}!A2:J`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    name: row[1] || "",
    amount: Number(row[2]) || 0,
    category: row[3] || "",
    paymentMethod: row[4] || "",
    frequency: (row[5] || "monthly") as any,
    dayOfMonth: Number(row[6]) || 1,
    autoRecord: String(row[7]).toUpperCase() === "TRUE",
    lastRecordedDate: row[8] || undefined,
    isActive: String(row[9]).toUpperCase() !== "FALSE",
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONFIG / CATEGORIES TAB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCategoryToSheet(
  accessToken: string,
  spreadsheetId: string,
  cat: CategoryConfig
): Promise<boolean> {
  const readResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.CONFIG}!A2:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!readResponse.ok) return false;

  const readData = await readResponse.json();
  const idRows: string[][] = readData.values || [];
  const rowIndex = idRows.findIndex((r) => r[0] === cat.id);

  const row = [cat.id, cat.type, cat.name, cat.color, cat.icon || "Tag", cat.order];

  if (rowIndex === -1) {
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.CONFIG}!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: [row] }),
      }
    );
    return appendResponse.ok;
  }

  const sheetRow = rowIndex + 2;
  const range = `${SHEETS_TABS.CONFIG}!A${sheetRow}:F${sheetRow}`;
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  return updateResponse.ok;
}

export async function deleteCategoryFromSheet(
  accessToken: string,
  spreadsheetId: string,
  categoryId: string
): Promise<boolean> {
  return deleteRowByTabAndId(accessToken, spreadsheetId, SHEETS_TABS.CONFIG, categoryId);
}

export async function fetchCategoriesFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<CategoryConfig[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEETS_TABS.CONFIG}!A2:F`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.values || [];

  return rows.map((row: any[]) => ({
    id: row[0] || "",
    type: (row[1] || "expense_category") as any,
    name: row[2] || "",
    color: row[3] || "#10B981",
    icon: row[4] || "Tag",
    order: Number(row[5]) || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC HELPER: Delete row by Tab Name and Record ID
// ─────────────────────────────────────────────────────────────────────────────

async function deleteRowByTabAndId(
  accessToken: string,
  spreadsheetId: string,
  tabTitle: string,
  recordId: string
): Promise<boolean> {
  try {
    const metaResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaResponse.ok) return false;
    const meta = await metaResponse.json();
    const sheetsArr = meta.sheets || [];
    const targetSheet = sheetsArr.find((s: any) => s.properties?.title === tabTitle);
    if (!targetSheet) return false;
    const sheetId = targetSheet.properties.sheetId;

    const readResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabTitle}!A2:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!readResponse.ok) return false;
    const readData = await readResponse.json();
    const idRows: string[][] = readData.values || [];
    const rowIndex = idRows.findIndex((r) => r[0] === recordId);
    if (rowIndex === -1) return true; // Already removed

    const sheetRowIndex = rowIndex + 1; // 0-indexed for batchUpdate (excluding header row index 0)

    const deleteResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: sheetRowIndex,
                  endIndex: sheetRowIndex + 1,
                },
              },
            },
          ],
        }),
      }
    );

    return deleteResponse.ok;
  } catch (err) {
    console.error(`Failed to delete row from tab ${tabTitle}:`, err);
    return false;
  }
}
