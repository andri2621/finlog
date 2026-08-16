import { Transaction, Budget, SavingsGoal, RecurringExpense } from "../db/types";

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
 * Creates the standard DuitLog multi-tab spreadsheet in user's Google Drive.
 */
export async function createDuitLogSpreadsheet(
  accessToken: string,
  title: string = "DUITLOG-KEUANGAN"
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
            gridProperties: { rowCount: 500, columnCount: 7, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.RECURRING,
            gridProperties: { rowCount: 50, columnCount: 9, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: SHEETS_TABS.CONFIG,
            gridProperties: { rowCount: 50, columnCount: 5, frozenRowCount: 1 },
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
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers to all sheets
  await initializeSheetHeaders(accessToken, spreadsheetId);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Populate standard column headers
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
      range: `${SHEETS_TABS.SAVINGS_LOGS}!A1:G1`,
      values: [
        [
          "ID",
          "Tanggal",
          "Savings ID",
          "Nama Target",
          "Tempat Dana",
          "Jumlah",
          "Dicatat Oleh",
        ],
      ],
    },
    {
      range: `${SHEETS_TABS.RECURRING}!A1:I1`,
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
        ],
      ],
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

/**
 * Append transaction row to Transactions tab in Google Sheets
 */
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

/**
 * Fetch all transactions from Google Sheet
 */
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
