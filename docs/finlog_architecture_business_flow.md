# FinLog: Panduan Arsitektur & Business Flow

Dokumen ini merupakan panduan teknis komprehensif (Architecture & Business Flow) untuk aplikasi **FinLog**, yang dirancang sebagai aplikasi *pencatatan keuangan bersama berbasis Google Sheets* secara *Real-Time* dan *Offline-First*.

---

## 1. Ringkasan Visi & Produk

**FinLog** adalah aplikasi keuangan pribadi/pasangan yang sepenuhnya **backend-less** (tidak menggunakan server database seperti PostgreSQL atau MongoDB). Sebagai gantinya, FinLog menggunakan **Google Sheets milik pengguna** sebagai database utama penyimpan data.

**Keunggulan Utama:**
- **Privasi 100%:** Data tidak tersimpan di server pihak ketiga, melainkan di Google Drive pengguna itu sendiri.
- **Offline-First:** Dirancang sebagai PWA (Progressive Web App). Pengguna dapat mencatat pengeluaran di pedalaman tanpa sinyal, dan data akan disinkronisasi (*sync*) ke Google Sheets secara otomatis saat koneksi internet kembali pulih.
- **Kolaborasi Real-Time:** Jika dua orang (contoh: suami-istri) membuka aplikasi dan terhubung ke Spreadsheet yang sama, sinkronisasi dua arah akan terjadi saat aplikasi memuat ulang (melalui sinkronisasi data IndexedDB & Sheets API).
- **Gamifikasi & AI:** Peringatan batas anggaran, tabungan target (*Savings Goals*), catatan berulang, dan pemindai struk otomatis (menggunakan Gemini 1.5 Flash Vision API).

---

## 2. Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Styling:** Tailwind CSS v4
- **Komponen UI:** Lucide React (Ikon), kustom CSS Variables untuk Light/Dark Mode
- **Database Lokal:** Dexie.js (pembungkus IndexedDB)
- **API Eksternal:** 
  - Google Identity Services (GIS) untuk OAuth2 Login.
  - Google Sheets API v4 & Google Drive API v3 untuk sinkronisasi.
  - Google Gemini API (`gemini-1.5-flash-latest`) untuk *Receipt Scanner*.

---

## 3. Arsitektur Sinkronisasi (Offline-First)

Arsitektur FinLog bergantung pada pola sinkronisasi dua arah antara **IndexedDB (Lokal)** dan **Google Sheets (Remote)**, yang dikendalikan oleh `syncEngine.ts`.

### 3.1. Alur Tambah Transaksi (Offline & Online)
1. Pengguna memasukkan transaksi baru.
2. Data langsung disimpan secara instan ke IndexedDB lokal (`db.transactions.add()`). Layar UI langsung diperbarui (*Optimistic UI*).
3. Transaksi tersebut dimasukkan ke dalam **Antrean Sinkronisasi** (`db.sync_queue`).
4. `syncEngine` memeriksa status internet (`navigator.onLine`):
   - **Jika Offline:** Transaksi dibiarkan di dalam antrean. Pengguna bisa menutup aplikasi.
   - **Jika Online & Token Akses Ada:** `syncEngine` akan memproses antrean tersebut dengan menembak API Google Sheets (`appendTransactionToSheet`). Jika berhasil, transaksi dihapus dari antrean lokal.
   - **Jika Online tapi Token Hilang/Kedaluwarsa:** Transaksi tetap di dalam antrean sampai pengguna mendapatkan token baru (misal dengan login ulang), mencegah data hilang (Bug ini telah diperbaiki di iterasi terakhir dengan menyimpan token di `localStorage`).

### 3.2. Penanganan Token (Google Auth)
Google Identity Services tidak memberikan *Refresh Token* melalui pola *Implicit Grant* (sisi klien). Token akses hanya berlaku selama 1 jam. 
- Saat *login*, token akses disimpan ke `localStorage` (`finlog_google_token`) dengan masa berlaku 55 menit.
- Jika pengguna me-*refresh* tab, aplikasi mengambil kembali token tersebut dari `localStorage` untuk melanjutkan sinkronisasi secara transparan.

---

## 4. Alur Bisnis (Business Flow) & Keamanan

### 4.1. Alur Autentikasi (Auth Guard)
- **Komponen Penjaga:** `AppShell.tsx` memonitor `isAuthenticated`.
- Jika pengguna belum memilih/membuat Spreadsheet dan mengaitkan akun, URL yang dilindungi (seperti `/settings`, `/history`) akan **diblokir** dan pengguna dilempar kembali ke `/welcome`.
- Halaman `/onboarding` dan `/welcome` juga tidak bisa diakses secara terbalik oleh pengguna yang sudah *login* penuh.

### 4.2. Alur Onboarding (Pembuatan Spreadsheet)
1. Pengguna login dengan Google.
2. Dialihkan ke `/onboarding`.
3. Pengguna menyesuaikan Kategori (Pengeluaran/Pemasukan), Metode Pembayaran, dll.
4. Aplikasi menembak **Google Drive API** dan **Google Sheets API** untuk membuat file `.xlsx` secara otomatis dengan *header* dan format tabel baku.
5. Jika API dinonaktifkan di Google Cloud Console pengguna, pembuatan gagal dan pengguna ditahan di halaman *onboarding* dengan pesan error yang jelas (Mencegah kerusakan *sync* di kemudian hari).

---

## 5. Skema Database (IndexedDB & Google Sheets)

### 5.1. Tabel IndexedDB Lokal (`db.ts`)
- `user_profile`: Menyimpan data profil (Nama, Email, Spreadsheet ID, Notifikasi, Mode Terang/Gelap).
- `transactions`: Semua histori arus kas (Tipe: `income`, `expense`).
- `categories`: Master data kategori, saku/dompet, dan metode pembayaran.
- `budgets`: Batas anggaran bulanan (`limitAmount`).
- `savings`: Tujuan tabungan (*targetAmount*, *currentAmount*).
- `savings_logs`: Histori setoran tabungan.
- `recurring`: Catatan otomatis berulang (Tagihan bulanan, berlangganan).
- `sync_queue`: Penyimpan aksi tertunda selama *offline*.

### 5.2. Format Tab (Sheet) di Google Sheets
Setiap tabel lokal di atas dipetakan langsung ke "Tab" terpisah di Google Sheets yang sama:
1. `TRANSACTIONS`
2. `BUDGETS`
3. `SAVINGS`
4. `SAVINGS_LOGS`
5. `RECURRING`
6. `CONFIG`

*(Catatan: Jangan ubah judul baris pertama / header di dalam Google Sheets agar sinkronisasi tidak rusak).*

---

## 6. Keterbatasan & Roadmap (*Enterprise Readiness*)

Walaupun FinLog telah berjalan seperti *Enterprise Business*, terdapat hal yang patut diperhatikan di sisi klien (Client-Side Only):
1. **Push Notification:** Saat ini aplikasi hanya mendukung pengingat lokal harian yang dihitung secara *heuristic* ketika aplikasi dibuka. Notifikasi *Push* murni dari *Background Service Worker* ketika aplikasi tertutup membutuhkan koneksi VAPID ke *backend server*, yang mana aplikasi ini tidak memilikinya (murni serverless).
2. **Keamanan:** Kunci API bawaan (seperti `NEXT_PUBLIC_GEMINI_API_KEY`) terekspos di sisi klien. Pada rilis produksi sungguhan, pastikan kunci ini memiliki *HTTP Referrer Restrictions* di Google Cloud Console untuk menghindari penyalahgunaan (*quota theft*).

---
*Dibuat & disempurnakan oleh Antigravity AI.*
