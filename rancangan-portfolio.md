# Rancangan Website Portfolio

> Dokumen rancangan desain + sistem untuk portfolio pribadi yang berisi **project Web**, **project UI/UX**, **project Data Analyst**, **sertifikat**, dan **prestasi**.
> Konten dikelola lewat **backend sendiri + PostgreSQL** yang berjalan di **VPS pribadi**.

---

## Daftar Isi

1. [Tujuan & Prinsip](#1-tujuan--prinsip)
2. [Referensi & Keputusan Desain](#2-referensi--keputusan-desain)
3. [Design System](#3-design-system)
4. [Sitemap & Routing](#4-sitemap--routing)
5. [Rancangan Halaman](#5-rancangan-halaman)
6. [Komponen Reusable](#6-komponen-reusable)
7. [Arsitektur Sistem](#7-arsitektur-sistem)
8. [Tech Stack](#8-tech-stack)
9. [Skema Database (PostgreSQL)](#9-skema-database-postgresql)
10. [Rancangan API](#10-rancangan-api)
11. [Admin Panel (CMS sendiri)](#11-admin-panel-cms-sendiri)
12. [Media & Upload](#12-media--upload)
13. [Keamanan](#13-keamanan)
14. [SEO, Performa & Aksesibilitas](#14-seo-performa--aksesibilitas)
15. [Deployment di VPS](#15-deployment-di-vps)
16. [Struktur Folder](#16-struktur-folder)
17. [Roadmap Pengerjaan](#17-roadmap-pengerjaan)
18. [Asumsi & Hal yang Perlu Diputuskan](#18-asumsi--hal-yang-perlu-diputuskan)

---

## 1. Tujuan & Prinsip

**Tujuan utama:** recruiter atau klien bisa memahami *siapa saya, apa yang bisa saya kerjakan, dan buktinya* dalam waktu kurang dari 30 detik, lalu bisa menggali detail lewat case study.

**Prinsip desain**

| Prinsip | Penerapan |
|---|---|
| **Konten di depan** | Project dan dampaknya tampil langsung, tidak tersembunyi di balik interaksi (berbeda dengan konsep "OS" ala macOS). |
| **Case study, bukan galeri** | Setiap project punya cerita: masalah → proses → hasil → dampak (angka). |
| **Satu sistem, tiga jenis project** | Web, UI/UX, dan Data memakai kartu yang sama, tetapi halaman detailnya punya template sesuai jenisnya. |
| **Monokrom hangat** | Warna off-white dan off-black, tanpa putih murni `#FFFFFF` atau hitam murni `#000000`. |
| **Gerak secukupnya** | Animasi untuk memberi arah (reveal, transisi halaman), bukan dekorasi. Menghormati `prefers-reduced-motion`. |
| **Mudah di-update** | Semua konten berasal dari database dan dikelola lewat admin panel, tanpa edit kode. |

---

## 2. Referensi & Keputusan Desain

| Referensi | Yang diambil | Yang tidak diambil |
|---|---|---|
| **Video 1: portfolio "Iqmal"** (editorial monokrom) — **dasar utama** | Hero dengan tipografi besar + aksen serif italic; selang-seling section terang/gelap; kartu Experience horizontal; halaman case study dengan "Contribution & Impact" + angka besar; halaman *All projects*; menu fullscreen; CTA penutup "Let's work together". | — |
| **Video 2: portfolio "RyHar"** (template putih) | Badge kecil di hero (mis. "3+ Years Experience"); grid ikon tech stack; form kontak langsung. | Tampilan generik template. Chatbot AI dijadikan **fitur opsional fase 2**. |
| **Screenshot Kak Alvin** (macOS "Portfolio OS") | Ide terminal interaktif sebagai **easter egg opsional** (mis. di halaman 404 atau tombol tersembunyi). | Konsep desktop/jendela sebagai navigasi utama karena kurang ramah recruiter dan mobile. |

---

## 3. Design System

Semua nilai di bawah disimpan sebagai **design token** (CSS variables + `tailwind.config`), sehingga mudah diubah.

### 3.1 Warna

Palet monokrom yang sedikit hangat. Putih dan hitam tidak dipakai murni agar tidak silau dan terasa lebih "premium".

**Section terang (default)**

| Token | Hex | Kegunaan |
|---|---|---|
| `--bg` | `#F4F3EF` | Latar halaman (off-white hangat) |
| `--surface` | `#FAF9F6` | Kartu, panel, input |
| `--surface-2` | `#ECEAE4` | Hover kartu, latar chip, skeleton |
| `--border` | `#DDDBD4` | Garis pemisah, border kartu |
| `--text` | `#1C1C1A` | Teks utama (off-black) |
| `--text-muted` | `#5F5E59` | Teks sekunder, deskripsi |
| `--text-subtle` | `#8C8A84` | Label kecil, metadata, placeholder |

**Section gelap (Statement, Experience, CTA, Footer, Menu)**

| Token | Hex | Kegunaan |
|---|---|---|
| `--bg-inverse` | `#1A1A18` | Latar section gelap |
| `--surface-inverse` | `#242422` | Kartu di section gelap |
| `--border-inverse` | `#33332F` | Garis di section gelap |
| `--text-inverse` | `#EDECE8` | Teks utama di section gelap |
| `--text-inverse-muted` | `#A3A29C` | Teks sekunder di section gelap |

**Warna fungsional** (dipakai sangat hemat, hanya untuk status)

| Token | Hex | Kegunaan |
|---|---|---|
| `--accent` | `#1C1C1A` | Tombol primer = off-black (tetap monokrom) |
| `--success` | `#3F7D58` | Status "terkirim", badge "Verified" sertifikat |
| `--danger` | `#B5483B` | Error form |
| `--focus` | `#4A6FA5` | Ring fokus keyboard (aksesibilitas) |

**Penanda kategori project** (chip kecil, nuansa abu hangat, tetap kalem)

| Kategori | Latar chip | Teks chip |
|---|---|---|
| Web | `#E4E6E1` | `#3B4A3F` |
| UI/UX | `#E8E3E8` | `#4D3F4D` |
| Data | `#E2E5EA` | `#3A4552` |

> Kontras teks: `--text` di atas `--bg` ≈ 15:1 dan `--text-muted` di atas `--bg` ≈ 6:1, keduanya lolos WCAG AA.

```css
:root {
  --bg: #F4F3EF;  --surface: #FAF9F6;  --surface-2: #ECEAE4;  --border: #DDDBD4;
  --text: #1C1C1A; --text-muted: #5F5E59; --text-subtle: #8C8A84;
  --bg-inverse: #1A1A18; --surface-inverse: #242422; --border-inverse: #33332F;
  --text-inverse: #EDECE8; --text-inverse-muted: #A3A29C;
  --success: #3F7D58; --danger: #B5483B; --focus: #4A6FA5;
}
```

### 3.2 Tipografi

| Peran | Font | Catatan |
|---|---|---|
| Display & body | **Inter Tight** (atau Geist) | Grotesk bersih, mirip referensi |
| Aksen | **Instrument Serif** *italic* | Hanya untuk kata kunci, mis. "Hi, I'm *Nama.*" |
| Mono / label | **JetBrains Mono** | Label kecil uppercase, metadata, easter egg terminal |

**Skala (desktop → mobile)**

| Token | Desktop | Mobile | Weight | Pemakaian |
|---|---|---|---|---|
| `display-xl` | 96px / 0.95 | 52px | 500 | Nama di hero, "Let's work together" |
| `display-ghost` | 160px / 1 | 72px | 600 | Teks raksasa transparan di latar section ("EXPERIENCES") |
| `h1` | 56px / 1.05 | 36px | 500 | Judul halaman, judul case study |
| `h2` | 36px / 1.15 | 28px | 500 | Judul section |
| `h3` | 22px / 1.3 | 20px | 600 | Judul kartu |
| `body-lg` | 20px / 1.6 | 18px | 400 | Statement, intro case study |
| `body` | 16px / 1.65 | 16px | 400 | Teks umum |
| `small` | 14px / 1.5 | 14px | 400 | Deskripsi kartu |
| `label` | 12px / 1.4, uppercase, tracking 0.08em | 12px | 500 (mono) | Label section, metadata |

### 3.3 Spacing, Radius, Shadow

- **Spacing** (kelipatan 4): `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`
- **Padding section:** 128px desktop, 96px tablet, 64px mobile
- **Container:** max 1280px, gutter 24px (desktop) / 16px (mobile)
- **Radius:** `sm 8px` (chip, input) · `md 14px` (tombol) · `lg 20px` (kartu) · `xl 28px` (kartu besar/hero image) · `full` (pill)
- **Shadow:** hampir tidak ada; kedalaman dari perbedaan warna surface.
  - `shadow-card-hover: 0 8px 24px rgba(28,28,26,0.06)`

### 3.4 Motion

| Elemen | Animasi | Durasi / easing |
|---|---|---|
| Reveal saat scroll | fade + translateY 24px → 0 | 600ms, `cubic-bezier(0.22,1,0.36,1)` |
| Teks hero | per kata muncul berurutan (stagger 60ms) | 700ms |
| Peran di hero | efek ketik + kursor berkedip ("Full-Stack Web█") | ketik 50ms/huruf |
| Experience | scroll horizontal mengikuti scroll vertikal (sticky) | — |
| Kartu project | hover: gambar zoom 1.03, kartu naik 4px | 300ms |
| Menu fullscreen | panel gelap slide dari kanan, link stagger | 500ms |
| Transisi halaman | fade 200ms | — |

Semua animasi dimatikan atau disederhanakan saat `prefers-reduced-motion: reduce`.

### 3.5 Ikon & Gambar

- Ikon: **Lucide** (stroke 1.5px).
- Foto profil dan foto experience: grayscale ringan (`filter: grayscale(100%)`), berubah berwarna saat hover agar sesuai tema monokrom.
- Screenshot project tampil dalam **bingkai browser/device** sederhana berwarna `--surface-2`.

### 3.6 Breakpoint

| Nama | Lebar |
|---|---|
| mobile | ≥ 360px |
| tablet | ≥ 768px |
| desktop | ≥ 1280px |

---

## 4. Sitemap & Routing

```
/                       Home (one-page dengan anchor section)
/projects               Semua project + filter kategori
/projects/[slug]        Detail case study
/certificates           Semua sertifikat + prestasi
/cv                     Redirect ke file CV terbaru (PDF)
/admin                  Login admin
/admin/*                Dashboard CMS (lihat bagian 11)
/404                    Halaman tidak ditemukan (+ easter egg terminal, opsional)
```

**Navbar:** Logo/nama · Home · About · Experience · Projects · Certificates · Contact · tombol **Menu** (membuka menu fullscreen gelap, seperti referensi 1).

---

## 5. Rancangan Halaman

### 5.1 Home `/`

Urutan section mengikuti ritme **terang → gelap → terang → gelap** seperti referensi 1.

```
┌───────────────────────────────────────────────────────────┐
│ [logo]                                       [Menu ☰]     │  ← navbar transparan, sticky
├───────────────────────────────────────────────────────────┤
│ LABEL MONO: WEB DEV · UI/UX · DATA                        │
│                                                           │
│ Hi, I'm *Nama.*                       ┌──────────────┐    │  ① HERO (terang)
│ Full-Stack Web Developer█             │  foto (bw)   │    │
│                                       │  kartu nama  │    │
│ [Lihat Project →] [Download CV ↓]     └──────────────┘    │
│ ○ 3+ project web  ○ 5 case UI/UX  ○ 4 analisis data       │  ← badge statistik (dari DB)
├───────────────────────────────────────────────────────────┤
│        I build web systems, design clear interfaces,      │  ② STATEMENT (gelap)
│        and turn data into **decisions**.                  │     teks besar, kata kunci bold
│   [GitHub] [LinkedIn] [Dribbble/Behance] [Email]          │
├───────────────────────────────────────────────────────────┤
│ EXPERIENCES (teks ghost raksasa di latar)                 │  ③ EXPERIENCE (gelap)
│ ┌─────────────┬──────┐ ┌─────────────┬──────┐ →          │     kartu horizontal, foto + teks
│ │ ROLE        │ foto │ │ ROLE        │ foto │            │     scroll horizontal (sticky)
│ │ Perusahaan  │      │ │ Perusahaan  │      │            │
│ │ highlight   │      │ │ highlight   │      │            │
│ └─────────────┴──────┘ └─────────────┴──────┘            │
├───────────────────────────────────────────────────────────┤
│ SELECTED PROJECTS                      [View all →]       │  ④ PROJECTS (terang)
│ [ All ] [ Web ] [ UI/UX ] [ Data ]     ← tab filter       │
│ ┌──────────────────────┐ ┌──────────────────────┐         │
│ │  thumbnail besar     │ │  thumbnail besar     │         │
│ │ chip kategori · tahun│ │ chip kategori · tahun│         │
│ │ Judul project        │ │ Judul project        │         │
│ │ 1 kalimat dampak     │ │ 1 kalimat dampak     │         │
│ └──────────────────────┘ └──────────────────────┘         │
├───────────────────────────────────────────────────────────┤
│ SKILLS & TOOLS                                            │  ⑤ SKILLS (terang)
│ Web: React · Next.js · Node · PostgreSQL ...              │     dikelompokkan per kategori
│ UI/UX: Figma · Prototyping · User Research ...            │
│ Data: Python · SQL · Excel · Tableau/Power BI ...         │
├───────────────────────────────────────────────────────────┤
│ CERTIFICATES & ACHIEVEMENTS            [Lihat semua →]    │  ⑥ KREDENSIAL (terang)
│ ┌────┐┌────┐┌────┐┌────┐   │  🏆 Juara 1 ... 2025         │     kiri: grid sertifikat unggulan
│ │logo││logo││logo││logo│   │  🏆 Finalis ... 2024         │     kanan: timeline prestasi
│ └────┘└────┘└────┘└────┘   │                              │
├───────────────────────────────────────────────────────────┤
│          LET'S WORK                                       │  ⑦ CONTACT CTA (gelap)
│          TOGETHER.                                        │     + form kontak ringkas
│   email@domain.com ↗     [Nama][Email][Pesan][Kirim]      │
├───────────────────────────────────────────────────────────┤
│ © 2026 Nama · Lokasi · waktu lokal · sosial              │  ⑧ FOOTER (gelap)
└───────────────────────────────────────────────────────────┘
```

**Catatan responsif**
- Mobile: foto hero pindah ke atas nama; tab filter dapat di-scroll horizontal; Experience menjadi kartu vertikal biasa (tanpa sticky horizontal scroll); grid project 1 kolom.
- Tablet: grid project 2 kolom; Experience tetap horizontal dengan swipe.

### 5.2 All Projects `/projects`

```
All projects.                      (h1 besar, teks ghost "WORK" di belakang)
Deskripsi singkat 1–2 kalimat.

[ All (12) ] [ Web (5) ] [ UI/UX (4) ] [ Data (3) ]    [Urutkan: Terbaru ▾]

┌────────────┐ ┌────────────┐ ┌────────────┐
│ kartu      │ │ kartu      │ │ kartu      │     grid 3 / 2 / 1 kolom
└────────────┘ └────────────┘ └────────────┘

┌──────────────────────────────────────────┐
│ Let's build something useful.  [Contact] │     banner CTA gelap
└──────────────────────────────────────────┘
```

- Filter disimpan di query string (`/projects?category=data`) agar bisa dibagikan.
- Jumlah per kategori dihitung dari database.

### 5.3 Detail Case Study `/projects/[slug]`

Struktur dasar sama untuk semua kategori, lalu **blok konten** menyesuaikan jenis project.

```
← Kembali ke projects                         chip kategori · tahun

Judul Project                                 │ Role: ...
Ringkasan 2–3 kalimat                         │ Timeline: ...
[Live demo ↗] [GitHub ↗] [Figma ↗]            │ Tim: ...
                                              │ Tools: chip chip chip
┌─────────────────────────────────────────────┐
│          gambar cover besar (bingkai)        │
└─────────────────────────────────────────────┘

Contribution & impact
┌───────────────────────┐  ┌──────────────────────────┐
│ Kontribusi saya (list)│  │ PANEL GELAP: kalimat     │
│                       │  │ dampak + angka besar     │
│                       │  │  300    15     40%       │
└───────────────────────┘  └──────────────────────────┘

[ Blok konten dinamis sesuai template kategori ]

Next project →  (kartu project berikutnya)
```

**Template blok per kategori** (urutan default, bisa diubah di admin):

| Web | UI/UX | Data Analyst |
|---|---|---|
| Overview & masalah | Problem statement | Pertanyaan bisnis |
| Fitur utama (galeri screenshot) | User research & insight | Dataset & sumber data |
| Arsitektur / tech stack | User persona / journey | Proses: cleaning → EDA → modeling |
| Tantangan teknis & solusi | Wireframe → hi-fi (before/after) | Visualisasi kunci (gambar atau embed dashboard) |
| Hasil & dampak (angka) | Prototype (embed Figma) | Insight & rekomendasi |
| Pelajaran | Usability test & iterasi | Dampak (angka) |
| | Hasil & pelajaran | Link notebook / dashboard |

### 5.4 Certificates `/certificates`

```
Certificates & Achievements.

[ Semua ] [ Web ] [ UI/UX ] [ Data ] [ Lainnya ]

Sertifikat                                         grid 4 / 2 / 1 kolom
┌──────────┐  logo penerbit, judul, penerbit, tanggal,
│ thumbnail│  badge "Verified" jika ada credential URL
└──────────┘  klik → modal preview gambar + tombol "Lihat kredensial ↗"

Prestasi                                           timeline vertikal
● 2025 — Juara 1 Lomba ... (Tingkat Nasional)
● 2024 — Finalis ...
```

### 5.5 Menu Fullscreen

Panel gelap (`--bg-inverse`) dari kanan, berisi link besar (HOME, ABOUT, EXPERIENCE, PROJECTS, ALL PROJECTS, CERTIFICATES, CONTACT) dengan stagger, tombol **Close** berbentuk pill. Kiri menampilkan lokasi dan jam lokal.

### 5.6 Halaman 404 (opsional, easter egg)

Mini terminal ala referensi Kak Alvin: `help`, `whoami`, `projects`, `resume`, `cd ~` (kembali ke home).

---

## 6. Komponen Reusable

| Komponen | Props utama | Catatan |
|---|---|---|
| `Navbar` | `variant: light \| dark` | Berubah warna mengikuti section di belakangnya |
| `FullscreenMenu` | `open`, `onClose` | Trap focus, tutup dengan `Esc` |
| `Button` | `variant: primary \| secondary \| ghost`, `size`, `icon` | State hover/focus/active/disabled |
| `Chip` | `category`, `label` | Warna mengikuti kategori |
| `SectionLabel` | `children` | Label mono uppercase |
| `GhostHeading` | `text` | Teks raksasa transparan di latar section |
| `TypingText` | `words[]` | Efek ketik di hero |
| `StatBadge` | `icon`, `label` | Badge statistik di hero |
| `ExperienceCard` | `experience` | Versi horizontal (desktop) dan vertikal (mobile) |
| `ProjectCard` | `project` | Thumbnail, chip, judul, ringkasan dampak |
| `CategoryTabs` | `categories`, `active`, `counts` | Sinkron dengan query string |
| `ImpactPanel` | `statement`, `metrics[]` | Panel gelap + angka besar |
| `BlockRenderer` | `blocks[]` | Merender blok case study sesuai `type` |
| `CertificateCard` | `certificate` | + `CertificateModal` |
| `AchievementTimeline` | `achievements[]` | |
| `ContactForm` | — | Validasi Zod, honeypot, state loading/sukses/gagal |
| `Reveal` | `delay` | Wrapper animasi scroll |

---

## 7. Arsitektur Sistem

```
                    Internet
                       │
                ┌──────▼──────┐
                │    Nginx    │  HTTPS (Let's Encrypt), gzip/brotli, cache static
                └──┬───────┬──┘
     domain.com    │       │   api.domain.com      /uploads/* (file statis)
          ┌────────▼──┐ ┌──▼─────────┐
          │  Web      │ │  API       │
          │  Next.js  │◄┤  Node.js   │──► folder uploads (volume)
          │  (SSR/ISR)│ │  Express   │
          └───────────┘ └──┬─────────┘
                ▲          │
     revalidate │          │ Prisma
     (webhook)  │   ┌──────▼──────┐
                └───┤ PostgreSQL  │  (tidak diekspos ke publik)
                    └─────────────┘
```

**Alur data**
1. Pengunjung membuka halaman → Next.js menyajikan halaman yang sudah di-generate (ISR, cepat).
2. Admin menambah atau mengubah konten di `/admin` → request ke API → tersimpan di PostgreSQL.
3. API memanggil endpoint `POST /api/revalidate` milik Next.js → halaman terkait dibangun ulang otomatis.
4. Gambar disimpan di disk VPS dan disajikan langsung oleh Nginx.

---

## 8. Tech Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | SSR/ISR untuk SEO dan kecepatan; satu repo dengan admin panel |
| Styling | **Tailwind CSS** + CSS variables (token) | Token mudah diubah, konsisten |
| UI admin | **shadcn/ui** | Komponen form/tabel siap pakai, mudah disesuaikan dengan tema |
| Animasi | **Framer Motion** | Reveal, stagger, horizontal scroll |
| Form & validasi | **React Hook Form + Zod** | Skema Zod bisa dipakai bersama frontend dan backend |
| Data fetching (admin) | **TanStack Query** | Cache dan mutasi untuk CRUD |
| Editor konten | **Tiptap** | Rich text untuk blok case study |
| Backend | **Node.js + Express + TypeScript** | Satu bahasa dengan frontend; ringan untuk VPS |
| ORM | **Prisma** | Migrasi skema rapi, type-safe |
| Database | **PostgreSQL 16** | Sesuai permintaan; mendukung `jsonb` untuk blok konten |
| Auth | Session JWT di **httpOnly cookie**, password **argon2** | Hanya satu admin; sederhana dan aman |
| Upload gambar | **multer + sharp** | Resize & konversi ke WebP |
| Email notifikasi | **Nodemailer** (SMTP) | Notifikasi pesan kontak baru |
| Infrastruktur | **Docker Compose + Nginx + Certbot** | Deploy mudah, bisa diulang |
| CI/CD | **GitHub Actions** → SSH ke VPS | Build & deploy otomatis saat push ke `main` |

> **Alternatif backend:** jika lebih nyaman dengan PHP, Express bisa diganti **Laravel 11** (Sanctum + Eloquent). Skema database dan rancangan API di bawah tetap berlaku.

---

## 9. Skema Database (PostgreSQL)

### 9.1 Diagram Relasi

```
admin_users

site_profile ──(cv_media_id)──► media

projects ──< project_blocks
   │  └───< project_metrics
   ├──< project_technologies >── technologies
   └──(cover_media_id)──► media

experiences ──< experience_technologies >── technologies
certificates ──► media
achievements ──► media
contact_messages
```

### 9.2 DDL

```sql
-- ===== ENUM =====
CREATE TYPE project_category   AS ENUM ('web', 'uiux', 'data');
CREATE TYPE publish_status     AS ENUM ('draft', 'published', 'archived');
CREATE TYPE block_type         AS ENUM ('rich_text', 'image', 'gallery', 'before_after',
                                        'metrics', 'quote', 'embed', 'code', 'list');
CREATE TYPE tech_group         AS ENUM ('web', 'uiux', 'data', 'tools');
CREATE TYPE employment_type    AS ENUM ('full_time', 'part_time', 'internship',
                                        'freelance', 'contract', 'organization');
CREATE TYPE achievement_level  AS ENUM ('international', 'national', 'regional',
                                        'university', 'other');

-- ===== ADMIN =====
CREATE TABLE admin_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,                -- argon2
  name           VARCHAR(120) NOT NULL,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== MEDIA =====
CREATE TABLE media (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path    TEXT NOT NULL,                  -- mis. /uploads/2026/10/abc.webp
  mime_type    VARCHAR(100) NOT NULL,
  size_bytes   INTEGER NOT NULL,
  width        INTEGER,
  height       INTEGER,
  alt_text     VARCHAR(255),
  variants     JSONB NOT NULL DEFAULT '{}',    -- {"sm": "...", "md": "...", "lg": "..."}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== PROFIL (satu baris) =====
CREATE TABLE site_profile (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  full_name       VARCHAR(120) NOT NULL,
  short_name      VARCHAR(60)  NOT NULL,         -- dipakai di "Hi, I'm ___."
  roles           TEXT[] NOT NULL DEFAULT '{}',  -- untuk efek ketik di hero
  headline        VARCHAR(255),
  statement       TEXT,                          -- teks section gelap
  bio             TEXT,
  location        VARCHAR(120),
  timezone        VARCHAR(60) DEFAULT 'Asia/Makassar',
  email           VARCHAR(255),
  phone           VARCHAR(40),
  socials         JSONB NOT NULL DEFAULT '{}',   -- {"github": "...", "linkedin": "...", "behance": "..."}
  photo_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  cv_media_id     UUID REFERENCES media(id) ON DELETE SET NULL,
  seo_title       VARCHAR(70),
  seo_description VARCHAR(160),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== TEKNOLOGI / TOOLS =====
CREATE TABLE technologies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) UNIQUE NOT NULL,      -- "React", "Figma", "Python"
  slug        VARCHAR(80) UNIQUE NOT NULL,
  grp         tech_group NOT NULL,
  icon_key    VARCHAR(80),                      -- kunci ikon (simple-icons / lucide)
  show_on_home BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ===== PROJECTS =====
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(140) UNIQUE NOT NULL,
  title           VARCHAR(160) NOT NULL,
  category        project_category NOT NULL,
  summary         VARCHAR(300) NOT NULL,        -- 1–2 kalimat di kartu
  impact_line     VARCHAR(200),                 -- kalimat dampak singkat di kartu
  impact_statement TEXT,                        -- teks di ImpactPanel
  role            VARCHAR(160),
  team            VARCHAR(160),
  client          VARCHAR(160),
  year            SMALLINT,
  started_at      DATE,
  ended_at        DATE,
  contributions   TEXT[] NOT NULL DEFAULT '{}', -- list "Kontribusi saya"
  cover_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  demo_url        TEXT,
  repo_url        TEXT,
  figma_url       TEXT,                         -- untuk UI/UX
  dashboard_url   TEXT,                         -- untuk Data (Tableau/Looker/Power BI)
  notebook_url    TEXT,                         -- untuk Data (Kaggle/Colab/GitHub)
  meta            JSONB NOT NULL DEFAULT '{}',  -- field khusus kategori, mis. {"dataset": "...", "platform": "mobile"}
  status          publish_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  seo_description VARCHAR(160),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_public ON projects (status, category, sort_order);
CREATE INDEX idx_projects_featured ON projects (is_featured) WHERE status = 'published';

CREATE TABLE project_metrics (                  -- angka besar di ImpactPanel
  id          SERIAL PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  value       VARCHAR(20) NOT NULL,             -- "300", "40%", "2x"
  label       VARCHAR(80) NOT NULL,             -- "pengguna aktif"
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE project_blocks (                   -- isi case study (fleksibel)
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        block_type NOT NULL,
  heading     VARCHAR(160),                     -- mis. "User research & insight"
  data        JSONB NOT NULL DEFAULT '{}',      -- isi sesuai type (lihat 9.3)
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_blocks_project ON project_blocks (project_id, sort_order);

CREATE TABLE project_technologies (
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  technology_id  INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, technology_id)
);

-- ===== EXPERIENCE =====
CREATE TABLE experiences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role            VARCHAR(160) NOT NULL,
  company         VARCHAR(160) NOT NULL,
  company_url     TEXT,
  location        VARCHAR(120),
  employment_type employment_type NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE,                         -- NULL = sekarang
  description     TEXT,
  highlights      TEXT[] NOT NULL DEFAULT '{}',
  image_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  status          publish_status NOT NULL DEFAULT 'published',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE experience_technologies (
  experience_id  UUID REFERENCES experiences(id) ON DELETE CASCADE,
  technology_id  INTEGER REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (experience_id, technology_id)
);

-- ===== SERTIFIKAT =====
CREATE TABLE certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(200) NOT NULL,
  issuer          VARCHAR(160) NOT NULL,        -- Dicoding, Google, Coursera, dll.
  category        VARCHAR(20) NOT NULL DEFAULT 'other'
                  CHECK (category IN ('web', 'uiux', 'data', 'other')),
  issued_at       DATE NOT NULL,
  expires_at      DATE,
  credential_id   VARCHAR(160),
  credential_url  TEXT,                         -- ada → badge "Verified"
  image_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  issuer_logo_media_id UUID REFERENCES media(id) ON DELETE SET NULL,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  status          publish_status NOT NULL DEFAULT 'published',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== PRESTASI =====
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(200) NOT NULL,        -- "Juara 1 UI/UX Competition"
  organizer       VARCHAR(160),
  level           achievement_level NOT NULL DEFAULT 'other',
  rank_label      VARCHAR(60),                  -- "Juara 1", "Finalis", "Best Paper"
  achieved_at     DATE NOT NULL,
  description     TEXT,
  link_url        TEXT,
  image_media_id  UUID REFERENCES media(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status          publish_status NOT NULL DEFAULT 'published',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== PESAN KONTAK =====
CREATE TABLE contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  ip_hash     VARCHAR(64),                      -- hash IP untuk anti-spam, bukan IP mentah
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_unread ON contact_messages (is_read, created_at DESC);
```

### 9.3 Format `project_blocks.data` per `type`

| type | Contoh `data` |
|---|---|
| `rich_text` | `{ "html": "<p>...</p>" }` (output Tiptap, disanitasi) |
| `image` | `{ "media_id": "uuid", "caption": "...", "frame": "browser" }` |
| `gallery` | `{ "items": [{ "media_id": "uuid", "caption": "..." }], "columns": 2 }` |
| `before_after` | `{ "before_media_id": "uuid", "after_media_id": "uuid", "caption": "..." }` (UI/UX) |
| `metrics` | `{ "items": [{ "value": "40%", "label": "lebih cepat" }] }` |
| `quote` | `{ "text": "...", "author": "..." }` (testimoni user/klien) |
| `embed` | `{ "provider": "figma" \| "tableau" \| "looker" \| "youtube", "url": "..." }` |
| `code` | `{ "language": "sql", "code": "SELECT ..." }` (Data/Web) |
| `list` | `{ "style": "bullet" \| "numbered", "items": ["..."] }` |

---

## 10. Rancangan API

Base URL: `https://api.domain.com/v1` · Format JSON · Error konsisten:
`{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { ... } } }`

### 10.1 Publik (tanpa auth, hanya data `published`)

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/profile` | Profil, sosial, link CV |
| GET | `/stats` | Jumlah project per kategori, sertifikat, prestasi (untuk badge hero) |
| GET | `/projects?category=&featured=&page=&limit=` | List kartu project |
| GET | `/projects/:slug` | Detail + metrics + blocks + technologies + next project |
| GET | `/experiences` | List experience |
| GET | `/technologies?group=` | Skills & tools |
| GET | `/certificates?category=&featured=` | List sertifikat |
| GET | `/achievements` | List prestasi |
| POST | `/contact` | Kirim pesan (rate limit 3/jam per IP, honeypot, validasi Zod) |

### 10.2 Admin (wajib cookie session)

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/auth/login` | Email + password → set cookie httpOnly |
| POST | `/auth/logout` | Hapus session |
| GET | `/auth/me` | Cek session |
| GET/PUT | `/admin/profile` | Ubah profil |
| GET/POST | `/admin/projects` | List (semua status) / buat |
| GET/PUT/DELETE | `/admin/projects/:id` | Detail / ubah / hapus |
| PATCH | `/admin/projects/:id/status` | Publish / unpublish / archive |
| PUT | `/admin/projects/:id/blocks` | Simpan seluruh blok (urutan + isi) sekaligus |
| PUT | `/admin/projects/:id/metrics` | Simpan metrics |
| PATCH | `/admin/projects/reorder` | `[{ id, sort_order }]` |
| CRUD | `/admin/experiences`, `/admin/certificates`, `/admin/achievements`, `/admin/technologies` | Pola sama dengan projects |
| POST | `/admin/media` | Upload (multipart) → resize → simpan |
| GET/DELETE | `/admin/media`, `/admin/media/:id` | Media library |
| GET | `/admin/messages` | Inbox pesan kontak |
| PATCH/DELETE | `/admin/messages/:id` | Tandai dibaca / hapus |

**Setelah setiap mutasi** yang memengaruhi halaman publik, API memanggil:
`POST https://domain.com/api/revalidate` dengan header `x-revalidate-secret` dan body `{ "paths": ["/", "/projects", "/projects/slug-x"] }`.

---

## 11. Admin Panel (CMS sendiri)

Dibangun di dalam app Next.js pada `/admin`, memakai shadcn/ui dengan tema token yang sama.

```
┌──────────────┬──────────────────────────────────────────┐
│ ▸ Dashboard  │  Projects                    [+ Project] │
│ ▸ Profile    │  [All][Web][UI/UX][Data]   🔍 cari...    │
│ ▸ Projects   │  ┌──────────────────────────────────────┐│
│ ▸ Experience │  │ ⋮⋮ thumb  Judul   Web   Published  ✎ ││  ⋮⋮ = drag untuk urutkan
│ ▸ Skills     │  │ ⋮⋮ thumb  Judul   Data  Draft      ✎ ││
│ ▸ Certificate│  └──────────────────────────────────────┘│
│ ▸ Achievement│                                          │
│ ▸ Media      │                                          │
│ ▸ Messages(2)│                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Fitur penting**
- **Dashboard:** jumlah konten, pesan belum dibaca, tombol cepat "Tambah project".
- **Form project bertahap (tab):** Info dasar → Links → Tech → Contribution & Metrics → **Case study builder** → SEO → Publish.
- **Case study builder:** tambah blok dari daftar `block_type`, drag untuk mengurutkan, dan pilih *template kategori* untuk mengisi blok default otomatis (lihat tabel 5.3).
- **Preview:** tombol "Preview" membuka halaman draft memakai Next.js Draft Mode.
- **Media library:** upload drag & drop, isi alt text (wajib), pilih ulang gambar yang sudah ada.
- **Autosave draft** setiap 10 detik pada form panjang.

---

## 12. Media & Upload

- Format diterima: JPG, PNG, WebP, GIF (≤ 8 MB) dan PDF untuk CV (≤ 5 MB).
- `sharp` membuat varian **WebP**: `sm 480px`, `md 960px`, `lg 1600px`, serta membuang metadata EXIF.
- Lokasi: `/var/www/portfolio/uploads/YYYY/MM/<uuid>.webp`, disajikan Nginx dengan `Cache-Control: public, max-age=31536000, immutable`.
- Nama file memakai UUID, bukan nama asli (mencegah tebakan path dan konflik).
- Validasi tipe dari *magic bytes*, bukan hanya ekstensi.
- Backup folder uploads ikut dalam backup harian (lihat 15.4).

---

## 13. Keamanan

| Area | Langkah |
|---|---|
| Auth | Password argon2id; cookie `httpOnly`, `Secure`, `SameSite=Lax`; masa berlaku 7 hari |
| Brute force | Rate limit login 5 percobaan / 15 menit per IP; jeda progresif |
| CSRF | Cookie `SameSite` + cek header `Origin` untuk request yang mengubah data |
| CORS | Hanya izinkan `https://domain.com` |
| Input | Validasi semua body dengan Zod; HTML rich text disanitasi (`sanitize-html`) |
| SQL | Prisma (parameterized query); user DB khusus aplikasi, bukan superuser |
| Header | `helmet` (CSP, HSTS, X-Frame-Options) |
| Database | PostgreSQL hanya bisa diakses dari jaringan Docker internal, port 5432 tidak dibuka |
| VPS | Login SSH dengan key saja, nonaktifkan root login, `ufw` (hanya 22/80/443), `fail2ban` |
| Secrets | `.env` tidak di-commit; simpan di GitHub Secrets untuk CI |
| Kontak | Honeypot field + rate limit + IP disimpan sebagai hash |

---

## 14. SEO, Performa & Aksesibilitas

**SEO**
- Metadata per halaman (`generateMetadata`), Open Graph image dinamis per project (`/projects/[slug]/opengraph-image`).
- `sitemap.xml` dan `robots.txt` dibuat otomatis dari database.
- JSON-LD: `Person` di home, `CreativeWork` di detail project.

**Performa (target Lighthouse ≥ 90)**
- ISR + on-demand revalidation sehingga halaman publik tidak query DB setiap request.
- `next/image` dengan varian WebP; gambar di atas fold memakai `priority`.
- Font di-*self-host* lewat `next/font` dengan `display: swap`.
- Framer Motion di-*lazy load* untuk section di bawah fold.

**Aksesibilitas**
- HTML semantik (`header`, `nav`, `main`, `section`, `footer`).
- Semua elemen interaktif bisa diakses keyboard dengan ring fokus `--focus` yang terlihat.
- Alt text wajib saat upload media.
- Menu fullscreen dan modal: focus trap, `Esc` untuk menutup, `aria-modal`.
- Kontras warna sesuai WCAG AA (lihat 3.1).

---

## 15. Deployment di VPS

### 15.1 Spesifikasi minimum
2 vCPU · 2 GB RAM · 40 GB SSD · Ubuntu 24.04 LTS

### 15.2 Docker Compose (gambaran)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: portfolio
      POSTGRES_USER: portfolio_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    restart: unless-stopped

  api:
    build: ./apps/api
    env_file: .env.api
    depends_on: [db]
    volumes: [uploads:/app/uploads]
    restart: unless-stopped

  web:
    build: ./apps/web
    env_file: .env.web
    depends_on: [api]
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./infra/nginx:/etc/nginx/conf.d
      - uploads:/var/www/uploads:ro
      - certbot:/etc/letsencrypt
    depends_on: [web, api]
    restart: unless-stopped

volumes: { pgdata: {}, uploads: {}, certbot: {} }
```

### 15.3 Domain
- `domain.com` → Next.js (web + admin)
- `api.domain.com` → Express API
- `domain.com/uploads/*` → file statis dari Nginx

### 15.4 Backup & Monitoring
- `pg_dump` harian via cron → dikompres → simpan 14 hari terakhir, plus salinan ke penyimpanan luar (mis. Google Drive/Backblaze B2 lewat `rclone`).
- Backup folder `uploads` harian dengan `rclone sync`.
- Uptime monitoring gratis (UptimeRobot / BetterStack) untuk `domain.com` dan `api.domain.com/health`.
- Log aplikasi lewat `pino`, rotasi log Docker.

### 15.5 CI/CD
Push ke `main` → GitHub Actions: lint + typecheck + test → build image → SSH ke VPS → `docker compose pull && docker compose up -d` → `prisma migrate deploy`.

---

## 16. Struktur Folder

Monorepo dengan **pnpm workspaces**:

```
portfolio/
├── apps/
│   ├── web/                      # Next.js (publik + admin)
│   │   ├── app/
│   │   │   ├── (site)/
│   │   │   │   ├── page.tsx                  # Home
│   │   │   │   ├── projects/page.tsx
│   │   │   │   ├── projects/[slug]/page.tsx
│   │   │   │   └── certificates/page.tsx
│   │   │   ├── admin/                        # CMS
│   │   │   ├── api/revalidate/route.ts
│   │   │   ├── sitemap.ts
│   │   │   └── not-found.tsx                 # 404 + easter egg terminal
│   │   ├── components/
│   │   │   ├── ui/                           # Button, Chip, SectionLabel, ...
│   │   │   ├── sections/                     # Hero, Statement, Experience, ...
│   │   │   ├── project/                      # ProjectCard, ImpactPanel, BlockRenderer
│   │   │   └── admin/
│   │   ├── lib/api.ts                        # fetch wrapper ke API
│   │   └── styles/tokens.css                 # design token (bagian 3)
│   └── api/                      # Express
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/  projects/  experiences/  certificates/
│       │   │   ├── achievements/  technologies/  media/  contact/  profile/
│       │   │   └── (tiap modul: routes.ts, controller.ts, service.ts, schema.ts)
│       │   ├── middleware/                   # auth, rateLimit, errorHandler
│       │   ├── lib/                          # prisma, mailer, revalidate, storage
│       │   └── server.ts
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts                       # data contoh + akun admin pertama
├── packages/
│   └── shared/                   # Skema Zod & tipe TypeScript bersama
├── infra/
│   ├── nginx/
│   └── scripts/backup.sh
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

---

## 17. Roadmap Pengerjaan

| Fase | Isi | Estimasi |
|---|---|---|
| **0. Persiapan** | Kumpulkan konten: foto, deskripsi project, screenshot, sertifikat, angka dampak | 2–3 hari |
| **1. Desain hi-fi** | Mockup Home, Projects, Detail (3 varian kategori), Certificates di Figma memakai token bagian 3 | 3–4 hari |
| **2. Backend** | Setup monorepo, Prisma schema + migrasi, auth, CRUD semua modul, upload media, seed | 5–7 hari |
| **3. Frontend publik** | Design token, komponen, semua halaman, animasi, responsif | 6–8 hari |
| **4. Admin panel** | Login, CRUD, case study builder, media library, inbox | 5–7 hari |
| **5. Deploy** | VPS hardening, Docker Compose, Nginx + SSL, CI/CD, backup | 2–3 hari |
| **6. Polish** | SEO, Lighthouse, uji aksesibilitas, isi konten asli | 2–3 hari |
| **7. Opsional** | AI assistant (referensi video 2), easter egg terminal, mode gelap penuh, bilingual ID/EN | — |

---

## 18. Asumsi & Hal yang Perlu Diputuskan

**Asumsi yang diambil dalam dokumen ini**
- Backend memakai **Node.js + Express + TypeScript** (bisa diganti Laravel tanpa mengubah skema DB dan API).
- Hanya ada **satu akun admin** (kamu sendiri).
- Bahasa konten utama: **Inggris** untuk menjangkau recruiter yang lebih luas. Bisa diubah ke Indonesia atau bilingual.
- Nama, domain, dan konten di wireframe masih placeholder.

**Perlu diputuskan**
1. Bahasa konten: Indonesia, Inggris, atau bilingual?
2. Apakah perlu section **GitHub contributions** (ada di referensi 1)? Datanya bisa diambil dari GitHub API dan di-cache di backend.
3. Apakah ingin **AI assistant** dan **easter egg terminal** di versi pertama atau di fase 7?
4. Nama domain yang akan dipakai.
