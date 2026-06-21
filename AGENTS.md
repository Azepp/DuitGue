# AGENT.md — Duitgue

Panduan ini berlaku untuk semua AI agent (Claude, Cursor, Copilot, dll) yang bekerja di project ini.
Baca seluruh file ini sebelum menulis satu baris kode pun.

## 1. Overview Aplikasi
Duitgue adalah aplikasi mobile pencatatan keuangan personal berbahasa Indonesia dengan gaya visual **Neo-Brutalism**. Target pengguna adalah individu yang ingin mencatat pengeluaran dan pemasukan harian dengan mudah, cepat, dan tanpa hambatan.

### Fitur Utama
- **Pencatatan Transaksi:** Pengeluaran & Pemasukan menggunakan custom numpad keypad.
- **Kategori Kustom:** Bebas edit nama, pilihan warna solid, dan ikon (MaterialCommunityIcons).
- **Grafik Analitik:** Donut chart interaktif dengan segmen ber-border tebal + detail bar progress per kategori di bawahnya.
- **Laporan Ringkasan:** Tabel rekam jejak keuangan bulanan (Bulan | Pengeluaran | Pemasukan | Saldo).
- **Auth System:** SignUp (onboarding instan), Login, Forgot Password, dan Reset Password universal.
- **Profil & Keamanan (Gue):** Ganti Email (dengan validasi password), Hapus Akun, Export Data, Hapus Cache.
- **Bottom Navigation:** Rumah · Grafik · Laporan · Gue

---

## 2. Tech Stack
| Layer | Pilihan Teknologi |
| :--- | :--- |
| **Framework** | React Native (Expo SDK 56) |
| **Router** | Expo Router v3 (file-based) |
| **Backend & DB** | Supabase (PostgreSQL + Auth + Storage) |
| **Server State** | TanStack Query v5 |
| **Local State** | Zustand |
| **Local Storage** | MMKV (via `react-native-mmkv`) — *Jangan pakai AsyncStorage* |
| **Styling** | NativeWind v4 (Tailwind CSS untuk React Native) |
| **Form Handling**| React Hook Form + Zod |
| **Charts** | Victory Native XL |
| **Icons** | Expo Vector Icons (MaterialCommunityIcons) |
| **Notifikasi** | Expo Notifications |
| **OTA Update** | EAS Update |

⚠️ *Catatan Dev Client:* Expo Go SDK 56 tidak mendukung modul native eksternal seperti MMKV secara langsung. Gunakan Expo Dev Client untuk development lokal.

---

## 3. Struktur Folder & Navigasi (Expo Router)
```text
duitgue/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/                 # Unauthenticated Routes
│   │   ├── sign-up.tsx         # Layar "Daftar jadi UserDuit"
│   │   ├── login.tsx           # Layar "Halo lagi UserDuit"
│   │   ├── forgot-password.tsx # Layar "Lupa Password" (Input Email)
│   │   └── reset-password.tsx  # Universal Route (Buat Password Baru)
│   ├── (app)/                  # Authenticated Routes (Protected Gate)
│   │   ├── _layout.tsx         # Bottom Tab Navigator (Rumah, Grafik, Laporan, Gue)
│   │   ├── index.tsx           # Tab Rumah (Home Dashboard)
│   │   ├── grafik.tsx          # Tab Grafik (Donut Chart & List Kategori)
│   │   ├── laporan.tsx         # Tab Laporan (Ringkasan Bulanan)
│   │   ├── gue.tsx             # Tab Gue (Main Profile Settings)
│   │   └── detail-profile.tsx  # Sub-menu Detail Profil (Ganti Email & Hapus Akun)
│   └── _layout.tsx             # Root Layout (Session handler & global providers)
├── components/
│   ├── ui/                     # Aturan Komponen Dasar Neo-Brutalism (Button, Input, Card)
│   ├── transaction/            # TransactionItem, TransactionList, AddModal (Custom Numpad)
│   ├── category/               # CategoryPicker, CategorySettingsItem, AddNewCategory
│   └── charts/                 # CustomDonutChart, CategoryProgressBar
├── lib/
│   ├── supabase.ts             # Inisialisasi Client Supabase
│   ├── mmkv.ts                 # Akses Storage MMKV instance
│   └── utils.ts                # Helper global (formatRupiah, dll)

## 4. Design System & Aturan UI (Neo-Brutalism Style)
Palet Warna Utama
Kuning (Primary/Aksen) : #F5C518 — Digunakan untuk tombol utama, kartu saldo, FAB, dan highlight aktif.

Hijau (Pemasukan/Sukses): #4CAF50 — Digunakan untuk penanda pemasukan dan Toast Sukses.

Merah (Pengeluaran/Hapus): #F44336 — Digunakan untuk penanda pengeluaran dan tombol aksi destruktif.

Teal/Cyan (Aksen Google): #00BCD4 — Digunakan khusus tombol OAuth Google.

Hitam (Text/Border/Nav) : #1A1A1A — Warna border utama dan background tab bar.

Abu Muda (Background) : #F5F5F5 — Latar belakang dasar semua screen aplikasi.

Putih (Card/Input) : #FFFFFF — Latar belakang komponen di atas background utama.

Abu Abu (Text) : #BFC9D1

Aturan Grafis Neo-Brutalism (Wajib Kontras & Tegas)
Borders & Strokes: Semua komponen utama (Card, Button, Input, List Item) wajib memiliki border hitam tebal yang tegas: border-2 border-[#1A1A1A] atau border-[3px] border-[#1A1A1A].

Hard Shadows: Gunakan drop shadow solid (tanpa blur/blur radius 0) berwarna hitam: shadow-[4px_4px_0px_0px_#1A1A1A]. Saat tombol ditekan (pressed state), shadow menghilang (shadow-none) dan posisi komponen bergeser sedikit ke bawah/kanan (translate-x-[2px] translate-y-[2px]).

Donut Chart: Donut Chart harus memiliki border luar dan dalam berwarna hitam tebal (#1A1A1A). Pembatas antar-segmen menggunakan garis tipis atau menyatu secara solid menggunakan palet warna Neo-Brutalism.

Progress Bar Kategori: Representasikan persentase kategori di halaman grafik menggunakan bar horizontal kotak tebal yang diisi warna solid sesuai warna kategorinya, lengkap dengan border hitam tegas di sekelilingnya.

Bahasa & Copywriting UI
Seluruh teks UI wajib menggunakan Bahasa Indonesia informal/casual (playful tone) sesuai dengan rancangan Figma:

"Halo lagi UserDuit" (Bukan "Selamat Datang" atau "Welcome back")

"Daftar jadi UserDuit" (Bukan "Registrasi")

Teks tombol: "Masukkk", "Daftarrr", "Gaskeun", "Ganti", "Kirim".

Placeholder input: "lu punya nama panggilan...", "lu punya email...", "lu punya password...".

5. Database Schema (Supabase)
SQL
-- Profiles: Terikat otomatis dengan metadata auth.users Supabase
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Categories: Pengaturan kategori kustom milik user
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  icon text,           -- Nama ikon dari MaterialCommunityIcons
  color text,          -- String HEX warna solid (cth: #F44336)
  type text check (type in ('pengeluaran', 'pemasukan')),
  created_at timestamptz default now()
);

-- Transactions: Penyimpanan nominal keuangan
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount bigint not null,        -- Selalu disimpan dalam rupiah utuh (Integer, bukan pecahan desimal)
  type text check (type in ('pengeluaran', 'pemasukan')),
  note text,
  date date not null default current_date,
  created_at timestamptz default now()
);
⚠️ RLS (Row Level Security): Wajib diaktifkan di semua tabel. Setiap pengguna hanya diizinkan melakukan operasi CRUD pada baris data yang memiliki user_id cocok dengan ID autentikasi mereka sendiri.

6. Logic & Alur Autentikasi (Auth Flow)
1. Pendaftaran (SignUp) Tanpa Hambatan
Fitur "Confirm Email" di dashboard Supabase dimatikan.

Setelah user mengisi form pendaftaran dan menekan tombol "Daftarrr", pendaftaran sukses langsung membuat session aktif. Aplikasi langsung mengarahkan user ke halaman Dasbor Utama (app/(app)/index.tsx) tanpa mengunci mereka di halaman verifikasi email.

2. Universal Routing pada Reset Password
File app/(auth)/reset-password.tsx adalah Rute Universal. Halaman ini harus bisa diakses dari kondisi unauthenticated (lupa password dari halaman awal) maupun kondisi authenticated (pengguna yang sudah masuk namun lupa password saat ini ketika ingin mengganti email).

Jangan kunci halaman ini di dalam middleware / layout guard. Halaman ini bertugas menangkap Token Akses khusus dari Deep Linking email Supabase untuk memperbarui password menggunakan supabase.auth.updateUser({ password: new_password }).

3. Alur Ganti Email yang Aman (Post-Auth)
Berada di halaman detail-profile.tsx. User wajib menginput Email Baru dan Password Saat Ini.

Jika pengguna lupa password saat ini, disediakan teks tautan bertuliskan "Lupa password?".

Jika tautan tersebut diklik, aplikasi secara otomatis mendeteksi email user yang sedang aktif saat itu via session (supabase.auth.getUser()), lalu menembakkan fungsi resetPasswordForEmail langsung ke email lama tersebut tanpa meminta user mengetik ulang. Pengguna kemudian diarahkan langsung ke halaman reset-password.tsx melalui link email tersebut.

Perubahan email di database Supabase sifatnya pending sampai pengguna melakukan verifikasi klik link di inbox Gmail mereka yang baru.

7. Flow Layar Berdasarkan Figma
Skenario Auth & Akun
Sign Up / Login Flow: sign-up / login ➔ Sukses ➔ Langsung masuk Tab Rumah.

Forgot Password Flow: forgot-password ➔ Isi Email ➔ Klik Kirim ➔ Muncul Toast/Pop-Up Sukses hijau di bagian atas (Link berhasil dikirim cek email lu) ➔ Buka Gmail ➔ Klik Link ➔ Masuk reset-password (Layar "Buat Password baru") ➔ Sukses ➔ Redirect ke login.

Ganti Email Flow: Tab Gue ➔ detail-profile ➔ Klik "Ganti Email" ➔ Masuk Form Ganti Email ➔ Input Email baru + Password saat ini ➔ Klik Kirim ➔ Muncul Toast/Pop-Up Sukses hijau (Link ganti email berhasil dikirim ke @email).

Skenario Fitur Utama (Main App Tab Bar)
Tab Rumah (Home): Menampilkan info total saldo, ringkasan pengeluaran/pemasukan bulanan, dan list riwayat aktivitas transaksi. Di tengah tab bar terdapat FAB (+) untuk membuka Modal Input Transaksi dengan Numpad Custom bergaya Neo-Brutalism.

Tab Grafik: Filter Toggle ("Pengeluaran/Pemasukan" & "Pekan/Bulan/Tahun") + Slider Tahun. Visualisasi menggunakan Donut Chart tebal ber-tooltip tengah yang interaktif, diikuti dengan daftar kategori di bawahnya yang dilengkapi bar progress horizontal yang tebal.

Tab Laporan: Menampilkan ringkasan mutasi bulanan dalam format tabel struktural yang bersih dan kontras.

Tab Gue: Pusat kendali data lokal dan akun (Export Data, Hapus Cache, Keluar, dan navigasi ke Detail Profil).

8. Aturan Penting Kodingan (Coding Convensions)
Tipe Data Uang: Selalu gunakan integer (bigint / number) untuk nominal Rupiah. Jangan pernah menggunakan data bertipe float atau desimal untuk mencegah bug pembulatan transaksi.

Helper Rupiah: Gunakan fungsi format bawaan dari lib/utils.ts untuk menampilkan uang di UI (Contoh Output: Rp15.020.000).

Invalidasi Cache: Setiap kali sebuah transaksi atau kategori baru ditambahkan, diubah, atau dihapus, pastikan fungsi mutasi memanggil queryClient.invalidateQueries untuk me-refresh data TanStack Query secara real-time.

Desain Dulu Baru Koding (Design-First): Jangan mengarang atau memodifikasi komponen UI secara sepihak di luar batasan tokens warna dan struktur visual komponen yang sudah ditetapkan di Figma.

Keamanan Kunci API: Jangan pernah memasukkan .env atau kredensial mentah Supabase ke dalam repositori git.

9. Perintah Penting (Commands)
Bash
npx expo start              # Jalankan server development standar (Expo Go)
npx expo start --dev-client # Jalankan development dengan dukungan native modules (MMKV)
npx expo run:android        # Compile aplikasi dan jalankan di simulator/device Android
npx expo run:ios            # Compile aplikasi dan jalankan di simulator/device iOS
eas build --profile preview # Generate build paket APK untuk testing internal
eas update                  # Lakukan pengiriman hotfix minor secara langsung via Over-The-Air (OTA)
### 🔄 Detail Arsitektur: FAB (+) ➔ Add Transaction Flow

Alur ini menangani pembuatan data transaksi baru. Terdiri dari satu halaman utama penyeleksi (`app/(app)/add-transaction.tsx` atau berbentuk Fullscreen Modal Sheet) dan satu sub-modal input angka (`AddModal`).

#### 1. Layar Pemilihan Tipe & Kategori (Screen: Add)
* **Toggle Top Bar:** Komponen Tab khusus bergaya Neo-Brutalism untuk menyaring jenis transaksi.
  - Klik **Pengeluaran**: Chip aktif berubah menjadi warna merah (`#F44336`), teks putih bold. Grid di bawah otomatis memfilter kategori bertipe `'pengeluaran'`.
  - Klik **Pemasukan**: Chip aktif berubah menjadi warna hijau (`#4CAF50`), teks putih bold. Grid di bawah otomatis memfilter kategori bertipe `'pemasukan'`.
* **Grid Kategori:** Menampilkan daftar kategori dalam bentuk kotak bento/card persegi dengan border hitam tegas. Setiap card berisi ikon (`MaterialCommunityIcons`) dan nama kategori.
* **Tombol Atur:** Di pojok kiri bawah grid, terdapat tombol `"Atur"` dengan ikon gerigi untuk mengarahkan pengguna ke halaman `Settings Category`.
* **Aksi:** Ketika salah satu card kategori di-klik, aplikasi akan menyimpan data `category_id` dan `type` ke dalam temporary state, lalu membuka komponen `AddModal` (Overlay Lembar Angka).

#### 2. Layar Input Angka Custom (Component: AddModal)
Layar ini adalah overlay sheet yang muncul setelah kategori dipilih. Sesuai dengan mockup, komponen ini **DILARANG** memicu keyboard bawaan Android/iOS. Input angka murni dikendalikan oleh tombol kustom di layar.

* **Komponen Atas (Header & Catatan):** 
  - Menampilkan nama Kategori yang dipilih di kiri atas.
  - Tautan teks `"Tambahkan Catatan"` di kanan atas untuk memunculkan kolom input text opsional (`note`).
* **Display Nominal Utama:** Kotak putih besar ber-border tebal dengan teks nominal berukuran besar. Nilai di dalam display ini wajib terformat secara otomatis menggunakan fungsi `formatRupiah()` secara *real-time* saat tombol numpad ditekan.
* **Bar Konfirmasi Kontekstual:** Di bawah display angka, terdapat dua tombol pil:
  - Tombol **Kategori:** Menampilkan nama kategori saat ini (bisa diklik untuk kembali memilih kategori).
  - Tombol **Tanggal:** Berisi teks default `"Hari ini"` (jika diklik akan memunculkan native DatePicker Expo untuk mengubah tanggal transaksi).
* **Tata Letak Custom Numpad (Grid Layout):**
  - Baris 1: `[ 7 ]` `[ 8 ]` `[ 9 ]`
  - Baris 2: `[ 4 ]` `[ 5 ]` `[ 6 ]`
  - Baris 3: `[ 1 ]` `[ 2 ]` `[ 3 ]`
  - Baris 4: `[ 0 ]` `[ 00 ]` `[ 000 ]`
  - Di sebelah kanan/samping grid angka terdapat tombol aksi: Tombol **Hapus/Backspace** (berwarna merah/aksen kontras untuk menghapus satu digit terakhir) dan tombol kalkulasi penambah jika diperlukan.
* **Tombol Submit Utama ("Gaskeun"):** Tombol persegi panjang hijau/kuning penuh di bagian paling bawah modal untuk mengeksekusi mutasi simpan ke Supabase.

#### 3. Logika State & Validasi di Core Kodingan
* **State Awal:** `amount` dimulai dari angka `0`.
* **Logika Numpad:** 
  - Menekan angka `1-9` akan memasukkan string digit lalu mengubahnya kembali menjadi tipe data `number`.
  - Menekan `00` atau `000` akan mengalikan nilai `amount` saat ini dengan `100` atau `1000`.
  - Batasi panjang input maksimal (misal: 12 digit atau maksimal Rp999.999.999) agar tata letak teks tidak merusak batas kotak (*overflow*).
  - Menekan tombol Backspace akan menjalankan fungsi slice string: `Math.floor(amount / 10)`.
* **Fungsi Simpan (Submit Mutation):**
  - Pastikan nilai `amount > 0`. Jika masih `0`, tombol "Gaskeun" dalam posisi disabled.
  - Jalankan query insert ke tabel `transactions`.
  - Setelah sukses, panggil `queryClient.invalidateQueries(['transactions'])` untuk memperbarui total saldo di halaman utama, diagram lingkaran di halaman grafik, dan histori aktivitas.
  - Tutup modal dan kembalikan user ke halaman utama (`app/(app)/index.tsx`).

Terakhir Diperbarui: Juni 2026 — Tim Pengembang Duitgue v1