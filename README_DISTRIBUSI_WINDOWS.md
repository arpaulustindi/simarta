# Panduan Distribusi & Build Installer Desktop Windows (SiMarta)

Aplikasi **SiMarta (Sistem Informasi GMIST Maranatha Tahuna)** adalah aplikasi desktop *offline standalone*. Panduan ini menjelaskan cara menghasilkan file **Installer Windows (`.exe` / `.msi`)** untuk didistribusikan ke komputer/laptop gereja.

---

## 🌟 CARA 1: Otomatisasi Build via GitHub Actions (Rekomendasi Utama)
*Anda tetap bekerja 100% di Ubuntu. Server GitHub akan mengompilasi dan menghasilkan file installer `.exe` Windows secara otomatis.*

### Langkah-langkah:
1. **Inisialisasi Git & Hubungkan ke Repositori GitHub** (Cukup lakukan sekali dari Ubuntu):
   ```bash
   git init
   git add .
   git commit -m "feat: inisialisasi simarta dan workflow build windows"
   git branch -M main
   git remote add origin https://github.com/USERNAME-ANDA/simarta.git
   git push -u origin main
   ```

2. **Jalankan Build Otomatis di GitHub**:
   - Buka repositori Anda di web browser: `https://github.com/USERNAME-ANDA/simarta`
   - Klik tab **Actions** di bagian atas.
   - Di bilah kiri, klik workflow **"Build Installer Desktop Windows"**.
   - Klik tombol **Run workflow** (sebelah kanan) > pilih branch `main` > klik **Run workflow**.

3. **Unduh (*Download*) Installer Windows**:
   - Tunggu proses build selesai (~3 sampai 5 menit, hingga muncul centang hijau).
   - Klik hasil build tersebut.
   - Gulir ke bagian **Artifacts** di bawah halaman.
   - Unduh file **`SiMarta-Windows-Setup-Installer.zip`**.
   - Di dalam zip tersebut terdapat file installer resmi:
     - `SiMarta_1.0.0_x64-setup.exe` (Installer NSIS standar)
     - `SiMarta_1.0.0_x64_en-US.msi` (Paket MSI Windows)
     - `simarta.exe` (Portable executable)

> [!TIP]
> **Rilis Resmi Otomatis**: Jika Anda membuat tag versi dari Ubuntu (misal: `git tag v1.0.0 && git push origin v1.0.0`), GitHub Actions akan otomatis membuat halaman **GitHub Release** resmi lengkap dengan tautan unduhan langsung file `.exe` dan catatan rilis.

---

## 💻 CARA 2: Build Langsung di Komputer/Laptop Windows
*Gunakan cara ini jika Anda atau rekan di gereja memiliki satu laptop ber-OS Windows.*

### Prasyarat di Windows (Hanya Perlu Diinstal Sekali):
1. **Node.js LTS**: Unduh dari [https://nodejs.org/](https://nodejs.org/)
2. **Rust**: Unduh dari [https://rustup.rs/](https://rustup.rs/) (pilih default toolchain MSVC)
3. **Visual Studio C++ Build Tools**: Pilih komponen *"Desktop development with C++"* saat instalasi Visual Studio Installer.

### Langkah Build (Cukup 1 Klik):
1. Salin (*copy*) seluruh folder proyek `simarta` ini ke laptop Windows (bisa via flashdisk atau zip).
2. Di dalam folder `simarta`, klik dua kali file:
   ```
   build-windows.bat
   ```
3. Script otomatis akan menginstal dependensi frontend, mengompilasi biner native Windows, dan membungkus installer setup.
4. Setelah selesai, folder berisi installer akan otomatis terbuka:
   - `src-tauri\target\release\bundle\nsis\SiMarta_1.0.0_x64-setup.exe`

---

## 📦 Petunjuk Pemasangan di Komputer Gereja

1. Salin file `SiMarta_1.0.0_x64-setup.exe` ke komputer gereja (melalui flashdisk).
2. Klik dua kali file `SiMarta_1.0.0_x64-setup.exe`.
3. Ikuti panduan wizard instalasi (*Next > Install > Finish*).
4. Pintasan (*shortcut*) **SiMarta** akan otomatis muncul di **Desktop** dan **Start Menu**.
5. Aplikasi langsung berjalan offline tanpa membutuhkan koneksi internet atau server eksternal. Database SQLite akan tersimpan otomatis di:
   ```
   C:\Users\<NamaUser>\AppData\Roaming\com.gmist.simarta\simarta.db
   ```
