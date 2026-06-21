<div align="center">
  <h1>DuitGue</h1>
  <p>Aplikasi pencatatan keuangan personal <strong>#seIndonesia-lo</strong> dengan gaya visual Neo-Brutalism.</p>
  <p>
    <strong>React Native</strong> · <strong>Expo SDK 56</strong> · <strong>Supabase</strong> · <strong>NativeWind</strong>
  </p>
</div>

## 📱 Tentang DuitGue

DuitGue adalah aplikasi mobile pencatatan keuangan personal berbahasa Indonesia. Dibangun untuk membantu individu mencatat pengeluaran dan pemasukan harian dengan mudah, cepat, dan tanpa hambatan — dengan tampilan Neo-Brutalism yang tegas, kontras, dan berkarakter.

### ✨ Fitur Utama

- **Pencatatan Transaksi** — Catat pengeluaran & pemasukan pakai custom numpad keypad.
- **Kategori Kustom** — Bebas edit nama, pilih warna solid, dan ikon dari MaterialCommunityIcons.
- **Grafik Analitik** — Donut chart interaktif plus detail bar progress per kategori.
- **Laporan Ringkasan** — Tabel rekam jejak keuangan bulanan (Bulan | Pengeluaran | Pemasukan | Saldo).
- **Auth System** — SignUp instan, Login, Forgot Password, dan Reset Password universal.
- **Profil & Keamanan (Gue)** — Ganti Email, Hapus Akun, Export Data, Hapus Cache.
- **Bottom Navigation** — Rumah · Grafik · Laporan · Gue

## 🧱 Tech Stack

| Layer             | Teknologi                              |
| :---------------- | :------------------------------------- |
| **Framework**     | React Native (Expo SDK 56)             |
| **Router**        | Expo Router v3 (file-based)            |
| **Backend & DB**  | Supabase (PostgreSQL + Auth + Storage) |
| **Server State**  | TanStack Query v5                      |
| **Local State**   | Zustand                                |
| **Local Storage** | MMKV (`react-native-mmkv`)             |
| **Styling**       | NativeWind v4 (Tailwind CSS)           |
| **Form Handling** | React Hook Form + Zod                  |
| **Charts**        | Victory Native XL                      |
| **Icons**         | MaterialCommunityIcons                 |
| **Notifikasi**    | Expo Notifications                     |
| **OTA Update**    | EAS Update                             |

## 📁 Struktur Folder

```
duitgue/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/             # Halaman sebelum login
│   ├── (app)/              # Halaman utama (Bottom Tab)
│   └── _layout.tsx         # Root layout (session handler)
├── components/
│   ├── ui/                 # Button, Input, Card — Neo-Brutalism
│   ├── transaction/        # TransactionItem, AddModal, Numpad
│   ├── category/           # CategoryPicker, CategorySettingsItem
│   └── charts/             # CustomDonutChart, CategoryProgressBar
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── mmkv.ts             # MMKV storage instance
│   └── utils.ts            # Helper (formatRupiah, dll)
```

## 🎨 Design System

| Warna             | Kode      | Penggunaan                          |
| :---------------- | :-------- | :---------------------------------- |
| Kuning (Primary)  | `#F5C518` | Tombol utama, kartu saldo, FAB      |
| Hijau (Sukses)    | `#4CAF50` | Pemasukan, Toast Sukses             |
| Merah (Hapus)     | `#F44336` | Pengeluaran, tombol destruktif      |
| Teal (Google)     | `#00BCD4` | Tombol OAuth Google                 |
| Hitam (Border)    | `#1A1A1A` | Border, teks, tab bar               |
| Abu Muda (BG)     | `#F5F5F5` | Latar belakang screen               |
| Putih (Card)      | `#FFFFFF` | Latar komponen                      |

Neo-Brutalism rules: border hitam tebal (`border-2 border-[#1A1A1A]`), hard shadow solid (`shadow-[4px_4px_0px_0px_#1A1A1A]`), dan pressed state tanpa shadow.

## 🚀 Cara Mulai

```bash
# 1. Clone repo
git clone https://github.com/username/duitgue.git
cd duitgue

# 2. Install dependencies
npm install

# 3. Copy & isi environment variables
cp .env.example .env.local

# 4. Jalankan aplikasi
npx expo start              # Expo Go
npx expo start --dev-client # Native modules (MMKV)
```

## 📟 Perintah Penting

| Perintah                           | Keterangan                                    |
| :--------------------------------- | :-------------------------------------------- |
| `npx expo start`                   | Development server (Expo Go)                  |
| `npx expo start --dev-client`      | Development dengan native modules             |
| `npx expo run:android`             | Build & jalanin di Android simulator/device   |
| `npx expo run:ios`                 | Build & jalanin di iOS simulator              |
| `eas build --profile preview`      | Build APK internal testing                    |
| `eas update`                       | Hotfix OTA langsung ke production             |

## ⚠️ Catatan Penting

- **Expo Go SDK 56** tidak mendukung modul native eksternal (MMKV). Gunakan **Expo Dev Client** untuk development lokal.
- **Rupiah disimpan sebagai integer** (bigint), bukan float — untuk mencegah bug pembulatan.
- **RLS (Row Level Security)** wajib aktif di semua tabel Supabase.
- Jangan commit file `.env` atau kredensial mentah Supabase ke git.

## 📄 Lisensi

[MIT](LICENSE)
