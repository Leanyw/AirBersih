<h1>💧 AirBersih</h1>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=black)
![NPM](https://img.shields.io/badge/Package%20Manager-npm-CB3837?logo=npm)
![Platform](https://img.shields.io/badge/Platform-Web-4285F4?logo=googlechrome\&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)

**AirBersih** adalah aplikasi web berbasis **Next.js** untuk pelaporan kondisi air oleh warga dan penanganan laporan oleh puskesmas.
Aplikasi ini mendukung **multi-role (Warga, Puskesmas, Admin)** dengan alur pelaporan, monitoring status, dan pengelolaan data terpusat.

🔗 **Live App**: [https://air-bersih.vercel.app/](https://air-bersih.vercel.app/)

---

## ✨ Fitur Utama

### 👤 Warga

* Registrasi & login akun warga
* Melaporkan kondisi air (upload foto, bau, rasa)
* Melihat status laporan (pending / diproses / selesai)
* Melihat informasi sumber air aman
* Akses edukasi sederhana terkait kualitas air
* Dukungan penggunaan **offline (PWA-ready)**

### 🏥 Puskesmas

* Login petugas puskesmas
* Melihat laporan warga sesuai wilayah
* Mengubah status laporan
* Memberikan feedback ke warga
* Menambahkan data sumber air aman
* Monitoring laporan per periode

### 🛡️ Admin (Superadmin)

* Login admin khusus
* Monitoring seluruh laporan lintas wilayah
* Mengelola akun puskesmas
* Melihat statistik dan rekap laporan

---

## 🔐 Akun Demo

Gunakan akun berikut untuk mencoba aplikasi:

### Warga

```
Email    : warga@example.com
Password : warga123
```

### Puskesmas

```
Email    : puskesmas.semarangbarat@example.com
Password : smgbarat123
```

### Admin

```
Email    : admin@example.com
Password : admin123
```

🔑 **Login Admin Khusus**
Admin dapat mengakses halaman login khusus melalui:

```
https://air-bersih.vercel.app/admin-login
```

⚠️ *Syarat: sudah login sebagai warga terlebih dahulu.*

---

## 🧱 Tech Stack

* **Framework**: Next.js 15 (App Router)
* **Language**: TypeScript
* **UI**: Tailwind CSS
* **Auth**: Email & Password (Role-based Access)
* **State & Data**: Context / Hooks
* **Deployment**: Vercel
* **Package Manager**: npm

---

## 🗂️ Struktur Project
```
air-bersih/
├── public/                 # Asset statis (logo, icon, svg)
│
├── middleware/             # Middleware auth & proteksi route
│   └── auth.ts
│
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Login & register
│   │   ├── (warga)/        # Halaman warga
│   │   ├── (puskesmas)/    # Halaman puskesmas
│   │   ├── admin/          # Dashboard admin
│   │   │   ├── data-warga/
│   │   │   ├── data-puskesmas/
│   │   │   ├── laporan-warga/
│   │   │   ├── sumber-air/
│   │   │   └── analisis-lab/
│   │   │
│   │   ├── api/            # API Routes (App Router)
│   │   │   ├── auth/       # Auth & callback
│   │   │   ├── reports/    # CRUD laporan air
│   │   │   ├── puskesmas/  # Data puskesmas
│   │   │   └── kecamatan/  # Data wilayah
│   │   │
│   │   ├── layout.tsx      # Layout global
│   │   └── page.tsx        # Landing page
│   │
│   ├── components/         # Reusable UI components
│   │   ├── admin/          # Komponen admin
│   │   ├── puskesmas/      # Komponen puskesmas
│   │   ├── map/            # Komponen peta & marker
│   │   └── health/         # Edukasi & info kesehatan
│   │
│   ├── lib/                # Konfigurasi & helper
│   │   ├── supabase.ts     # Supabase client
│   │   ├── supabase-server.ts
│   │   ├── validations/    # Validasi data
│   │   └── api/            # API helpers
│   │
│   ├── providers/          # Global provider
│   │   └── AuthProvider.tsx
│   │
│   ├── services/           # Business logic layer
│   │   ├── reportService.ts
│   │   └── area-safety.ts
│   │
│   ├── types/              # TypeScript types
│   └── utils/              # Utility & helper kecil
│
├── init-storage.sql        # Inisialisasi storage / database
├── middleware.ts           # Next.js middleware entry
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── README.md
📌 Penjelasan Singkat
```
(warga) / (puskesmas) → route group berbasis role

admin/ → dashboard superadmin

app/api/ → backend API (Next.js Route Handlers)

components/ → UI modular per role & fitur

services/ → logic aplikasi (tidak bercampur UI)

lib/ → Supabase, validasi, helper teknis

providers/ → global state (auth & session)

---

## ⚙️ Instalasi & Setup

### Prasyarat

* Node.js ≥ 18
* npm

### Clone Repository

```bash
git clone https://github.com/Leanyw/AirBersih.git
cd AirBersih
```

### Install Dependencies

```bash
npm install
```

### Menjalankan Aplikasi (Development)

```bash
npm run dev
```

Akses aplikasi di:

```
http://localhost:3000
```

---

## 🧠 Arsitektur & Best Practices

* **Role-Based Access Control** (Warga, Puskesmas, Admin)
* Pemisahan **UI – Logic – Data**
* Feature-based folder structure
* Reusable components
* Type-safe dengan TypeScript

---

## 📝 Commit Convention

Commit dibuat **bertahap dan deskriptif** untuk memudahkan tracking.

Contoh:

```
feat: add laporan air form with image upload
feat: implement role based dashboard
fix: protect admin route access
refactor: simplify auth context logic
```

---

## 📌 Catatan

Project ini dikembangkan sebagai:

* Aplikasi pelaporan kualitas air berbasis web
* Implementasi multi-role dalam Next.js
* Studi kasus sistem informasi kesehatan lingkungan

---

💧 **AirBersih — Lapor Air, Lindungi Kesehatan**
