# Portfolio — frontend publik + admin panel

Implementasi frontend dari `rancangan-portfolio.md` (Next.js 15 App Router + TypeScript + Tailwind CSS v4).
Semua konten saat ini berasal dari **data mock** (`apps/web/lib/mock-data.ts`) yang bentuknya sama persis
dengan respons API di rancangan bagian 10, jadi saat backend Express siap cukup isi `API_URL`.

## Cara menjalankan

Butuh Node.js ≥ 20.9 dan pnpm.

```bash
# sekali saja, kalau pnpm belum ada
corepack enable            # atau: npm install -g pnpm

# dari folder portfolio/
pnpm install
pnpm dev                   # http://localhost:3000
```

Build produksi:

```bash
pnpm build
pnpm start
```

Opsional: salin `apps/web/.env.example` → `apps/web/.env.local` lalu isi (lihat komentar di file itu).
Tanpa `.env.local`, situs memakai data mock dan form kontak hanya mensimulasikan pengiriman.

## Halaman

| Route | Isi |
|---|---|
| `/` | Hero → Statement → Experience (scroll horizontal sticky) → Selected projects → Skills → Certificates & achievements → GitHub contributions → Contact → Footer |
| `/projects` | Semua project, filter kategori + urutan (tersimpan di query string: `/projects?category=data&sort=oldest`) |
| `/projects/[slug]` | Case study: ringkasan, meta, cover, Contribution & impact, blok konten sesuai template kategori, next project |
| `/certificates` | Grid sertifikat + modal preview, timeline prestasi |
| `/cv` | Redirect ke file CV |
| 404 | Halaman "Lost in the void" + terminal easter egg (`help`, `whoami`, `projects`, `resume`, `contact`, `clear`, `cd ~`) |
| `/api/revalidate` | Endpoint on-demand ISR yang nanti dipanggil API (header `x-revalidate-secret`) |
| `/admin` | Admin panel (CMS) — lihat bagian **Admin panel** di bawah |

## Struktur folder

```
portfolio/
├── package.json                 # skrip root (dev/build/start)
├── pnpm-workspace.yaml
├── packages/shared/src/         # tipe respons API + skema Zod (dipakai web & API nanti)
│   ├── types.ts
│   └── schemas.ts
└── apps/web/
    ├── app/
    │   ├── layout.tsx           # font (next/font), metadata global
    │   ├── globals.css          # Tailwind + utilitas tipografi + animasi
    │   ├── not-found.tsx        # 404 + terminal
    │   ├── (site)/              # halaman publik (Navbar + Footer)
    │   ├── cv/route.ts
    │   ├── api/revalidate/route.ts
    │   ├── sitemap.ts, robots.ts
    ├── styles/tokens.css        # SEMUA design token (warna, tipe, spacing, radius, motion)
    ├── components/
    │   ├── ui/                  # Button, Chip, Icon, SectionLabel, GhostHeading, TypingText, Reveal, ...
    │   ├── layout/              # Navbar, FullscreenMenu, Footer
    │   ├── sections/            # section-section Home
    │   ├── project/             # ProjectCard, CategoryTabs, ImpactPanel, BlockRenderer, ...
    │   ├── certificate/         # CertificateCard/Grid/Modal, AchievementTimeline
    │   ├── terminal/            # Terminal easter egg
    │   └── views/               # komposisi tiap halaman (dipanggil oleh app/**/page.tsx)
    ├── lib/
    │   ├── api.ts               # fetch ke API (ISR + tags) atau fallback ke mock
    │   ├── mock-data.ts         # ← GANTI konten placeholder di sini
    │   ├── site.ts              # link navigasi
    │   └── utils.ts
    └── public/placeholders/     # gambar placeholder (SVG) + CV placeholder
```

## Mengganti konten placeholder

Cari `TODO(` di kode untuk semua titik yang perlu diganti:

- `TODO(content)` — teks, angka, link (nama, email, sosial, project, sertifikat) di `lib/mock-data.ts`.
- `TODO(asset)` — foto profil, foto experience, cover project, gambar sertifikat, logo penerbit, file CV.
  Taruh file di `apps/web/public/` lalu ubah path-nya di `mock-data.ts` (nanti diunggah lewat admin panel).

Warna, font, ukuran, radius dan durasi animasi diubah di `apps/web/styles/tokens.css`.

## Catatan teknis

- **Tema terang/gelap per section** memakai atribut `data-theme="dark|light"`: token semantik (`--bg`, `--text`, …)
  dipetakan ulang, jadi komponen yang sama bekerja di kedua jenis section. Navbar otomatis mengikuti section di belakangnya.
- **Animasi** memakai CSS + IntersectionObserver (tanpa Framer Motion) agar bundle kecil; semuanya mati/disederhanakan
  saat `prefers-reduced-motion: reduce`. Experience: sticky horizontal di desktop (≥1024px), swipe di tablet, tumpuk di mobile.
- **Ikon** Lucide di-inline di `components/ui/Icon.tsx` (hanya ikon yang dipakai). Logo teknologi sementara berupa monogram.
- **Form kontak** memakai skema Zod dari `@portfolio/shared` (akan dipakai juga oleh API), honeypot, dan state
  loading/sukses/gagal. Tanpa `NEXT_PUBLIC_API_URL` pengiriman hanya disimulasikan.
- **Embed** Figma/Tableau/Looker/YouTube di case study dimuat setelah diklik (click-to-load) agar halaman tetap cepat.
- **GitHub contributions**: rancangan API belum punya endpoint ini; `lib/api.ts` memanggil `GET /v1/github/contributions`
  (backend nanti meng-cache GraphQL GitHub). Jika gagal, section disembunyikan tanpa merusak halaman.

## Admin panel (`/admin`)

Panel untuk mengelola semua konten tanpa edit kode (rancangan §11). Berjalan di dalam app Next.js yang sama dan
berbicara langsung dengan API (`apps/api`) dari browser.

### Menjalankan & masuk

1. Jalankan API (`pnpm dev:api`) dan pastikan akun admin sudah dibuat:
   `ADMIN_EMAIL=anda@domain.com ADMIN_PASSWORD='password-panjang-min-12' pnpm seed:admin`
2. Pastikan `apps/web/.env.local` berisi `NEXT_PUBLIC_API_URL=http://localhost:4000`, dan `WEB_ORIGIN` di
   `apps/api/.env` berisi origin frontend (`http://localhost:3000`).
3. `pnpm dev`, lalu buka **http://localhost:3000/admin** → otomatis diarahkan ke `/admin/login`.

Lupa sandi: `pnpm seed:admin -- --reset-password` di server (tidak ada reset lewat email).

### Halaman

| Route | Isi |
|---|---|
| `/admin` | Dashboard: jumlah konten, pesan belum dibaca, project terbaru, tombol cepat |
| `/admin/profile` | Nama, peran (efek ketik), statement, bio, kontak, sosial, foto, file CV, SEO |
| `/admin/projects` | Daftar + filter kategori/status + cari + **drag untuk urutkan** + publish/unpublish cepat |
| `/admin/projects/new`, `/admin/projects/[id]` | Editor bertab: Basic info → Links → Tech → Contribution & metrics → **Case study builder** → SEO → Publish. Tombol **Preview** merender halaman case study asli dari isi form (belum disimpan). |
| `/admin/experiences`, `/admin/certificates`, `/admin/achievements` | Daftar (drag urutkan, cari) + form tambah/edit |
| `/admin/skills` | Teknologi per grup (Web, UI/UX, Data, Tools), tambah/edit lewat dialog, drag per grup |
| `/admin/media` | Media library: drag & drop upload (alt text wajib untuk gambar), cari, edit alt text, hapus (ditolak jika masih dipakai) |
| `/admin/messages` | Inbox pesan kontak: baca (otomatis ditandai dibaca), tandai belum dibaca, balas via email, hapus |
| `/admin/account` | Info akun + ganti password (keluar dari semua perangkat) |

### Cara kerja

- **Sesi**: cookie `httpOnly` dari API (`pf_access` 15 menit, `pf_refresh` 7 hari). Panel tidak pernah melihat token;
  saat access token habis, panel memanggil `POST /v1/auth/refresh` sekali lalu mengulang request. Jika refresh gagal,
  pengguna diarahkan ke login (`?next=` kembali ke halaman semula).
- **Case study builder**: 9 jenis blok (`rich_text`, `image`, `gallery`, `before_after`, `metrics`, `quote`, `embed`,
  `code`, `list`), tombol *Use … template* mengisi kerangka sesuai kategori (rancangan §5.3), drag/arrow untuk urutan,
  validasi di browser memakai aturan & key yang sama dengan API (`blocks.2.data.mediaId`), sehingga error server juga
  muncul di blok yang tepat.
- **Autosave**: perubahan project yang belum disimpan dicatat di browser tiap 10 detik; saat dibuka lagi muncul pilihan
  *Restore / Discard*. Peringatan juga muncul jika menutup tab dengan perubahan belum tersimpan.
- **Validasi**: pesan error per-field dari API (422) ditampilkan di field-nya; tab yang berisi error diberi titik merah.
- **Aksesibilitas**: semua aksi bisa dengan keyboard (drag punya tombol naik/turun), dialog memakai `<dialog>` native,
  toast & perubahan urutan diumumkan ke screen reader, `/admin` diberi `noindex`.

### Struktur

```
apps/web/
├── app/admin/
│   ├── layout.tsx            # providers (auth, toast, confirm) + noindex
│   ├── login/page.tsx
│   └── (panel)/              # semua halaman di balik login (sidebar)
├── components/admin/
│   ├── AdminProviders.tsx    # sesi, guard, toast, confirm dialog, badge pesan
│   ├── AdminShell.tsx        # sidebar desktop + drawer mobile
│   ├── LoginForm.tsx
│   ├── ui/                   # Field, TagInput, Dialog, Tabs, SortableList, SaveBar, Pagination, …
│   ├── media/                # UploadPanel, MediaLibrary, MediaPicker
│   ├── forms/                # ResourceList/ResourceEditor generik, TechnologyPicker, RichTextEditor
│   ├── projects/             # ProjectList, ProjectEditor, BlocksEditor
│   └── pages/                # Dashboard, Profile, Experience, Certificates, Achievements, Skills, Media, Messages, Account
└── lib/admin/                # api client (refresh otomatis), hooks, tipe respons admin, blok, preview, media cache
```

Penyimpangan dari rancangan §8: panel tidak memakai shadcn/ui, TanStack Query, Tiptap, atau React Hook Form, agar tidak
menambah dependency. Komponennya ditulis kecil di `components/admin/ui` dengan token desain yang sama; editor teks
menghasilkan subset HTML yang sama dengan allow-list sanitizer API. Bila nanti butuh fitur lebih (tabel, kolaborasi),
`RichTextEditor` bisa diganti Tiptap tanpa mengubah API.

## Langkah berikutnya (sesuai roadmap)

1. ~~Fase 2 — backend~~ ✅ selesai: `apps/api` (Express 5 + PostgreSQL via Kysely) — lihat [`apps/api/README.md`](apps/api/README.md)
   untuk cara menjalankan, daftar endpoint, keamanan, Docker, dan catatan integrasi dengan frontend.
2. ~~Fase 4 — admin panel di `/admin`~~ ✅ selesai — lihat bagian **Admin panel** di atas.
3. Fase 5 — deploy VPS. Tanpa Docker: ikuti [`deploy/no-docker/DEPLOY.md`](deploy/no-docker/DEPLOY.md) (Nginx + systemd + Certbot). Dengan Docker: `docker-compose.yml`.
