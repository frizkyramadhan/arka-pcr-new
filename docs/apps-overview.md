# ARKA MMS Apps Overview

Dokumen ini menjelaskan seluruh aplikasi/modul yang aktif di ARKA MMS berdasarkan implementasi saat ini pada `src/pages`, `src/pages/api`, dan navigasi aplikasi.

## Adaptasi di ARKA PCR

Overview ini sudah diadopsi ke ARKA PCR dengan compatibility routes untuk modul yang relevan, dengan pengecualian:

- maintenance plan
- maintenance actual
- maintenance type

Route alias yang disediakan di ARKA PCR:

- `/dashboards/maintenance` -> dashboard PCR utama
- `/apps/unit/list` -> `/equipments`
- `/apps/unit/view/[id]` -> `/equipments/[id]`
- `/apps/user/list` -> `/users`
- `/apps/user/view/[tab]` -> `/users`

Implementasi tambahan yang sudah tersedia di ARKA PCR:

- `GET/POST /api/roles`, `PUT/DELETE /api/roles/[id]`
- `GET/POST /api/permissions`, `PUT/DELETE /api/permissions/[id]`
- Halaman manajemen: `/roles` dan `/permissions`

RBAC di ARKA PCR sekarang mengikuti pola seperti Spatie Laravel Permission (sederhana):

- user memiliki banyak role (`user_role`)
- role memiliki banyak permission (`role_permission`)
- akses halaman sensitif dibatasi oleh permission:
  - `users.access`
  - `roles.access`
  - `permissions.access`
  - `units.access`

**Feature flag sementara**: set `ACL_ENABLED=false` dan `NEXT_PUBLIC_ACL_ENABLED=false` di `.env.local` untuk menonaktifkan pengecekan permission (middleware, API, CASL `AclGuard`). Login tetap via NextAuth. Aktifkan kembali dengan `true` saat RBAC siap dipakai.

## 1. Ringkasan Sistem

- **Nama sistem**: ARKA MMS (Maintenance Monitoring System)
- **Framework**: Next.js (Pages Router) + Vuexy admin template
- **Backend API**: Next.js API Routes (`src/pages/api`)
- **Database**: MySQL + Prisma
- **Fokus domain**: Monitoring maintenance fundamental alat berat (plan, actual, unit, user/role/permission, dashboard)

## 2. Aplikasi Frontend (Halaman)

### 2.1 Core & Auth Pages

| Route              | File                                 | Fungsi                                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------------ |
| `/`                | `src/pages/index.js`                 | Entry point, mengarahkan user ke home route utama aplikasi.  |
| `/login`           | `src/pages/login/index.js`           | Login pengguna (username/password), menghasilkan token auth. |
| `/register`        | `src/pages/register/index.js`        | Registrasi akun pengguna baru.                               |
| `/forgot-password` | `src/pages/forgot-password/index.js` | Halaman reset password (flow UI).                            |
| `/401`             | `src/pages/401.js`                   | Halaman unauthorized (akses ditolak).                        |
| `/404`             | `src/pages/404.js`                   | Halaman not found.                                           |
| `/500`             | `src/pages/500.js`                   | Halaman internal server error.                               |

### 2.2 Dashboard Apps

| Route                     | File                                        | Fungsi                                                              |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `/dashboards/maintenance` | `src/pages/dashboards/maintenance/index.js` | Dashboard maintenance utama: widget KPI + tabel/grafik achievement. |

Komponen dashboard maintenance berada di:

- `src/views/dashboards/maintenance/WidgetTotalUnits.js`
- `src/views/dashboards/maintenance/WidgetDueThisMonth.js`
- `src/views/dashboards/maintenance/WidgetCompliance.js`
- `src/views/dashboards/maintenance/WidgetOverdue.js`
- `src/views/dashboards/maintenance/AchievementTable.js`
- `src/views/dashboards/maintenance/AchievementChartsGrid.js`
- `src/views/dashboards/maintenance/AchievementByTypeChart.js`
- `src/views/dashboards/maintenance/AchievementAverageAllProgramCharts.js`
- `src/views/dashboards/maintenance/AchievementYTDDonutCharts.js`
- `src/views/dashboards/maintenance/MaintenanceDashboardTabs.js`

### 2.3 Business Apps (Menu "Apps")

| Route                                | File                                              | Fungsi                                                                    |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- |
| `/apps/maintenance-plan/list`        | `src/pages/apps/maintenance-plan/list/index.js`   | List, filter, create, update, delete maintenance plan + import data plan. |
| `/apps/maintenance-actual/list`      | `src/pages/apps/maintenance-actual/list/index.js` | List dan filter maintenance actual.                                       |
| `/apps/maintenance-actual/add`       | `src/pages/apps/maintenance-actual/add/index.js`  | Input maintenance actual baru.                                            |
| `/apps/maintenance-actual/edit/[id]` | `src/pages/apps/maintenance-actual/edit/[id].js`  | Edit data maintenance actual berdasarkan ID.                              |
| `/apps/maintenance-actual/view/[id]` | `src/pages/apps/maintenance-actual/view/[id].js`  | Detail maintenance actual, termasuk data relasi dan attachment.           |
| `/apps/maintenance-type/list`        | `src/pages/apps/maintenance-type/list/index.js`   | CRUD master maintenance type.                                             |
| `/apps/unit/list`                    | `src/pages/apps/unit/list/index.js`               | List unit + pencarian/filter.                                             |
| `/apps/unit/view/[id]`               | `src/pages/apps/unit/view/[id].js`                | Detail unit dan histori terkait.                                          |
| `/apps/user/list`                    | `src/pages/apps/user/list/index.js`               | CRUD user, filter role/status, manajemen akses user.                      |
| `/apps/user/view/[tab]`              | `src/pages/apps/user/view/[tab].js`               | Detail user berbasis tab (profil/akses).                                  |
| `/apps/roles`                        | `src/pages/apps/roles/index.js`                   | CRUD role.                                                                |
| `/apps/permissions`                  | `src/pages/apps/permissions/index.js`             | CRUD permission + mapping ke role.                                        |

## 3. Navigasi Aplikasi

Navigasi utama ARKA MMS hanya memuat modul maintenance dan admin access:

- `src/navigation/menuConfig.js` (sumber menu bersama)
- `src/navigation/vertical/index.js` / `src/navigation/horizontal/index.js` (re-export; horizontal tanpa section title)

Grup menu yang aktif (hanya modul PCR):

- **Dashboard** → PCR (Forecast, Actual), Cannibal (`/`)
- **Approval** → PCR Request (`/approvals`), Cannibal Request (`/cannibals-approvals`)
- **Units** → Units, Components, Hour Meters
- **Cannibals** (`/cannibals`)
- **Reports** → Replacements (Forecast, Actual), SOS, Inspection, Condition
- **Administration** → Users, Roles, Permissions

Menu menggunakan subject/action ACL (CASL) untuk kontrol visibilitas berbasis permission.

## 4. API Apps (Backend Endpoints)

Semua endpoint berada di `src/pages/api`.

### 4.1 Authentication API

| Endpoint               | Method | Fungsi                              |
| ---------------------- | ------ | ----------------------------------- |
| `/api/auth/login`            | `POST` | Login user dan generate token sesi. |
| `/api/auth/logout`           | `POST` | Logout dan clear cookie/token sesi. |
| `/api/auth/me`               | `GET`  | Ambil data user aktif + permission. |
| `/api/auth/register`         | `POST` | Registrasi user baru.               |
| `/api/auth/change-password`  | `POST` | Ganti password mandiri (butuh current password + sesi). |
| `/api/auth/debug-auth`       | `GET`  | Endpoint debugging status auth.     |

### 4.2 Dashboard API

| Endpoint                     | Method | Fungsi                                               |
| ---------------------------- | ------ | ---------------------------------------------------- |
| `/api/dashboard/stats`       | `GET`  | KPI dashboard: total unit, due, overdue, compliance. |
| `/api/dashboard/achievement` | `GET`  | Data achievement PLAN/ACTUAL/ACH per site/program.   |

### 4.3 Maintenance Plan API

| Endpoint                        | Method                   | Fungsi                               |
| ------------------------------- | ------------------------ | ------------------------------------ |
| `/api/maintenance-plans`        | `GET`, `POST`            | List plan dan buat plan baru.        |
| `/api/maintenance-plans/[id]`   | `GET`, `PATCH`, `DELETE` | Detail, update, hapus plan per ID.   |
| `/api/maintenance-plans/import` | `POST`                   | Import data maintenance plan (bulk). |

### 4.4 Maintenance Actual API

| Endpoint                        | Method                   | Fungsi                               |
| ------------------------------- | ------------------------ | ------------------------------------ |
| `/api/maintenance-actuals`      | `GET`, `POST`            | List actual dan input actual baru.   |
| `/api/maintenance-actuals/[id]` | `GET`, `PATCH`, `DELETE` | Detail, update, hapus actual per ID. |

### 4.5 Maintenance Type API

| Endpoint                      | Method                   | Fungsi                                  |
| ----------------------------- | ------------------------ | --------------------------------------- |
| `/api/maintenance-types`      | `GET`, `POST`            | List dan tambah maintenance type.       |
| `/api/maintenance-types/[id]` | `GET`, `PATCH`, `DELETE` | Detail, update, hapus maintenance type. |

### 4.6 Unit & Project API

| Endpoint          | Method | Fungsi                                             |
| ----------------- | ------ | -------------------------------------------------- |
| `/api/units`      | `GET`  | List unit dari cache database lokal.               |
| `/api/units/[id]` | `GET`  | Detail unit.                                       |
| `/api/units/sync` | `POST` | Sinkron unit dari API eksternal ke database lokal. |
| `/api/projects`   | `GET`  | List project untuk kebutuhan filter/form.          |

### 4.7 User, Role, Permission API

| Endpoint                | Method                   | Fungsi                                 |
| ----------------------- | ------------------------ | -------------------------------------- |
| `/api/users`            | `GET`, `POST`            | List user dan create user baru.        |
| `/api/users/[id]`       | `GET`, `PATCH`, `DELETE` | Detail, update, hapus user per ID.     |
| `/api/roles`            | `GET`, `POST`            | List role dan create role.             |
| `/api/roles/[id]`       | `GET`, `PATCH`, `DELETE` | Detail, update, hapus role.            |
| `/api/permissions`      | `GET`, `POST`            | List permission dan create permission. |
| `/api/permissions/[id]` | `GET`, `PATCH`, `DELETE` | Detail, update, hapus permission.      |

## 5. Detail Domain: Unit & Project

### 5.1 Tujuan Modul

Modul ini menjadi sumber data unit operasional yang dipakai oleh dashboard, maintenance plan, dan maintenance actual. Data unit tidak dibuat manual dari UI, tetapi disinkron dari sistem eksternal.

### 5.2 Struktur Data Utama

Secara implementasi, unit disimpan di tabel `units` (Prisma model), dengan atribut inti:

- `id`: ID unit dari sistem sumber (external)
- `code`: kode unit (contoh dari `unit_no`)
- `model`: tipe/model unit
- `projectId`: project aktif unit saat sinkron
- `projectName`: nama/kode project aktif
- `lastSyncAt`: waktu sinkron terakhir ke database lokal

`project` saat ini bersifat **snapshot dari data unit** (bukan master project dengan relasi FK kuat ke entity maintenance).

### 5.3 Alur Data Unit

1. Client memanggil `POST /api/units/sync`.
2. API mengambil data equipment dari endpoint eksternal.
3. Sistem melakukan upsert ke tabel `units` berdasarkan `id` unit.
4. Data `projectId`/`projectName` ikut diperbarui sesuai sumber.
5. User mengakses `GET /api/units` untuk list dan filter di aplikasi.

### 5.4 Perilaku Endpoint

- **`GET /api/units`**
  - Mengembalikan daftar unit dari DB lokal.
  - Mendukung parameter query untuk pencarian (`q`) dan filter project (`project`) sesuai kebutuhan list page.
- **`GET /api/units/[id]`**
  - Mengembalikan detail satu unit berdasarkan ID.
  - Digunakan oleh halaman detail unit.
- **`POST /api/units/sync`**
  - Trigger sinkronisasi on-demand.
  - Umumnya mengembalikan ringkasan hasil seperti total tersinkron, created, dan updated.
- **`GET /api/projects`**
  - Menyediakan daftar project untuk dropdown/filter.
  - Berfungsi sebagai source filter, bukan ownership table penuh.

### 5.5 UI yang Terkait

- `src/pages/apps/unit/list/index.js`: list unit + search/filter project.
- `src/pages/apps/unit/view/[id].js`: detail unit (konteks maintenance/riwayat).
- `src/pages/apps/maintenance-plan/list/index.js`: memilih konteks project saat planing.
- `src/pages/dashboards/maintenance/index.js`: agregasi KPI berdasarkan data unit.

### 5.6 Catatan Desain

- Source of truth unit ada di sistem eksternal, ARKA MMS menyimpan cache operasional.
- Perubahan project unit mengikuti hasil sync terbaru.
- Untuk histori maintenance, aplikasi tetap menyimpan `projectSnapshot` pada data transaksi agar histori lama tidak berubah saat unit pindah project.

## 6. Detail Domain: User

### 6.1 Tujuan Modul

Mengelola akun aplikasi dan kontrol akses operasional (siapa yang bisa login, siapa yang bisa melakukan aksi tertentu, dan scope project user).

### 6.2 Struktur Data Utama

Atribut penting user:

- `username` (unik, dipakai login)
- `name`
- `email` (opsional)
- `passwordHash` (bcrypt hash)
- `role` (legacy role field, tetap dipakai pada beberapa guard)
- `projectScope` (konteks site/user)
- `isActive` (status akun aktif/nonaktif)

Sisi relasi:

- `user_roles`: menghubungkan user ke role (mendukung model role-permission lebih fleksibel).

### 6.3 Perilaku Endpoint

- **`GET /api/users`**
  - Mengembalikan list user untuk tabel manajemen user.
  - Umumnya dipakai bersama filter role/status dari sisi UI.
- **`POST /api/users`**
  - Membuat user baru.
  - Melakukan validasi field wajib dan hash password sebelum simpan.
- **`GET /api/users/[id]`**
  - Detail user untuk form edit/view.
- **`PATCH /api/users/[id]`**
  - Update profil user, role/scope/status, dan opsional password.
- **`DELETE /api/users/[id]`**
  - Hapus user dari sistem (sesuai rule endpoint).

### 6.4 UI yang Terkait

- `src/pages/apps/user/list/index.js`: halaman utama manajemen user.
- `src/pages/apps/user/view/[tab].js`: detail user per tab.
- Komponen drawer/add-edit user berada di area `src/views/apps/user/`.

### 6.5 Aturan Akses

- Halaman user dan API user diproteksi ketat untuk role/permission tertentu (umumnya ADMIN_HO).
- Menu users hanya tampil jika ability user memenuhi subject/action ACL terkait.

## 7. Detail Domain: Role

### 7.1 Tujuan Modul

Role adalah pengelompokan akses tingkat tinggi (mis. ADMIN_HO, ADMIN_SITE, MECHANIC) agar manajemen izin tidak dilakukan per user satu per satu.

### 7.2 Struktur Data & Relasi

- `roles`: daftar role.
- `role_permissions`: tabel pivot role ke permission.
- `user_roles`: tabel pivot user ke role.

Model ini memungkinkan:

- satu role punya banyak permission,
- satu user bisa punya satu atau lebih role.

### 7.3 Perilaku Endpoint

- **`GET /api/roles`**: list role + metadata untuk tabel role.
- **`POST /api/roles`**: membuat role baru.
- **`GET /api/roles/[id]`**: detail role termasuk relasi permission (tergantung implementasi response).
- **`PATCH /api/roles/[id]`**: update nama role dan/atau mapping izin.
- **`DELETE /api/roles/[id]`**: hapus role dengan validasi relasi yang masih dipakai.

### 7.4 UI yang Terkait

- `src/pages/apps/roles/index.js`: manajemen role (list/add/edit/delete).
- Biasanya terintegrasi dengan pemilihan permission dan assignment ke user.

## 8. Detail Domain: Permission

### 8.1 Tujuan Modul

Permission adalah izin granular berbasis aksi-resource (contoh: `user.read`, `user.create`, `maintenance-plan.read`) yang dipakai ACL menu, halaman, dan API.

### 8.2 Struktur Data & Pola Penamaan

- `permissions`: daftar permission.
- Nama permission mengikuti pola yang konsisten per domain (resource.action).
- Mapping ke role dilakukan lewat `role_permissions`.

### 8.3 Perilaku Endpoint

- **`GET /api/permissions`**: list permission untuk kebutuhan admin.
- **`POST /api/permissions`**: tambah permission baru.
- **`GET /api/permissions/[id]`**: detail permission.
- **`PATCH /api/permissions/[id]`**: update nama/atribut permission.
- **`DELETE /api/permissions/[id]`**: hapus permission yang tidak lagi dipakai.

### 8.4 Integrasi ke ACL dan Auth

- Login dan endpoint `GET /api/auth/me` mengembalikan permission efektif user.
- `src/configs/acl.js` dan komponen guard (`AclGuard`, `Can`) memakai permission tersebut untuk:
  - visibilitas menu,
  - akses halaman,
  - kontrol aksi UI (tombol add/edit/delete).
- API sensitif dapat melakukan validasi permission server-side agar tidak hanya mengandalkan guard di frontend.

### 4.8 Attachment API

| Endpoint                         | Method          | Fungsi                                                     |
| -------------------------------- | --------------- | ---------------------------------------------------------- |
| `/api/attachments`               | `GET`, `POST`   | List attachment per entity dan create metadata attachment. |
| `/api/attachments/[id]`          | `GET`, `DELETE` | Detail attachment dan hapus attachment.                    |
| `/api/attachments/[id]/download` | `GET`           | Download file attachment.                                  |
| `/api/attachments/upload`        | `POST`          | Upload file non-chunked.                                   |
| `/api/attachments/upload-start`  | `POST`          | Inisialisasi upload chunked.                               |
| `/api/attachments/upload-chunk`  | `POST`          | Upload potongan file (chunk).                              |

## 9. Modul Pendukung (Non-Route)

Modul penting yang mendukung seluruh apps:

- `src/middleware.js`  
  Proteksi route berbasis token/cookie + role check.

- `src/context/AuthContext.js`  
  Manajemen state autentikasi di sisi client.

- `src/configs/acl.js`  
  Definisi ability ACL (CASL) untuk halaman/menu/action.

- `src/lib/prisma.js`  
  Prisma client singleton untuk akses database.

- `prisma/schema.prisma`  
  Definisi model data ARKA MMS.

## 10. Cakupan Aplikasi Saat Ini

Secara implementasi aktif, ARKA MMS saat ini sudah mencakup:

1. **Auth & Access Control** (login/logout, ACL role-permission)
2. **Master Data** (maintenance types, units, users, roles, permissions)
3. **Transaksi Maintenance** (plan dan actual, termasuk detail/edit/view)
4. **Dashboard Monitoring** (KPI dan achievement)
5. **Attachment Management** (upload/list/download/delete)

## 11. Referensi Dokumentasi

- Domain & desain: `docs/maintenance-monitoring-system.md`
- Arsitektur teknis: `docs/architecture.md`
- Progress pekerjaan: `docs/todo.md`
- Ide pengembangan: `docs/backlog.md`
- Keputusan teknis: `docs/decisions.md`
