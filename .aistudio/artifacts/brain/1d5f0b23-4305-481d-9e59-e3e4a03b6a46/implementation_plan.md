# Sistem Lagu Gaya Instagram Note pada Anggota (Roster)

Menerapkan konsep pemilih bagian lagu berdurasi penuh dan pemutar otomatis potongan 30 detik (seperti pada Confession Board Note) ke seluruh profil **Anggota (Roster)**, lengkap dengan animasi sampul album berkedip (`animate-pulse`) dan bar progres yang bergerak mulus (*smooth sliding*).

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh preferensi yang telah dikonfirmasi sebelumnya untuk Note diterapkan secara identik pada bagian Anggota:
> - **Sumber Lagu Penuh**: Menggunakan audio utuh dari YouTube (via YouTube IFrame Player API + pencarian otomatis `videoId`) sehingga *range slider* mencakup durasi penuh lagu dari awal sampai akhir.
> - **Durasi & Siklus Putar Saat Profil Anggota Dibuka**: Memutar potongan **30 detik secara berulang (looping)** mulai dari detik yang dipilih, serta menjeda musik latar web secara otomatis saat modal profil anggota dibuka dan melanjutkannya saat ditutup.
> - **Kompatibilitas Anggota Lama**: Untuk seluruh anggota yang sudah memiliki lagu tersimpan sebelumnya tanpa data detik mulai (`startTime`), lagu akan tetap otomatis diputar dari `0:00` (atau bagian yang diatur ulang oleh Admin melalui menu Edit Student).

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Modal Profil Anggota (`selectedStudent`)**:
     - Saat pengunjung mengklik kartu Polaroid anggota yang memiliki *Theme Song*, lagu anggota tersebut langsung diputar otomatis pada bagian detik yang dipilih selama 30 detik berulang.
     - Musik latar utama web dijeda otomatis (`note-audio-start`) ketika profil dibuka dan dilanjutkan kembali (`note-audio-stop`) ketika modal profil ditutup.
     - Menampilkan kartu pemutar lagu bergaya Neo-Brutalist dengan:
       - Foto sampul album yang berkedip lembut (`animate-pulse`) saat lagu berputar.
       - Tanpa badge `"Mulai 0:00"` agar tampilan bersih seperti pada Note.
       - Tombol **Ulangi Bagian Lagu** (`RotateCcw`) dan **Putar/Jeda** (`Play`/`Pause`).
       - Bar progres interaktif yang bergerak mulus (*smooth sliding* dengan interpolasi 50ms & `transition-[width] duration-75 ease-linear`) sekaligus memiliki efek `animate-pulse` saat lagu aktif.
  2. **Modal Pilih & Atur Lagu Anggota (Admin Add/Edit Student)**:
     - Saat Admin menambahkan atau mengedit lagu anggota di bagian **Anggota**, modal lampiran lagu menampilkan *configurator* yang sama persis dengan Confession Board:
       - Label **`MULAI BAGIAN LAGU`** dengan indikator rentang klip 30 detik (`0:00 - 0:30`).
       - *Range slider* yang mencakup **durasi lagu penuh** (dari `0:00` hingga akhir lagu).
       - Tombol tes putar untuk mendengarkan bagian lagu secara langsung dan tombol konfirmasi **`SIMPAN LAGU`**.
- **Target Audience / Persona**: Pengunjung web dan siswa Kelas 12B yang melihat profil teman sekelas mereka, serta Admin yang mengelola data anggota.
- **Key Value**: Pengalaman musik yang konsisten, ekspresif, dan mulus di seluruh halaman web—baik saat membuka Note maupun saat melihat kartu profil setiap anggota kelas.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Membuka Kartu Profil Anggota**:
     - Pengunjung mengklik salah satu kartu Polaroid di bagian **CHAPTER 01 — ANGGOTA**.
     - Modal profil terbuka dan langsung memutar potongan 30 detik lagu tema anggota tersebut dari detik yang telah disimpan.
     - Sampul album dan bar progres berkedip halus (`animate-pulse`), sementara isi bar progres bergeser mulus dari 0% ke 100% sepanjang potongan 30 detik.
  2. **Mengatur Bagian Lagu Anggota (Admin)**:
     - Admin mengklik tombol **Edit** pada kartu anggota (atau menambah anggota baru), lalu menekan tombol **Song** / **Atur Bagian**.
     - Admin mencari lagu, memilih lagu dari hasil pencarian, lalu menggeser slider **`MULAI BAGIAN LAGU`** di sepanjang durasi penuh lagu dan menekan **`SIMPAN LAGU`**.
- **Visual Identity & Theme**:
  - Mempertahankan estetika **Neo-Brutalist** (`border-2 border-black`, bayangan tegas `shadow-[4px_4px_0_0_#000]`, aksen `bg-neo-pink`, `bg-neo-cyan`, `bg-neo-green`, dan `bg-neo-yellow`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Kompatibilitas Otomatis untuk Semua Anggota yang Sudah Ada**
  - *Chosen Approach*: Jika data lagu anggota di Firestore hanya menyimpan `title`, `artist`, dan `coverUrl` (tanpa `videoId` atau `startTime`), sistem secara otomatis mencari `videoId` YouTube di latar belakang saat profil anggota dibuka dan memutar klip 30 detik mulai dari `startTime ?? 0`.
  - *Why*: Memastikan fitur langsung berfungsi untuk **semua anggota yang sudah ada** tanpa mengharuskan Admin mengedit ulang satu per satu, sembari tetap memungkinkan Admin mengatur detik spesifik kapan saja.
- **Decision 2: Interpolasi Waktu 50ms untuk Bar Progres Mulus**
  - *Chosen Approach*: Menggunakan interval 50ms dengan interpolasi waktu `performance.now()` di antara pembaruan waktu YouTube IFrame API, dipadukan dengan `transition-[width] duration-75 ease-linear`.
  - *Why*: Menghilangkan gerakan patah-patah pada bar progres saat lagu tema anggota diputar.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Anggota / Roster Section                         │
├────────────────────────────────────┬─────────────────────────────────────┤
│   Admin Song Configurator Modal    │       Student Profile Modal         │
│  ┌──────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │ Search Song (iTunes API)     │  │  │ Album Cover (animate-pulse)   │  │
│  │ Resolve Full Track Duration  │  │  │ Title & Artist (Clean Header) │  │
│  │ Span: "MULAI BAGIAN LAGU"    │  │  │ Controls: Replay & Play/Pause │  │
│  │ Full-Track Range Slider      │  │  │ Smooth 50ms Sliding Progress  │  │
│  │ Button: "SIMPAN LAGU"        │  │  │ Bar + animate-pulse           │  │
│  └──────────────┬───────────────┘  │  └───────────────┬───────────────┘  │
└─────────────────┼──────────────────┴──────────────────┼──────────────────┘
                  │                                     │
                  ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│            Full-Song Audio Engine (YouTube IFrame API + Fallback)        │
│  • Resolves videoId via /api/yt-search (with Piped API fallback)         │
│  • Plays & loops 30s window [startTime, startTime + 30s]                 │
│  • Dispatches 'note-audio-start' / 'note-audio-stop' to MusicPlayer      │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Memperluas tipe `Student.song` agar mendukung properti opsional yang sama dengan `Message.song`:
    - `title: string`
    - `artist: string`
    - `coverUrl: string`
    - `previewUrl?: string`
    - `videoId?: string`
    - `duration?: number`
    - `startTime?: number`
- **Interactive Component & State Mapping**:
  - Saat `selectedStudent` dibuka dan memiliki `song`, memicu event `note-audio-start` untuk menjeda musik latar web, memuat `videoId` pada *hidden YouTube player*, melompat ke `startTime ?? 0`, dan menjalankan loop 30 detik dengan bar progres mulus.
  - Saat `selectedStudent` ditutup, menghentikan pemutaran lagu profil dan memicu `note-audio-stop` agar musik latar web kembali berputar.
