# Pembaruan Confession Board & Fitur Hubungi Ketua Kelas

Perubahan ini menyederhanakan tampilan catatan pada Confession Board agar langsung terbaca dan tampil sebagai catatan biasa saat dibuka, serta mengaktifkan formulir "Hubungi Ketua Kelas" dalam Bahasa Indonesia yang terhubung langsung ke database lengkap dengan Kotak Masuk untuk Admin.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan berikut telah disesuaikan berdasarkan konfirmasi Anda:

- **Tampilan Catatan Confession Board**: Penutup *"Secret Note / Tap to open"* dihapus sepenuhnya sehingga seluruh isi catatan langsung terlihat di papan utama.
- **Popup Catatan Biasa (Tanpa Unduh Story)**: Saat catatan diklik, popup tidak lagi menggunakan bingkai ala Instagram Story dan tombol *"Download Story"* dihapus. Sebagai gantinya, popup menampilkan kartu catatan Neo-Brutalist berukuran besar yang nyaman dibaca.
- **Penyimpanan & Kotak Masuk Ketua Kelas**: Formulir *"Contact the Class Rep"* diterjemahkan ke Bahasa Indonesia (*"Hubungi Ketua Kelas"*), menyimpan pesan secara nyata ke database Cloud Firestore, dan menyediakan panel **Kotak Masuk Ketua Kelas** khusus bagi Admin untuk membaca serta menghapus pesan yang masuk.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Memperbarui **Confession Board** agar setiap catatan tampil terbuka secara langsung dan ketika diklik menampilkan popup catatan reguler tanpa fitur unduh gambar.
  2. Mengubah bagian **Footer (Hubungi Ketua Kelas)** menjadi sistem pengiriman pesan fungsional berbahasa Indonesia yang tersimpan di database dan dapat dipantau oleh Admin secara *real-time*.
- **Target Audience / Persona**: Siswa kelas 12-B yang ingin membaca atau mengirim catatan di Confession Board, anggota kelas yang ingin menyampaikan pertanyaan/masukan ke Ketua Kelas, serta Admin/Ketua Kelas yang mengelola pesan masuk.
- **Key Value**: Pengalaman membaca catatan yang lebih cepat tanpa harus membuka satu per satu, serta saluran komunikasi langsung yang benar-benar berfungsi antara siswa dan pengurus kelas.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Membaca & Membuka Catatan Confession Board**:
     - Pengguna menggulir ke bagian Confession Board dan langsung melihat isi pesan, pengirim, penerima (*To*), dan lagu yang disematkan pada setiap kartu warna-warni.
     - Ketika pengguna mengklik salah satu catatan, sebuah modal catatan Neo-Brutalist terbuka dengan warna latar yang sesuai dengan catatan tersebut, menampilkan isi pesan secara jelas beserta detail waktu, lagu, dan pengirim, dilengkapi tombol tutup (`X`) di pojok kanan atas.
  2. **Mengirim Pesan ke Ketua Kelas**:
     - Pengguna menggulir ke bagian paling bawah halaman (*Hubungi Ketua Kelas*).
     - Pengguna mengisi **Nama Kamu**, **Email / Kontak**, dan **Tulis Pesanmu...**, lalu menekan tombol **Kirim Pesan**.
     - Pesan disimpan ke database, formulir dikosongkan, dan muncul notifikasi bahwa pesan berhasil dikirim ke Ketua Kelas.
  3. **Mengelola Kotak Masuk (Khusus Admin)**:
     - Saat Admin masuk (*login*), panel **Kotak Masuk Ketua Kelas** otomatis tampil di area Footer menampilkan daftar pesan yang masuk secara *real-time* (nama pengirim, kontak, waktu, dan isi pesan) beserta tombol hapus untuk membersihkan pesan yang sudah ditindaklanjuti.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Neo-Brutalist khas halaman kelas dengan garis tepi hitam tegas (`border-black`), bayangan tajam (`shadow-[4px_4px_0_0_#000]`), dan warna aksen cerah.
  - *Color Palette & Mood*: Mempertahankan palet warna catatan (`neo-yellow`, `neo-cyan`, `neo-green`, `neo-pink`, `neo-orange`, `neo-purple`, `neo-blue`, `neo-lime`, `neo-red`, `neo-mahogany`) di atas kanvas terang.
  - *Typography & Hierarchy*: Judul bagian menggunakan huruf tebal `Unbounded` (`font-black uppercase`) dan teks isi menggunakan `DM Sans` yang mudah dibaca.
- **Interactive Feedback & Motion**:
  - Animasi transisi halus saat membuka popup catatan, status tombol saat mengirim pesan (*"Mengirim..."*), serta pesan konfirmasi *toast* ketika pesan berhasil dikirim atau dihapus.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Menghapus Status "Revealed" Lokal & Mengganti Modal NGL Menjadi Modal Note Biasa**
  - *Chosen Approach*: Menghapus penyimpanan status buka catatan di memori lokal dan merender isi catatan secara langsung di grid maupun di dalam modal bergaya *sticky note* Neo-Brutalist.
  - *Why*: Memenuhi permintaan pengguna agar pengunjung dapat langsung membaca seluruh curhatan kelas sekaligus tetap bisa memperbesar catatan saat diklik tanpa kerumitan fitur unduh gambar Story.
  - *Alternatives Considered*: Membiarkan kartu tidak bisa diklik sama sekali; namun tetap menyediakan popup catatan biasa saat diklik membuat catatan yang panjang atau memiliki lampiran lagu lebih nyaman dilihat di layar ponsel.
- **Decision 2: Penyimpanan Pesan Ketua Kelas di Cloud Firestore**
  - *Chosen Approach*: Menyimpan setiap kiriman formulir ke koleksi khusus di Cloud Firestore dan menampilkannya secara langsung (*real-time*) pada panel Kotak Masuk khusus Admin.
  - *Why*: Memastikan tidak ada pesan siswa yang hilang (sebelumnya hanya simulasi) dan memudahkan Ketua Kelas/Admin memeriksa pesan langsung dari dalam aplikasi tanpa perlu berpindah platform.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Halaman Utama                              │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│           Confession Board            │ │   Footer (Hubungi Ketua Kelas)│
│ ───────────────────────────────────── │ │ ───────────────────────────── │
│ • Grid Catatan (Langsung Terbuka)     │ │ • Formulir Bahasa Indonesia   │
│ • Klik Catatan -> Modal Note Biasa    │ │ • Panel Kotak Masuk (Admin)   │
│   (Warna sesuai note, tanpa unduh)    │ │   (Baca & Hapus Pesan Masuk)  │
└───────────────────┬───────────────────┘ └───────────────┬───────────────┘
                    │                                     │
                    ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloud Firestore Database                        │
│ ─────────────────────────────────────────────────────────────────────── │
│ • Koleksi `messages` (Catatan Confession Board)                         │
│ • Koleksi `contact_messages` (Pesan Masuk untuk Ketua Kelas)            │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Entitas Pesan Ketua Kelas (`ContactMessage`)**:
    - `id`: Penanda unik dokumen
    - `name`: Nama pengirim (maksimal 100 karakter)
    - `email`: Email atau kontak pengirim (maksimal 100 karakter)
    - `message`: Isi pesan untuk Ketua Kelas (maksimal 1000 karakter)
    - `createdAt`: Waktu pengiriman (angka *timestamp*)
- **Interactive Component & State Mapping**:
  - **Confession Board**:
    - Menghapus state `revealedNotes` dan tampilan penutup *Secret Note*.
    - Mengubah aksi klik kartu untuk langsung mengisi state `selectedNote` dan membuka modal catatan biasa dengan latar warna sesuai properti `color` pada catatan.
  - **Footer (Hubungi Ketua Kelas)**:
    - Menambahkan state input terkontrol (`name`, `email`, `message`, `isSubmitting`).
    - Saat formulir dikirim, memvalidasi input dan menambahkan dokumen baru ke koleksi `contact_messages` di Firestore, lalu menampilkan umpan balik sukses.
    - Jika pengguna memiliki peran Admin (`isAdmin`), mengaktifkan pemantau *real-time* pada koleksi `contact_messages` untuk merender daftar pesan masuk beserta aksi hapus dokumen.
