# S-FIN Presensi: Sistem Presensi Karyawan Terintegrasi Geofencing

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-emerald?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?logo=pwa)](https://web.dev/progressive-web-apps/)

**S-FIN Presensi** adalah aplikasi presensi karyawan berbasis web seluler (*mobile-first*) dan panel manajemen operasional modern yang dirancang khusus untuk **PT Senndyt Sarungtangan Kreatif (Bantul, D.I. Yogyakarta)**.

Aplikasi ini mengintegrasikan validasi lokasi presensi berbasis **Geofencing (GPS)** menggunakan formula Haversine di tingkat database, sistem manajemen jam kerja fleksibel (termasuk jam kerja hari Sabtu & istirahat), modul pengajuan izin/cuti/sakit, distribusi slip gaji digital dari Excel, notifikasi internal, serta rekapitulasi absensi bulanan otomatis dengan ekspor file Excel (`.xlsx`) berformat rapi.

---

## 📑 Daftar Isi
- [Fitur Utama](#-fitur-utama)
  - [Sisi Karyawan (Mobile-First & PWA)](#-sisi-karyawan-mobile-first--pwa)
  - [Sisi Administrator (Admin Dashboard)](#-sisi-administrator-admin-dashboard)
- [Arsitektur & Tumpukan Teknologi](#-arsitektur--tumpukan-teknologi)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
  - [1. Klon Repositori & Instalasi Dependensi](#1-klon-repositori--instalasi-dependensi)
  - [2. Konfigurasi Environment Variables](#2-konfigurasi-environment-variables)
  - [3. Eksekusi Skema Database Supabase](#3-eksekusi-skema-database-supabase)
  - [4. Kredensial Administrator Default](#4-kredensial-administrator-default)
  - [5. Menjalankan Aplikasi](#5-menjalankan-aplikasi)
- [Keamanan & Integritas Data](#-keamanan--integritas-data)
- [Lisensi & Kepemilikan](#-lisensi--kepemilikan)

---

## ✨ Fitur Utama

### 📱 Sisi Karyawan (Mobile-First & PWA)
*   **Progressive Web App (PWA)**: Dapat diinstal langsung ke Layar Utama (*Home Screen*) perangkat Android & iOS dengan prompt instalasi otomatis, ikon adaptif, dan fallback offline yang andal.
*   **Akurasi Jam Digital WIB**: Jam digital real-time sinkron dengan zona waktu resmi pabrik (`Asia/Jakarta`, UTC+7).
*   **Tombol Presensi Cepat & Ergonomis**:
    *   **Absen Masuk (*Clock-In*)**: Mencatat waktu kehadiran secara otomatis menentukan status *Tepat Waktu* atau *Terlambat* berdasarkan toleransi jam kerja.
    *   **Absen Pulang (*Clock-Out*)**: Mencatat kepulangan tanpa menghapus data keterlambatan jam masuk.
    *   **Pencatatan Istirahat**: Tombol mulai istirahat dan selesai istirahat terintegrasi validasi lokasi.
*   **Validasi Jarak Geofencing (GPS)**:
    *   Karyawan wajib berada di dalam radius toleransi kantor/pabrik (misal 50 meter) yang dihitung presisi dengan formula Haversine.
    *   Pencegahan pemalsuan koordinat dengan validasi langsung di database PostgreSQL melalui Stored Procedure.
*   **Pusat Informasi Terintegrasi**:
    *   **Pengumuman & Notifikasi**: Membaca pemberitahuan broadcast dari perusahaan atau pesan privat dari admin dengan lencana (*badge*) belum dibaca.
    *   **Ringkasan Absensi Per Periode**: Menampilkan total hari masuk, frekuensi terlambat, dan akumulasi lembur (Periode 1: tgl 1–15, Periode 2: tgl 16–akhir bulan).
    *   **Pengajuan Izin, Cuti & Sakit**: Formulir pengajuan izin online mandiri dengan riwayat status (*Pending*, *Approved*, *Rejected*).
    *   **Slip Gaji Digital**: Melihat rincian gaji (gaji pokok, tunjangan, premi, lembur, potongan jam, potongan lain-lain, hingga total gaji bersih) secara transparan.
*   **Riwayat Presensi Mingguan**: Kartu riwayat 7 hari terakhir dilengkapi status, rincian jam masuk, jam pulang, dan durasi istirahat.

### 🖥️ Sisi Administrator (Admin Dashboard)
*   **Dashboard Statistik Real-Time**:
    *   Indikator kehadiran harian: Total Karyawan, Hadir, Terlambat, dan Mangkir (*Absent*).
    *   Grafik interaktif tren absensi 7 hari terakhir (Recharts).
    *   Tabel log kehadiran terkini dengan status keterlambatan dan kelebihan jam kerja (lembur).
*   **Manajemen Karyawan (*Employee Management*)**:
    *   Pendaftaran karyawan baru secara manual (NIK, Nama Lengkap, Role, PIN/Sandi).
    *   **Batch Import via Excel**: Mengimpor puluhan hingga ratusan data karyawan dari file `.xlsx` sekaligus secara instan lewat fungsi RPC PostgreSQL aman (`admin_create_users_batch`), tanpa hambatan rate limit auth API.
    *   Pencarian karyawan dinamis berdasarkan Nama atau NIK.
    *   Filter dan pengurutan (Terbaru, Urutan Excel Asli, Abjad Nama, dan NIK).
    *   Edit data profil, ganti PIN/Sandi, tampil/sembunyi sandi, dan reset data karyawan.
*   **Rekapitulasi Kehadiran Bulanan (*Monthly Attendance Recap*)**:
    *   Grid dua dimensi yang responsif dengan *sticky header* dan *sticky column* (nama & NIK tetap terlihat saat scroll horizontal).
    *   Pilihan rentang tanggal fleksibel (misal cut-off tanggal 1–15, 16–31, atau kustom).
    *   Deteksi hari Minggu otomatis sebagai hari **Libur**.
    *   **Koreksi Absensi Manual**: Cukup klik sel pada tanggal dan karyawan bersangkutan untuk menambah, memperbaiki jam masuk/pulang, atau menghapus catatan presensi.
    *   **Ekspor Excel (.XLSX) Berformat Cantik**: File Excel native lengkap dengan warna penanda (Hijau = Hadir/Tepat Waktu, Kuning = Terlambat, Biru = Libur), kolom ringkasan total hadir, total menit terlambat, dan total menit lembur.
*   **Manajemen Pengajuan Izin & Cuti (*Leave Management*)**:
    *   Daftar pengajuan izin/sakit/cuti karyawan masuk yang memerlukan persetujuan.
    *   Tombol *Setujui* (*Approve*) atau *Tolak* (*Reject*).
    *   **Sinkronisasi Otomatis**: Jika disetujui, sistem otomatis mencatat log absensi bertipe Izin/Sakit/Cuti pada rentang tanggal tersebut dan membersihkan catatan jika status dibatalkan, tanpa menimbulkan data ganda.
*   **Manajemen Slip Gaji (*Payslip Management*)**:
    *   Upload file Excel laporan gaji (mendukung file penggajian standar HRD).
    *   Pemetaan NIK dan kolom otomatis (gaji pokok, lembur, borongan, premi, tunjangan, potongan).
    *   Pengelompokan periode berdasarkan Bulan, Tahun, dan Label (Awal Bulan / Akhir Bulan).
    *   Manajemen hapus data slip gaji per periode jika terdapat kekeliruan data penggajian.
*   **Manajemen Notifikasi & Pengumuman**:
    *   Mengirim notifikasi broadcast ke seluruh karyawan atau notifikasi personal ke karyawan tertentu.
    *   Kategori pengumuman: Informasi (*Info*), Peringatan (*Warning*), atau Berita Baik (*Success*).
*   **Konfigurasi Titik Pabrik & Jam Kerja (*Geofence Settings*)**:
    *   Pengaturan koordinat Latitude & Longitude pusat pabrik beserta radius geofence (meter).
    *   Pengaturan jam masuk reguler (Senin–Jumat) dan toleransi keterlambatan (default 15 menit).
    *   Pengaturan jam kerja khusus hari **Sabtu (Setengah Hari)**.
    *   Pengaturan jam mulai & selesai istirahat.
    *   Pengaturan ambang batas lembur (*Overtime threshold*, default 30 menit).

---

## 🛠️ Arsitektur & Tumpukan Teknologi

| Lapisan | Teknologi / Pustaka | Keterangan |
|---|---|---|
| **Framework** | Next.js 16.2.10 (App Router, Turbopack) | Server Components & Client Components modern |
| **Bahasa & Runtime** | TypeScript 5 (Strict Mode), React 19.2.4 | Bebas tipe `any`, 100% type-safe |
| **Styling & UI** | Tailwind CSS v4 | Responsif, antarmuka modern, animasi transisi halus |
| **Visualisasi Data** | Recharts 2.15 | Grafik tren kehadiran mingguan interaktif |
| **Pengolahan Spreadsheet** | SheetJS (`xlsx` 0.18.5) | Import massal karyawan, import slip gaji, dan ekspor rekapitulasi XLSX |
| **Database & Auth** | Supabase (PostgreSQL 15+) | Row Level Security (RLS), Stored Procedures (PL/pgSQL), RPCs |
| **Kriptografi & Identitas** | PostgreSQL `pgcrypto` & `uuid-ossp` | Enkripsi bcrypt untuk password pengguna |
| **Offline & PWA** | Service Worker (`sw.js`) & Web App Manifest | Dukungan instalasi perangkat seluler dan navigasi offline |
| **Zona Waktu** | `Asia/Jakarta` (WIB, UTC+7) | Utilitas sentral deterministik di frontend dan backend |

---

## 📁 Struktur Direktori

```text
s-fin-presensi/
├── public/
│   ├── favicon.png             # Ikon aplikasi & logo PWA
│   ├── manifest.json           # Web App Manifest untuk instalasi PWA
│   └── sw.js                   # Service worker caching & offline support
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx        # Dashboard Panel Administrator
│   │   ├── globals.css         # Style global Tailwind CSS & keyframe animasi
│   │   ├── layout.tsx          # Root layout aplikasi & provider PWA
│   │   └── page.tsx            # Halaman utama Presensi Karyawan (Mobile)
│   ├── components/
│   │   ├── PwaInstallPrompt.tsx # Banner interaktif ajakan instalasi PWA
│   │   ├── admin/              # Komponen modular Administrator
│   │   │   ├── AdminModals.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── EmployeeManager.tsx
│   │   │   ├── GeofenceSettingsCard.tsx
│   │   │   ├── LeaveManager.tsx
│   │   │   ├── MonthlyRecapGrid.tsx
│   │   │   ├── NotificationManager.tsx
│   │   │   └── PayslipManager.tsx
│   │   └── employee/           # Komponen modular Karyawan
│   │       ├── AttendanceActionCard.tsx
│   │       ├── AttendanceConfirmModal.tsx
│   │       ├── AttendanceFeedbackCard.tsx
│   │       ├── AttendanceHistoryList.tsx
│   │       ├── DigitalClock.tsx
│   │       ├── HeaderGreeting.tsx
│   │       ├── LogoutConfirmModal.tsx
│   │       ├── PayslipDetailModal.tsx
│   │       └── PusatInformasiModal.tsx
│   ├── lib/
│   │   ├── date.ts             # Utilitas zona waktu WIB (Asia/Jakarta)
│   │   ├── geo.ts              # Formula Haversine perhitungan jarak GPS
│   │   └── supabase.ts         # Inisialisasi Supabase Client & fallback lokal
│   └── types/
│       └── index.ts            # Tipe data TypeScript terpusat
├── supabase_schema.sql         # Skema database, fungsi PL/pgSQL & kebijakan RLS lengkap
├── next.config.ts              # Konfigurasi Next.js
├── tsconfig.json               # Konfigurasi TypeScript compiler
└── package.json
```

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Klon Repositori & Instalasi Dependensi
```bash
git clone <url-repositori-anda>
cd s-fin-presensi
npm install
```

### 2. Konfigurasi Environment Variables
Buat berkas `.env.local` di root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-supabase-anda>
```

> **Catatan Pengujian Lokal**: Jika kredensial belum diisi di `.env.local`, aplikasi menyediakan layar antarmuka konfigurasi langsung di browser yang otomatis menyimpan kredensial ke `localStorage`.

### 3. Eksekusi Skema Database Supabase
1. Masuk ke dashboard proyek **[Supabase](https://supabase.com/)** Anda.
2. Buka menu **SQL Editor**.
3. Buka berkas [`supabase_schema.sql`](supabase_schema.sql) dari proyek ini, salin seluruh kodenya, tempel (*paste*) ke SQL Editor, lalu klik tombol **Run**.
4. Di panel navigasi Supabase, buka menu **Authentication** ➔ **Providers** ➔ **Email**, lalu **Nonaktifkan (*Disable / Turn OFF*)** opsi **"Confirm email"** agar akun karyawan yang didaftarkan langsung berstatus terverifikasi dan dapat segera digunakan untuk presensi.

### 4. Kredensial Administrator Default
Setelah skema SQL dieksekusi, akun admin default otomatis dibuat:
*   **Email**: `arif.setiawan2209@gmail.com`
*   **Password**: `palamana`
*   **Peran (*Role*)**: `admin`

*(Anda dapat mengubah sandi atau membuat admin baru kapan saja melalui Supabase Dashboard atau Panel Admin).*

### 5. Menjalankan Aplikasi

*   **Mode Pengembangan (*Development*)**:
    ```bash
    npm run dev
    ```
    Akses [http://localhost:3000](http://localhost:3000) untuk tampilan Presensi Karyawan, atau [http://localhost:3000/admin](http://localhost:3000/admin) untuk Panel Admin.

*   **Pengecekan Tipe TypeScript**:
    ```bash
    npx tsc --noEmit
    ```

*   **Linting Kode (ESLint)**:
    ```bash
    npx eslint src
    ```

*   **Kompilasi Produksi (*Production Build*)**:
    ```bash
    npm run build
    npm run start
    ```

---

## 🔒 Keamanan & Integritas Data

1. **Row Level Security (RLS)**:
   - Seluruh tabel (`profiles`, `attendance_logs`, `geofence_settings`, `notifications`, `leave_requests`, `payslips`) dilindungi kebijakan RLS aktif.
   - Karyawan hanya memiliki akses baca/tulis ke data milik pribadinya (`auth.uid() = user_id`).
   - Seluruh fungsi administrasi diverifikasi oleh fungsi `public.is_admin()` berbasis Security Definer untuk mencegah eskalasi hak akses.
2. **Validasi Lokasi di Sisi Server (*Server-side Haversine*)**:
   - Penghitungan jarak koordinat GPS dilakukan langsung di dalam PostgreSQL Stored Procedure `log_attendance`. Upaya memodifikasi status kelulusan geofence dari sisi klien akan ditolak oleh database server.
3. **Pencegahan Data Duplikasi**:
   - Presensi Masuk hanya diizinkan satu kali per hari per karyawan (berdasarkan tanggal WIB).
   - Pengesahan izin/cuti otomatis menghapus log konflik pada tanggal bersangkutan dan membersihkannya saat izin ditolak atau dihapus.
   - Batch import slip gaji menggunakan mekanisme `upsert` dengan constraint unik `(user_id, period_month, period_year, period_label)`.

---

## 🏢 Kepemilikan

Aplikasi ini dikembangkan untuk operasional **PT Senndyt Sarungtangan Kreatif**, Bantul, D.I. Yogyakarta.
Dilarang memperbanyak atau memodifikasi tanpa izin manajemen terkait.
