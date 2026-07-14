# S-FIN Presensi: Sistem Absensi Karyawan Terintegrasi

S-FIN Presensi adalah aplikasi absensi karyawan berbasis web seluler (*mobile-first*) yang dilengkapi dengan panel administrasi modern, validasi jarak berbasis **Geofencing (GPS)**, dan otomasi perhitungan rekapitulasi kehadiran bulanan.

Aplikasi ini dibangun menggunakan **Next.js App Router** di bagian frontend dan didukung secara penuh oleh **Supabase Database & Authentication** di bagian backend.

---

## ✨ Fitur Utama

### 📱 Sisi Karyawan (Mobile-First)
*   **Absensi Dua Arah**: Clock-in (Absen Masuk) dan Clock-out (Absen Pulang) instan dengan tombol ergonomis berukuran besar.
*   **Validasi Lokasi GPS (Geofencing)**: Karyawan hanya bisa melakukan absensi jika berada di dalam radius toleransi yang ditentukan dari koordinat pabrik.
*   **Papan Riwayat Mingguan**: Menampilkan riwayat kehadiran dalam 7 hari terakhir beserta waktu masuk, jam pulang, dan durasi menit terlambat secara langsung.

### 🖥️ Sisi Administrator (Admin Panel)
*   **Dashboard Monitor Real-time**: Menampilkan grafik jumlah kehadiran hari ini, karyawan terlambat, karyawan mangkir, serta peta titik pabrik aktif.
*   **Kelola Data Karyawan**:
    *   Pendaftaran karyawan baru secara manual.
    *   **Import Karyawan via Excel**: Mendaftarkan hingga puluhan karyawan baru dalam kurang dari 1 detik dengan bypass GoTrue rate limit.
*   **Rekap Kehadiran Bulanan**:
    *   Tabel rekapitulasi dua sumbu yang interaktif (baris nama dan kolom ringkasan tetap menempel saat di-scroll horizontal/vertikal).
    *   **Koreksi Absensi Manual**: Admin cukup mengklik sel tanggal di grid rekap untuk menambah, mengedit jam, atau menghapus catatan absensi karyawan.
    *   Deteksi hari Minggu sebagai **Libur** secara otomatis.
    *   Ekspor rekapitulasi kehadiran bulanan langsung ke file `.CSV` (UTF-8 BOM, rapi dibuka di Microsoft Excel).
*   **Aturan Kerja Fleksibel**:
    *   Dapat mengatur titik pusat GPS koordinat pabrik dan radius toleransi (meter).
    *   Dapat mengatur jam kerja reguler dan toleransi keterlambatan.
    *   Dapat mengatur jam masuk khusus hari **Sabtu (Setengah Hari)**.

---

## 🛠️ Arsitektur Teknologi

*   **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
*   **Backend & DB**: Supabase (PostgreSQL, Row Level Security, Stored Procedures/RPC, Triggers)
*   **Algoritma Geofencing**: Rumus Haversine (dihitung langsung di sisi PostgreSQL Database Server untuk keamanan koordinat GPS).

---

## 🚀 Panduan Instalasi Lokal

### 1. Klon Repositori dan Instal Dependensi
```bash
git clone <url-repositori-anda>
cd s-fin-presensi
npm install
```

### 2. Konfigurasi Environment Variables
Buat file bernama `.env.local` di direktori utama (*root*) proyek dan masukkan kunci API Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<id-proyek-anda>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<kunci-anon-proyek-anda>
```

### 3. Eksekusi Schema Database
1. Buka dashboard proyek **Supabase** Anda -> **SQL Editor**.
2. Salin seluruh isi berkas [supabase_schema.sql](supabase_schema.sql) di dalam proyek ini.
3. Tempel (*paste*) kueri tersebut ke editor dan klik **Run**.
4. Di dashboard Supabase, masuk ke **Authentication** -> **Providers** -> **Email**, lalu **Nonaktifkan (OFF)** opsi **"Confirm email"** agar absensi karyawan dapat langsung aktif setelah di-import.

### 4. Akun Admin Default
Setelah menjalankan database schema di atas, akun Admin default akan otomatis dibuat:
*   **Email**: `arif.setiawan2209@gmail.com`
*   **Password**: `palamana`

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000) untuk tampilan Karyawan, atau [http://localhost:3000/admin](http://localhost:3000/admin) untuk masuk ke Dashboard Admin.
