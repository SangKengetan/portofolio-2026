# Portfolio API

REST API untuk portfolio: melayani semua data yang dibaca frontend (`apps/web`) dan menyediakan endpoint admin
untuk mengelola konten (profil, project & case study, pengalaman, sertifikat, prestasi, skill, media, pesan kontak).

**Stack:** Node 22 · Express 5 · TypeScript (ESM) · PostgreSQL 16 · Kysely + migrasi SQL · Zod · Argon2id · JWT (jose) ·
sharp · pino · vitest. Dokumentasi interaktif: Swagger UI di `/docs`, spec di `/openapi.json` (mati di production secara default).

---

## 1. Rencana singkat

| Pertanyaan | Keputusan |
|---|---|
| Kontrak | Bentuk JSON publik **sama persis** dengan `packages/shared/src/types.ts` & `apps/web/lib/mock-data.ts` (diverifikasi test kontrak). Frontend cukup mengisi `API_URL`. |
| Arsitektur | `route → controller → service → repository`. Controller hanya HTTP, service berisi aturan bisnis (tanpa Express), repository satu-satunya yang menyentuh SQL. Dependensi dirakit di `src/container.ts` (composition root) sehingga mudah di-mock di test. |
| Format respons | Sukses `{ success, message, data, meta? }`. Error `{ success:false, message, error:{code,message,fields?}, requestId }`. Frontend membaca `body.data` / `body.error.message`, jadi kompatibel. |
| Autentikasi | Satu akun admin. Access token 15 menit + refresh token 7 hari (rotasi, hash di DB, deteksi pemakaian ulang), keduanya cookie `httpOnly` + `SameSite=Lax`. |
| Konten | Draft/published/archived, soft delete, urutan drag-and-drop, case study berbasis blok (`rich_text`, `image`, `gallery`, `before_after`, `metrics`, `quote`, `embed`, `code`, `list`). |
| Media | Upload → validasi magic bytes → re-encode WebP 3 ukuran (480/960/1600) tanpa EXIF; PDF untuk CV. |
| Freshness | Setiap perubahan konten mengosongkan cache dan memanggil `POST /api/revalidate` di Next.js lewat job queue (dengan retry). |

### Penyimpangan dari `rancangan-portfolio.md`

Rancangan menyebut **Prisma**. API ini memakai **Kysely + file migrasi SQL**. Alasan: lingkungan tempat API dibangun
memblokir unduhan engine Prisma sehingga `prisma generate/migrate` tidak bisa dijalankan dan diuji. Skema tabelnya
tetap mengikuti bagian 9 rancangan (nama tabel/kolom, enum, relasi), jadi pindah ke Prisma nanti hanya soal menulis
ulang lapisan repository, tidak mengubah database maupun API.

---

## 2. Struktur

```
apps/api/
├── migrations/            0001_init.sql, 0002_refresh_tokens.sql (forward-only, dijalankan berurutan)
├── src/
│   ├── server.ts          entry point + graceful shutdown
│   ├── app.ts             createApp(): middleware & routing
│   ├── container.ts       composition root (repo → service → controller)
│   ├── config/env.ts      validasi env (Zod) + pemeriksaan keamanan production
│   ├── common/            errors, envelope, pagination, validate, slug
│   ├── db/                client Kysely, tipe tabel, migration runner
│   ├── lib/               logger, cache, jobs, crypto, sanitize, storage, image, mailer, publisher
│   ├── middleware/        request-logger, origin-guard (CSRF), require-admin, rate-limit, error-handler, upload
│   ├── modules/           auth, media, technologies, projects, experiences, certificates, achievements,
│   │                      profile, stats, contact, messages, github, dashboard
│   ├── routes/            public.ts, admin.ts
│   ├── docs/              generator OpenAPI dari skema Zod
│   ├── scripts/           migrate, seed-admin, seed-demo
│   └── seed/demo.ts      data contoh (hanya dev)
└── test/                  unit/ + integration/ (PostgreSQL asli)
```

## 3. Model data (ERD)

```mermaid
erDiagram
  admin_users ||--o{ refresh_tokens : "punya"
  media ||--o{ projects : "cover"
  media ||--o| site_profile : "foto / CV"
  media ||--o{ experiences : "gambar"
  media ||--o{ certificates : "gambar / logo"
  media ||--o{ achievements : "gambar"
  projects ||--o{ project_metrics : "metrik dampak"
  projects ||--o{ project_blocks : "blok case study"
  projects ||--o{ project_technologies : ""
  technologies ||--o{ project_technologies : ""
  experiences ||--o{ experience_technologies : ""
  technologies ||--o{ experience_technologies : ""
  projects ||--o{ achievements : "related_project_id"

  admin_users { uuid id PK  text email UK  text password_hash  timestamptz last_login_at }
  refresh_tokens { uuid id PK  uuid user_id FK  uuid family_id  text token_hash  timestamptz expires_at  timestamptz revoked_at }
  media { uuid id PK  text file_path  text mime_type  int size_bytes  int width  int height  text alt_text  jsonb variants }
  site_profile { int id PK  text full_name  text[] roles  text handle  bool available_for_work  jsonb socials  uuid photo_media_id FK  uuid cv_media_id FK }
  technologies { int id PK  text name  text slug UK  enum grp  text icon_key  bool show_on_home  int sort_order }
  projects { uuid id PK  text slug UK  enum category  text title  text summary  enum status  bool is_featured  int sort_order  timestamptz deleted_at }
  project_metrics { int id PK  uuid project_id FK  text value  text label }
  project_blocks { uuid id PK  uuid project_id FK  enum type  jsonb data  int sort_order }
  experiences { uuid id PK  text role  text company  enum employment_type  date start_date  date end_date  enum status }
  certificates { uuid id PK  text title  text issuer  enum category  date issued_at  bool is_featured }
  achievements { uuid id PK  text title  enum level  date achieved_at  uuid related_project_id FK }
  contact_messages { uuid id PK  text name  text email  text message  text ip_hash  bool is_read }
```

Catatan: slug project unik hanya di antara baris yang belum dihapus (partial unique index), URL media tidak pernah
disimpan absolut (dibentuk dari `MEDIA_PUBLIC_URL`), dan IP pengirim pesan hanya disimpan dalam bentuk hash HMAC.

---

## 4. Menjalankan

Butuh Node ≥ 20.9 (disarankan 22), pnpm 10, dan PostgreSQL 15+ (atau Docker).

```bash
# dari folder root portfolio/
docker compose -f docker-compose.dev.yml up -d      # PostgreSQL + database portfolio_test
cp apps/api/.env.example apps/api/.env              # sesuaikan bila perlu
pnpm install

pnpm migrate                                        # terapkan migrasi
ADMIN_EMAIL=anda@domain.com ADMIN_PASSWORD='password-panjang-min-12' pnpm seed:admin
pnpm seed:demo                                      # opsional: isi konten dari mock-data (DEV SAJA, menimpa konten)

pnpm dev:api                                        # http://localhost:4000  (docs: /docs)
pnpm dev                                            # frontend http://localhost:3000
```

Tanpa Docker: buat database sendiri dan arahkan `DATABASE_URL` ke sana.

Catatan: `packages/shared/package.json` kini memakai `"type": "module"` agar `tsx` (script `dev`) memuat paket TypeScript itu sebagai ESM. Next.js (`transpilePackages`), tsup, dan vitest tidak terpengaruh.

### Skrip

| Perintah (root) | Fungsi |
|---|---|
| `pnpm dev:api` | API dengan auto-reload (`tsx watch`) |
| `pnpm build:api` / `pnpm start:api` | Bundle `dist/` dengan tsup / jalankan hasil build |
| `pnpm migrate` | Jalankan migrasi (idempotent, memakai advisory lock) |
| `pnpm seed:admin` | Buat akun admin; `-- --reset-password` untuk mengganti sandi & mencabut semua sesi |
| `pnpm seed:demo` | Muat data contoh; menolak berjalan jika `NODE_ENV=production` |
| `pnpm test:api` | Unit + integration test |

### Environment

Semua variabel dan penjelasannya ada di [`.env.example`](.env.example). Validasi dilakukan saat start; di production
API **menolak start** bila rahasia terlihat seperti placeholder, `WEB_ORIGIN` bukan https, atau `COOKIE_SECURE=false`.

## 5. Test

```bash
TEST_DATABASE_URL=postgresql://portfolio:portfolio@localhost:5432/portfolio_test pnpm test:api
pnpm --filter @portfolio/api test:unit        # tanpa database
```

Integration test memakai PostgreSQL asli dan **menghapus seluruh skema** database tersebut setiap kali dijalankan, karena
itu nama database wajib berakhiran `_test` (jika tidak, test menolak jalan). Tanpa `TEST_DATABASE_URL` test integrasi
dilewati. Cakupan: kontrak publik vs mock-data, auth (rotasi & pemakaian ulang refresh token, rate limit login, CSRF),
upload & media, CRUD admin semua modul, validasi per-field, sanitasi HTML, allow-list embed, proteksi media yang masih dipakai,
SQL-injection/LIKE escaping, kontak (honeypot, rate limit, email), proxy GitHub.

---

## 6. Endpoint

Semua path diawali host API; versi ada di path (`/v1`). Daftar ini dibangkitkan dari spec OpenAPI yang sama dengan `/docs`.

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/health` | public | Liveness check |
| `GET` | `/health/ready` | public | Readiness check (pings PostgreSQL) |
| `GET` | `/v1/profile` | public | Profile, socials, photo and CV link |
| `GET` | `/v1/stats` | public | Counts for the hero badges |
| `GET` | `/v1/projects` | public | Published project cards |
| `GET` | `/v1/projects/{slug}` | public | Case study with metrics, blocks, technologies and next project |
| `GET` | `/v1/experiences` | public | Experience cards |
| `GET` | `/v1/technologies` | public | Skills & tools |
| `GET` | `/v1/certificates` | public | Certificates |
| `GET` | `/v1/achievements` | public | Achievements timeline |
| `GET` | `/v1/github/contributions` | public | GitHub contribution heatmap (cached 6 h) |
| `POST` | `/v1/contact` | public | Send a message (3 per hour per IP; honeypot field `website`) |
| `POST` | `/v1/auth/login` | public | Sign in → sets httpOnly cookies pf_access (15 min) and pf_refresh (7 days) |
| `POST` | `/v1/auth/refresh` | public | Rotate the refresh token (needs the pf_refresh cookie) |
| `POST` | `/v1/auth/logout` | public | Revoke this login and clear cookies |
| `GET` | `/v1/auth/me` | admin | Current admin |
| `POST` | `/v1/auth/change-password` | admin | Change password (signs out every device) |
| `GET` | `/v1/admin/dashboard` | admin | Content counts and unread messages |
| `GET` | `/v1/admin/profile` | admin | Read profile |
| `PUT` | `/v1/admin/profile` | admin | Save profile |
| `GET` | `/v1/admin/projects` | admin | List projects (all statuses) |
| `POST` | `/v1/admin/projects` | admin | Create project (slug generated from the title when omitted) |
| `PATCH` | `/v1/admin/projects/reorder` | admin | Save drag-and-drop order |
| `GET` | `/v1/admin/projects/{id}` | admin | Project with blocks (media as ids) and metrics |
| `PUT` | `/v1/admin/projects/{id}` | admin | Replace project fields and technologies |
| `DELETE` | `/v1/admin/projects/{id}` | admin | Soft delete |
| `PATCH` | `/v1/admin/projects/{id}/status` | admin | Publish / unpublish / archive |
| `PUT` | `/v1/admin/projects/{id}/blocks` | admin | Replace all case-study blocks at once |
| `PUT` | `/v1/admin/projects/{id}/metrics` | admin | Replace impact metrics |
| `GET` | `/v1/admin/experiences` | admin | List |
| `POST` | `/v1/admin/experiences` | admin | Create |
| `PATCH` | `/v1/admin/experiences/reorder` | admin | Reorder |
| `GET` | `/v1/admin/experiences/{id}` | admin | Detail |
| `PUT` | `/v1/admin/experiences/{id}` | admin | Update |
| `DELETE` | `/v1/admin/experiences/{id}` | admin | Soft delete |
| `GET` | `/v1/admin/certificates` | admin | List |
| `POST` | `/v1/admin/certificates` | admin | Create |
| `PATCH` | `/v1/admin/certificates/reorder` | admin | Reorder |
| `GET` | `/v1/admin/certificates/{id}` | admin | Detail |
| `PUT` | `/v1/admin/certificates/{id}` | admin | Update |
| `DELETE` | `/v1/admin/certificates/{id}` | admin | Soft delete |
| `GET` | `/v1/admin/achievements` | admin | List |
| `POST` | `/v1/admin/achievements` | admin | Create |
| `PATCH` | `/v1/admin/achievements/reorder` | admin | Reorder |
| `GET` | `/v1/admin/achievements/{id}` | admin | Detail |
| `PUT` | `/v1/admin/achievements/{id}` | admin | Update |
| `DELETE` | `/v1/admin/achievements/{id}` | admin | Soft delete |
| `GET` | `/v1/admin/technologies` | admin | List |
| `POST` | `/v1/admin/technologies` | admin | Create |
| `PATCH` | `/v1/admin/technologies/reorder` | admin | Reorder |
| `GET` | `/v1/admin/technologies/{id}` | admin | Detail |
| `PUT` | `/v1/admin/technologies/{id}` | admin | Update |
| `DELETE` | `/v1/admin/technologies/{id}` | admin | Delete (removed from projects and experiences too) |
| `POST` | `/v1/admin/media` | admin | Upload JPG/PNG/WebP/GIF (≤ 8 MB, alt text required) or PDF (≤ 5 MB) → WebP variants sm/md/lg |
| `GET` | `/v1/admin/media` | admin | Media library |
| `GET` | `/v1/admin/media/{id}` | admin | Detail |
| `PATCH` | `/v1/admin/media/{id}` | admin | Edit alt text |
| `DELETE` | `/v1/admin/media/{id}` | admin | Delete (409 MEDIA_IN_USE while referenced) |
| `GET` | `/v1/admin/messages` | admin | Inbox (header X-Unread-Count) |
| `GET` | `/v1/admin/messages/{id}` | admin | Read one message |
| `PATCH` | `/v1/admin/messages/{id}` | admin | Mark read / unread |
| `DELETE` | `/v1/admin/messages/{id}` | admin | Delete |

**Query umum:** semua daftar mendukung `?page=1&limit=20` (meta: `page, limit, total, totalPages`). Daftar admin default 20 per halaman
(maks 100); daftar publik default cukup besar (project 50, lainnya 100) sehingga halaman pertama sudah memuat semua data terbit dan frontend
tetap bisa menyaring sendiri. Filter: `?category=web|uiux|data`, `?featured=true`, `?sort=newest|oldest`, `?search=` (karakter `%`/`_` di-escape);
admin juga `?status=draft|published|archived`.

### Format respons

```jsonc
// 200 / 201
{ "success": true, "message": "OK", "data": { }, "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 } }

// 422 validasi — key memakai path bertitik
{ "success": false, "message": "Validation failed.",
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed.", "fields": { "title": "Required", "blocks.0.data.url": "Invalid URL" } },
  "requestId": "0c9e…" }
```

Kode status: `400` body bukan JSON, `401` belum login/token habis, `403` origin ditolak (CSRF), `404`, `409` konflik
(`MEDIA_IN_USE`, `TECHNOLOGY_EXISTS`, slug), `413` file terlalu besar, `415` tipe file tidak didukung, `422` validasi,
`429` rate limit (header `Retry-After`), `500` galat tak terduga (pesan generik; detail hanya di log dengan `requestId`).

### Contoh cURL

```bash
API=http://localhost:4000

# publik
curl $API/v1/projects?category=web
curl $API/v1/projects/nama-slug

# kirim pesan kontak
curl -X POST $API/v1/contact -H 'content-type: application/json' \
  -d '{"name":"Budi","email":"budi@mail.com","subject":"Halo","message":"Tertarik bekerja sama."}'

# login → simpan cookie. Header Origin opsional untuk curl; bila dikirim harus ada di WEB_ORIGIN (perlindungan CSRF)
curl -c jar -X POST $API/v1/auth/login -H 'content-type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"email":"anda@domain.com","password":"password-panjang-min-12"}'

# buat project (draft), lalu terbitkan
curl -b jar -X POST $API/v1/admin/projects -H 'content-type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"title":"Dashboard Penjualan","category":"data","summary":"Ringkasan singkat."}'
curl -b jar -X PATCH $API/v1/admin/projects/<id>/status -H 'content-type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"status":"published"}'

# upload gambar (alt text wajib)
curl -b jar -X POST $API/v1/admin/media -H 'Origin: http://localhost:3000' \
  -F file=@cover.jpg -F altText='Tampilan dashboard'
```

---

## 7. Keamanan

- **Password** Argon2id; pesan login sama untuk email salah/sandi salah dan waktu proses disamakan (anti user-enumeration).
- **Sesi** cookie `httpOnly`, `SameSite=Lax`, `Secure` di production; refresh token dirotasi tiap pakai, disimpan sebagai hash,
  pemakaian ulang token lama (di luar toleransi 10 detik untuk request paralel) mencabut seluruh keluarga token.
  Ganti sandi mencabut semua sesi.
- **CSRF** request tulis (POST/PUT/PATCH/DELETE) yang membawa header `Origin` dari luar `WEB_ORIGIN` ditolak `403 ORIGIN_NOT_ALLOWED`. Browser selalu mengirim `Origin` pada request lintas-situs, sedangkan request tanpa `Origin` (curl, Postman) bukan berasal dari browser korban sehingga tetap diizinkan. Lapisan kedua: cookie `SameSite=Lax`.
- **CORS** hanya untuk origin di `WEB_ORIGIN`; `helmet` aktif; `x-powered-by` dimatikan.
- **Rate limit** global 300/menit/IP; login 5 gagal/15 menit; kontak 3/jam; refresh & upload punya batas sendiri.
  IP di-hash (HMAC) sebelum dipakai/disimpan.
- **Input** semua body/query/param divalidasi Zod (field tak dikenal dibuang), SQL selalu berparameter, HTML rich text
  disanitasi (`sanitize-html`, hanya tag/atribut aman), embed hanya dari host yang diizinkan per penyedia (Figma, Tableau, Looker, YouTube).
- **Upload** tipe ditentukan dari magic bytes (bukan ekstensi/`Content-Type`), gambar di-decode & di-encode ulang (EXIF dibuang,
  batas 50 MP), nama file dibuat server (UUID), path dijaga agar tidak keluar dari folder upload.
- **Error** tidak membocorkan stack/SQL ke klien; setiap respons membawa `x-request-id` yang sama dengan di log.
- **Konfigurasi** rahasia hanya dari env; start di production ditolak jika konfigurasinya tidak aman.

## 8. Performa, cache & job

- Cache in-memory TTL untuk endpoint publik (otomatis dikosongkan pada setiap mutasi), `Cache-Control` untuk CDN/browser.
- Kontribusi GitHub diambil lewat GraphQL dengan token di server, di-cache 6 jam; bila GitHub gagal, data lama tetap dilayani (stale).
- Query daftar mengambil relasi dengan satu query tambahan per relasi (tanpa N+1); indeks pada kolom filter/urut.
- Job queue in-memory dengan retry untuk email notifikasi kontak dan revalidate Next.js, sehingga request tidak menunggu SMTP/Next.

## 9. Observabilitas & operasional

- Log JSON terstruktur (pino) dengan `requestId`; kata sandi, cookie, dan header otorisasi disensor.
- `GET /health` (liveness) dan `GET /health/ready` (cek koneksi PostgreSQL).
- Graceful shutdown: pada SIGTERM/SIGINT server berhenti menerima koneksi, menyelesaikan request berjalan, menunggu job, menutup pool DB.

## 10. Docker & produksi

```bash
cp .env.docker.example .env.docker      # isi POSTGRES_PASSWORD & rahasia (openssl rand -base64 48)
docker compose --env-file .env.docker up -d --build   # db → migrate (sekali) → api
docker compose run --rm -e ADMIN_EMAIL=anda@domain.com -e ADMIN_PASSWORD='…' api node dist/scripts/seed-admin.js
```

- `Dockerfile` multi-stage (build → runtime ramping, user non-root, `HEALTHCHECK`). Context build adalah **root repo**.
- Migrasi dijalankan service `migrate` sebelum `api` start; tidak ada migrasi otomatis di dalam proses API.
- Folder upload ada di volume `uploads`. Di production sajikan `/uploads/` langsung dari Nginx
  (lihat [`deploy/nginx.conf.example`](../../deploy/nginx.conf.example)); `SERVE_UPLOADS` default mati di production.
- Set `TRUST_PROXY=1` di belakang Nginx agar IP klien benar. Pasang TLS di Nginx/Cloudflare; cookie `Secure` mengharuskan HTTPS.
- Catatan: Dockerfile belum dijalankan di lingkungan pembuatan (tidak ada daemon Docker). Langkah-langkahnya (install, build,
  `pnpm deploy --prod`, migrasi, start, health check, shutdown) sudah diuji manual dengan urutan yang sama.

---

## 11. Integrasi dengan frontend

1. `apps/web/.env.local`:
   ```
   API_URL=http://localhost:4000                # tanpa /v1 — frontend menambahkan sendiri
   NEXT_PUBLIC_API_URL=http://localhost:4000    # dipakai form kontak dari browser
   REVALIDATE_SECRET=<sama dengan REVALIDATE_SECRET di apps/api/.env>
   NEXT_PUBLIC_MEDIA_HOST=<host yang menyajikan /uploads>
   ```
2. `REVALIDATE_URL` di API menunjuk ke `https://<situs>/api/revalidate`; header `x-revalidate-secret` dikirim otomatis.
3. **`next/image` dan media saat development:** `next.config.ts` hanya mengizinkan `https` dari `NEXT_PUBLIC_MEDIA_HOST`.
   Gambar yang di-upload ke `http://localhost:4000/uploads/...` akan ditolak `next/image`. Untuk dev tambahkan pola `http` + `localhost:4000`
   di `remotePatterns` (hanya saat `NODE_ENV !== "production"`), atau pakai `pnpm seed:demo` yang mengarah ke `/placeholders/*`.
4. Gambar publik berbentuk `{ id, url, alt, width, height }` dan `url` sudah absolut; variasi ukuran (sm/md/lg) tersedia di admin.
5. Form kontak: kirim `{ name, email, subject?, message }` (skema `contactSchema` di `@portfolio/shared`); field tersembunyi
   `website` harus kosong — bila terisi, API pura-pura sukses tetapi tidak menyimpan (honeypot).
6. Panel admin (belum dibuat) cukup memakai `fetch(..., { credentials: "include" })` ke `/v1/auth/*` dan `/v1/admin/*`
   dari origin yang terdaftar di `WEB_ORIGIN`. Bila API dan situs beda *site* (bukan sub-domain yang sama), `SameSite=Lax` tidak akan mengirim cookie
   lintas-site; letakkan keduanya di domain yang sama (mis. `example.com` dan `api.example.com`).

## 12. Asumsi, batasan & saran pengembangan

**Asumsi**
- Satu pemilik/admin; tidak ada registrasi publik, peran, atau multi-tenant.
- Satu instance API (cache, rate limit, dan job queue ada di memori proses).
- File disimpan di disk lokal VPS dan disajikan Nginx; URL media absolut dibentuk dari `MEDIA_PUBLIC_URL`.
- `yearsExperience` dihitung dari mulai pengalaman profesional paling awal (tipe `organization` tidak dihitung), dibulatkan ke bilangan bulat.
- Daftar publik memakai default `limit` besar karena data portfolio kecil; paginasi tetap tersedia lewat `page`/`limit`.
- Lupa sandi: tidak ada alur email; gunakan `seed:admin -- --reset-password` dari server.

**Batasan yang diketahui**
- Job in-memory hilang bila proses mati sebelum selesai (revalidate Next tetap ada fallback ISR 1 jam; email notifikasi bisa terlewat).
- Rate limit & cache tidak dibagi antar-instance.
- Tidak ada verifikasi malware untuk upload (hanya validasi tipe & re-encode gambar; PDF disimpan apa adanya setelah cek magic bytes & ukuran).
- Tidak ada audit log perubahan konten dan tidak ada antrean moderasi pesan kontak selain flag baca/belum.

**Bila perlu skala lebih besar:** pindahkan cache/rate limit ke Redis, job ke BullMQ/pg-boss, `Storage` ke S3-kompatibel
(antarmuka `Storage` sudah dipisah), dan jalankan beberapa instance di belakang load balancer (`TRUST_PROXY` disesuaikan).
