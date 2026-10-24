import { AuthUser, DashboardSummary, PelkaRecommendation } from "@/types";
import { calculatePelkaRecommendation } from "@/lib/pelka";

// Check if running inside Tauri webview
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// Helper to camelCase a snake_case string
function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

// Helper to snake_case a camelCase string
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Safe invoke wrapper
export async function invokeCommand<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  // Normalize top-level args so both camelCase and snake_case versions exist
  const normalizedArgs: Record<string, unknown> = { ...args };
  for (const [key, val] of Object.entries(args)) {
    const camel = toCamelCase(key);
    const snake = toSnakeCase(key);
    if (!(camel in normalizedArgs)) normalizedArgs[camel] = val;
    if (!(snake in normalizedArgs)) normalizedArgs[snake] = val;
  }

  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, normalizedArgs);
  }

  // Graceful browser fallback for UI development and preview
  return mockInvoke<T>(cmd, normalizedArgs);
}

// Browser Mock State for pure web preview / testing
const MOCK_STORAGE_KEY_USERS = "simarta_mock_users";
const MOCK_STORAGE_KEY_SESSION = "simarta_mock_session";
const MOCK_STORAGE_KEY_JEMAAT = "simarta_mock_jemaat";
const MOCK_STORAGE_KEY_KELUARGA = "simarta_mock_keluarga";
const MOCK_STORAGE_KEY_JABATAN = "simarta_mock_jabatan_pejabat";
const MOCK_STORAGE_KEY_PERISTIWA = "simarta_mock_peristiwa_gerejawi";
const MOCK_STORAGE_KEY_ATESTASI = "simarta_mock_atestasi";
const MOCK_STORAGE_KEY_KEMATIAN = "simarta_mock_kematian";
const MOCK_STORAGE_KEY_AUDIT = "simarta_mock_audit_logs";
const MOCK_STORAGE_KEY_BACKUPS = "simarta_mock_backups";

export const MOCK_PELKA = [
  { id: "pelka-anak", kode: "ANAK", nama: "Pelayanan Kategorial Anak" },
  { id: "pelka-remaja", kode: "REMAJA", nama: "Pelayanan Kategorial Remaja" },
  { id: "pelka-pemuda", kode: "PEMUDA", nama: "Pelayanan Kategorial Pemuda" },
  { id: "pelka-bapak", kode: "BAPAK", nama: "Pelayanan Kategorial Pria Kaum Bapa (PKB)" },
  { id: "pelka-ibu", kode: "IBU", nama: "Pelayanan Kategorial Wanita Kaum Ibu (WKI)" },
  { id: "pelka-lansia", kode: "LANSIA", nama: "Pelayanan Kategorial Lanjut Usia" },
];

export const MOCK_KELOMPOK = Array.from({ length: 12 }, (_, i) => ({
  id: `kelompok-${i + 1}`,
  nomor: String(i + 1).padStart(2, "0"),
  nama: `Kelompok ${i + 1}`,
  deskripsi: `Kelompok Ibadah Wilayah ${i + 1} GMIST Maranatha Tahuna`,
}));

export const MOCK_JABATAN = [
  { id: "jab-1", nama_jabatan: "Penatua", jenis: "FUNGSIONAL" as const, deskripsi: "Pelayan Khusus fungsional Penatua GMIST", is_active: true },
  { id: "jab-2", nama_jabatan: "Diaken", jenis: "FUNGSIONAL" as const, deskripsi: "Pelayan Khusus fungsional Diaken GMIST", is_active: true },
  { id: "jab-3", nama_jabatan: "Ketua Pelka", jenis: "STRUKTURAL" as const, deskripsi: "Pengurus Badan Pengurus Pelka", is_active: true },
  { id: "jab-4", nama_jabatan: "Wakil Ketua Pelka", jenis: "STRUKTURAL" as const, deskripsi: "Pengurus Badan Pengurus Pelka", is_active: true },
  { id: "jab-5", nama_jabatan: "Sekretaris Pelka", jenis: "STRUKTURAL" as const, deskripsi: "Pengurus Badan Pengurus Pelka", is_active: true },
  { id: "jab-6", nama_jabatan: "Bendahara Pelka", jenis: "STRUKTURAL" as const, deskripsi: "Pengurus Badan Pengurus Pelka", is_active: true },
  { id: "jab-7", nama_jabatan: "Koordinator Kelompok", jenis: "STRUKTURAL" as const, deskripsi: "Pengurus Pelayanan Wilayah Kelompok", is_active: true },
  { id: "jab-8", nama_jabatan: "Ketua Kelompok", jenis: "STRUKTURAL" as const, deskripsi: "Ketua Rukun/Kelompok Ibadah", is_active: true },
];

const INITIAL_MOCK_PEJABAT = [
  {
    id: "rj-1",
    jemaat_id: "j-3",
    nomor_anggota: "JM-2026-0003",
    nama_lengkap: "Marten Gaghana",
    jenis_kelamin: "L",
    jabatan_id: "jab-1",
    nama_jabatan: "Penatua",
    jenis_jabatan: "FUNGSIONAL",
    lingkup: "JEMAAT",
    tanggal_pengangkatan: "2024-01-01",
    keterangan: "SK Pelayan Khusus Periode 2024-2028",
  },
  {
    id: "rj-2",
    jemaat_id: "j-2",
    nomor_anggota: "JM-2026-0002",
    nama_lengkap: "Debora Sasundu",
    jenis_kelamin: "P",
    jabatan_id: "jab-2",
    nama_jabatan: "Diaken",
    jenis_jabatan: "FUNGSIONAL",
    lingkup: "KELOMPOK",
    kelompok_id: "kelompok-1",
    nama_kelompok: "Kelompok 01",
    tanggal_pengangkatan: "2024-01-01",
    keterangan: "Pelayan Khusus Diaken Wilayah Kelompok 01",
  },
  {
    id: "rj-3",
    jemaat_id: "j-1",
    nomor_anggota: "JM-2026-0001",
    nama_lengkap: "Jonathan Tatengkeng",
    jenis_kelamin: "L",
    jabatan_id: "jab-3",
    nama_jabatan: "Ketua Pelka",
    jenis_jabatan: "STRUKTURAL",
    lingkup: "PELKA",
    pelka_id: "pelka-pemuda",
    nama_pelka: "Pelayanan Kategorial Pemuda",
    tanggal_pengangkatan: "2025-02-15",
    keterangan: "Ketua Badan Pengurus Pelka Pemuda",
  },
];

const INITIAL_MOCK_PERISTIWA = [
  {
    id: "pg-1",
    jemaat_id: "j-1",
    nomor_anggota: "JM-2026-0001",
    nama_lengkap: "Jonathan Tatengkeng",
    jenis_kelamin: "L",
    jenis_peristiwa: "BAPTIS",
    tanggal_peristiwa: "1994-08-10",
    tempat: "GMIST Maranatha Tahuna",
    pelayan_firman: "Pdt. M. Sasundu, M.Th",
    nomor_surat: "BAP/1994/082",
    keterangan: "Baptis Kudus Anak",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "pg-2",
    jemaat_id: "j-1",
    nomor_anggota: "JM-2026-0001",
    nama_lengkap: "Jonathan Tatengkeng",
    jenis_kelamin: "L",
    jenis_peristiwa: "SIDI",
    tanggal_peristiwa: "2012-04-08",
    tempat: "GMIST Maranatha Tahuna",
    pelayan_firman: "Pdt. J. Gaghana, S.Th",
    nomor_surat: "SIDI/2012/015",
    keterangan: "Peneguhan Sidi Remaja-Pemuda",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "pg-3",
    jemaat_id: "j-2",
    nomor_anggota: "JM-2026-0002",
    nama_lengkap: "Debora Sasundu",
    jenis_kelamin: "P",
    jenis_peristiwa: "PERKAWINAN",
    tanggal_peristiwa: "1988-06-18",
    tempat: "GMIST Maranatha Tahuna",
    pelayan_firman: "Pdt. E. Tatengkeng, S.Th",
    nomor_surat: "NIK/1988/024",
    keterangan: "Pernikahan Kudus dengan Marten Gaghana",
    created_at: "2026-01-01T08:00:00Z",
  },
];

const INITIAL_MOCK_ATESTASI = [
  {
    id: "at-1",
    jemaat_id: "j-3",
    nomor_anggota: "JM-2026-0003",
    nama_lengkap: "Marten Gaghana",
    jenis_kelamin: "L",
    status_sebelumnya: "NONAKTIF",
    status_baru: "AKTIF",
    tanggal_perubahan: "2015-09-12",
    alasan: "Pindah masuk domisili keluarga",
    jemaat_tujuan_asal: "GMIST Imanuel Ondong",
    nomor_surat: "AT-M/2015/012",
    created_at: "2026-01-01T08:00:00Z",
  },
];

const INITIAL_MOCK_KEMATIAN = [
  {
    id: "km-1",
    jemaat_id: "j-rip-1",
    nomor_anggota: "JM-2024-0099",
    nama_lengkap: "Petrus Tatengkeng",
    jenis_kelamin: "L",
    tanggal_lahir: "1940-03-12",
    tanggal_meninggal: "2025-11-20",
    tempat_meninggal: "RSUD Liun Kendage Tahuna",
    tempat_pemakaman: "TPU Kolongan Akembawi",
    pelayan_pemakaman: "Pdt. M. Sasundu, M.Th",
    nomor_surat_kematian: "SKM/2025/088",
    keterangan: "Tutup usia 85 tahun dalam damai sejahtera",
    created_at: "2025-11-21T09:00:00Z",
  },
];


const INITIAL_MOCK_JEMAAT = [
  {
    id: "j-1",
    nomor_anggota: "JM-2026-0001",
    nik: "7103011505940001",
    nama_lengkap: "Jonathan Tatengkeng",
    tempat_lahir: "Tahuna",
    tanggal_lahir: "1994-05-15",
    jenis_kelamin: "L" as const,
    status_perkawinan: "BELUM_MENIKAH" as const,
    status_keanggotaan: "AKTIF" as const,
    pelka_id: "pelka-pemuda",
    nama_pelka: "Pelayanan Kategorial Pemuda",
    kode_pelka: "PEMUDA",
    kelompok_id: "kelompok-3",
    nama_kelompok: "Kelompok 03",
    nomor_telepon: "081234567890",
    alamat: "Jl. Tidore No. 12, Kel. Sawang Bendar",
    is_archived: false,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
    riwayat_kelompok: [],
    riwayat_gerejawi: [
      { id: "rg-1", jenis_peristiwa: "BAPTIS", tanggal_peristiwa: "1994-08-10", tempat: "GMIST Maranatha Tahuna" },
      { id: "rg-2", jenis_peristiwa: "SIDI", tanggal_peristiwa: "2012-04-08", tempat: "GMIST Maranatha Tahuna" },
    ],
  },
  {
    id: "j-2",
    nomor_anggota: "JM-2026-0002",
    nik: "7103016610640002",
    nama_lengkap: "Debora Sasundu",
    tempat_lahir: "Manado",
    tanggal_lahir: "1964-10-26",
    jenis_kelamin: "P" as const,
    status_perkawinan: "MENIKAH" as const,
    tanggal_menikah: "1988-06-18",
    status_keanggotaan: "AKTIF" as const,
    pelka_id: "pelka-lansia",
    nama_pelka: "Pelayanan Kategorial Lanjut Usia",
    kode_pelka: "LANSIA",
    kelompok_id: "kelompok-1",
    nama_kelompok: "Kelompok 01",
    nomor_telepon: "082198765432",
    alamat: "Kompleks Maranatha, Tahuna",
    is_archived: false,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
    riwayat_kelompok: [],
    riwayat_gerejawi: [
      { id: "rg-3", jenis_peristiwa: "SIDI", tanggal_peristiwa: "1982-04-11", tempat: "GMIST Maranatha Tahuna" },
      { id: "rg-4", jenis_peristiwa: "PERKAWINAN", tanggal_peristiwa: "1988-06-18", tempat: "GMIST Maranatha Tahuna" },
    ],
  },
  {
    id: "j-3",
    nomor_anggota: "JM-2026-0003",
    nik: "7103011003880003",
    nama_lengkap: "Marten Gaghana",
    tempat_lahir: "Tahuna",
    tanggal_lahir: "1988-10-28",
    jenis_kelamin: "L" as const,
    status_perkawinan: "MENIKAH" as const,
    tanggal_menikah: "2015-09-12",
    status_keanggotaan: "AKTIF" as const,
    pelka_id: "pelka-bapak",
    nama_pelka: "Pelayanan Kategorial Pria Kaum Bapa (PKB)",
    kode_pelka: "BAPAK",
    kelompok_id: "kelompok-5",
    nama_kelompok: "Kelompok 05",
    nomor_telepon: "085311223344",
    alamat: "Jl. Baru Kolongan, Tahuna",
    is_archived: false,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
    riwayat_kelompok: [],
    riwayat_gerejawi: [],
  },
];

const INITIAL_MOCK_KELUARGA = [
  {
    id: "k-1",
    nomor_keluarga: "KK-2026-0001",
    nama_keluarga: "Gaghana - Sasundu",
    kepala_keluarga_id: "j-3",
    kepala_keluarga_nama: "Marten Gaghana",
    jumlah_anggota: 2,
    status: "AKTIF",
    alamat: "Jl. Baru Kolongan, Tahuna",
    catatan: "Keluarga diberkati di GMIST Maranatha Tahuna",
    tanggal_pembentukan: "2015-09-12",
    created_at: "2026-01-01T08:00:00Z",
    updated_at: "2026-01-01T08:00:00Z",
    anggota: [
      {
        id: "ak-1",
        keluarga_id: "k-1",
        jemaat_id: "j-3",
        nomor_anggota: "JM-2026-0003",
        nama_lengkap: "Marten Gaghana",
        jenis_kelamin: "L",
        tanggal_lahir: "1988-10-28",
        status_perkawinan: "MENIKAH",
        hubungan_keluarga: "KEPALA_KELUARGA",
        nama_pelka: "Pelayanan Kategorial Pria Kaum Bapa (PKB)",
        nama_kelompok: "Kelompok 05",
        tanggal_mulai: "2015-09-12",
      },
      {
        id: "ak-2",
        keluarga_id: "k-1",
        jemaat_id: "j-2",
        nomor_anggota: "JM-2026-0002",
        nama_lengkap: "Debora Sasundu",
        jenis_kelamin: "P",
        tanggal_lahir: "1964-10-26",
        status_perkawinan: "MENIKAH",
        hubungan_keluarga: "ORANG_TUA",
        nama_pelka: "Pelayanan Kategorial Lanjut Usia",
        nama_kelompok: "Kelompok 01",
        tanggal_mulai: "2015-09-12",
      },
    ],
  },
];

function getMockUsers(): Array<{ id: string; username: string; password_hash: string; role: 'ADMIN' | 'OPERATOR'; full_name: string; is_active: boolean }> {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_USERS);
  if (stored) {
    try { return JSON.parse(stored); } catch { return []; }
  }
  return [];
}

function saveMockUsers(users: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_USERS, JSON.stringify(users));
  }
}

function getMockJemaat(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_JEMAAT;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_JEMAAT);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_JEMAAT; }
  }
  return INITIAL_MOCK_JEMAAT;
}

function saveMockJemaat(jemaat: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_JEMAAT, JSON.stringify(jemaat));
  }
}

function getMockKeluarga(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_KELUARGA;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_KELUARGA);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_KELUARGA; }
  }
  return INITIAL_MOCK_KELUARGA;
}

function saveMockKeluarga(keluarga: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_KELUARGA, JSON.stringify(keluarga));
  }
}

function getMockPejabat(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_PEJABAT;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_JABATAN);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_PEJABAT; }
  }
  return INITIAL_MOCK_PEJABAT;
}

function saveMockPejabat(pejabat: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_JABATAN, JSON.stringify(pejabat));
  }
}

function getMockPeristiwa(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_PERISTIWA;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_PERISTIWA);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_PERISTIWA; }
  }
  return INITIAL_MOCK_PERISTIWA;
}

function saveMockPeristiwa(items: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_PERISTIWA, JSON.stringify(items));
  }
}

function getMockAtestasi(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_ATESTASI;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_ATESTASI);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_ATESTASI; }
  }
  return INITIAL_MOCK_ATESTASI;
}

function saveMockAtestasi(items: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_ATESTASI, JSON.stringify(items));
  }
}

function getMockKematian(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_KEMATIAN;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_KEMATIAN);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_KEMATIAN; }
  }
  return INITIAL_MOCK_KEMATIAN;
}

function saveMockKematian(items: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_KEMATIAN, JSON.stringify(items));
  }
}

const INITIAL_MOCK_AUDIT = [
  {
    id: "aud-1",
    user_id: "u-admin",
    username: "admin",
    role: "ADMIN",
    action: "CREATE",
    entity: "users",
    entity_id: "u-admin",
    summary: "Inisialisasi akun Administrator utama",
    timestamp: "2026-01-01T08:00:00Z",
  },
  {
    id: "aud-2",
    user_id: "u-admin",
    username: "admin",
    role: "ADMIN",
    action: "CREATE",
    entity: "jemaat",
    entity_id: "j-1",
    summary: "Pendaftaran jemaat baru: Jonathan Tatengkeng",
    timestamp: "2026-01-01T08:30:00Z",
  },
  {
    id: "aud-3",
    user_id: "u-admin",
    username: "admin",
    role: "ADMIN",
    action: "BACKUP",
    entity: "database",
    summary: "Pembuatan cadangan database otomatis",
    timestamp: "2026-01-02T00:00:00Z",
  },
];

function getMockAudit(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_AUDIT;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_AUDIT);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_AUDIT; }
  }
  return INITIAL_MOCK_AUDIT;
}

function saveMockAudit(items: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_AUDIT, JSON.stringify(items));
  }
}

function logMockAuditEntry(entry: {
  user_id?: string;
  username: string;
  role: string;
  action: string;
  entity: string;
  entity_id?: string;
  summary: string;
  reason?: string;
  old_data?: string;
  new_data?: string;
}) {
  const audits = getMockAudit();
  audits.unshift({
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...entry,
    timestamp: new Date().toISOString(),
  });
  saveMockAudit(audits);
}

const INITIAL_MOCK_BACKUPS = [
  {
    file_name: "simarta_backup_20260102_000000.db",
    file_path: "/data/simarta/backups/simarta_backup_20260102_000000.db",
    file_size_bytes: 491520,
    created_at: "2026-01-02T00:00:00Z",
  },
];

function getMockBackups(): any[] {
  if (typeof window === "undefined") return INITIAL_MOCK_BACKUPS;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_BACKUPS);
  if (stored) {
    try { return JSON.parse(stored); } catch { return INITIAL_MOCK_BACKUPS; }
  }
  return INITIAL_MOCK_BACKUPS;
}

function saveMockBackups(items: unknown) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY_BACKUPS, JSON.stringify(items));
  }
}

function getMockCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY_SESSION);
  if (!stored) return null;
  try {
    return JSON.parse(stored).user || null;
  } catch {
    return null;
  }
}

async function mockInvoke<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 80)); // Simulate IPC delay

  switch (cmd) {
    case "check_needs_setup": {
      const users = getMockUsers();
      const hasAdmin = users.some((u) => u.role === "ADMIN" && u.is_active);
      return (!hasAdmin) as unknown as T;
    }

    case "setup_initial_admin": {
      const users = getMockUsers();
      const username = (args.username as string).trim();
      const password = args.password as string;
      const fullName = (args.fullName as string || args.full_name as string).trim();

      const newUser = {
        id: "mock-admin-uuid",
        username,
        password_hash: password,
        role: "ADMIN" as const,
        full_name: fullName,
        is_active: true,
      };
      users.push(newUser);
      saveMockUsers(users);

      const session = { token: "mock-token-admin", user: newUser };
      localStorage.setItem(MOCK_STORAGE_KEY_SESSION, JSON.stringify(session));
      return session as unknown as T;
    }

    case "login": {
      const users = getMockUsers();
      const username = (args.username as string).trim();
      const password = args.password as string;

      const found = users.find((u) => u.username === username && u.password_hash === password);
      if (!found) {
        throw new Error("Username atau kata sandi salah");
      }
      if (!found.is_active) {
        throw new Error("Akun ini telah dinonaktifkan");
      }

      const session = {
        token: `mock-token-${found.role.toLowerCase()}`,
        user: {
          id: found.id,
          username: found.username,
          role: found.role,
          full_name: found.full_name,
          is_active: found.is_active,
        },
      };
      localStorage.setItem(MOCK_STORAGE_KEY_SESSION, JSON.stringify(session));
      return session as unknown as T;
    }

    case "logout": {
      localStorage.removeItem(MOCK_STORAGE_KEY_SESSION);
      return undefined as unknown as T;
    }

    case "get_current_user": {
      const stored = localStorage.getItem(MOCK_STORAGE_KEY_SESSION);
      if (!stored) throw new Error("UNAUTHORIZED");
      const session = JSON.parse(stored);
      return session.user as unknown as T;
    }

    case "list_users": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengelola akun pengguna");
      }
      const users = getMockUsers();
      return users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        full_name: u.full_name,
        is_active: u.is_active,
      })) as unknown as T;
    }

    case "create_user": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak membuat akun pengguna");
      }
      const username = String(args.username).trim();
      const password = String(args.password);
      const role = String(args.role).trim().toUpperCase();
      const fullName = String(args.full_name || args.fullName).trim();

      if (username.length < 3) throw new Error("Username minimal 3 karakter");
      if (password.length < 8) throw new Error("Password minimal 8 karakter");
      if (role !== "ADMIN" && role !== "OPERATOR") throw new Error("Role tidak valid (pilih ADMIN atau OPERATOR)");

      const users = getMockUsers();
      if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error("Username sudah digunakan");
      }

      const newUser = {
        id: `user-${Date.now()}`,
        username,
        password_hash: `hash_${password}`,
        role: role as "ADMIN" | "OPERATOR",
        full_name: fullName,
        is_active: true,
      };

      users.push(newUser);
      saveMockUsers(users);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "CREATE",
        entity: "users",
        entity_id: newUser.id,
        summary: `Membuat akun pengguna baru: ${username} (${role})`,
      });

      return {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        full_name: newUser.full_name,
        is_active: newUser.is_active,
      } as unknown as T;
    }

    case "get_dashboard_summary": {
      const summary: DashboardSummary = {
        total_jemaat_aktif: 1420,
        total_keluarga_aktif: 368,
        total_kelompok: 12,
        pelka_distribution: [
          { label: "Pelka Anak", count: 285 },
          { label: "Pelka Remaja", count: 172 },
          { label: "Pelka Pemuda", count: 310 },
          { label: "Pelka Bapak (PKB)", count: 295 },
          { label: "Pelka Ibu (WKI)", count: 318 },
          { label: "Pelka Lansia", count: 40 },
        ],
        kelompok_distribution: [
          { label: "Kelompok 01", count: 124 },
          { label: "Kelompok 02", count: 118 },
          { label: "Kelompok 03", count: 130 },
          { label: "Kelompok 04", count: 112 },
          { label: "Kelompok 05", count: 120 },
          { label: "Kelompok 06", count: 115 },
          { label: "Kelompok 07", count: 119 },
          { label: "Kelompok 08", count: 110 },
          { label: "Kelompok 09", count: 122 },
          { label: "Kelompok 10", count: 114 },
          { label: "Kelompok 11", count: 116 },
          { label: "Kelompok 12", count: 120 },
        ],
        upcoming_birthdays: [
          {
            jemaat_id: "j-1",
            nama_lengkap: "Jonathan Tatengkeng",
            tanggal_lahir: "1994-10-24",
            usia_akan_dicapai: 32,
            hari_lagi: 1,
            pelka: "Pelka Pemuda",
            kelompok: "Kelompok 03",
            nomor_telepon: "081234567890",
          },
          {
            jemaat_id: "j-2",
            nama_lengkap: "Debora Sasundu",
            tanggal_lahir: "1964-10-26",
            usia_akan_dicapai: 62,
            hari_lagi: 3,
            pelka: "Pelka Lansia",
            kelompok: "Kelompok 01",
            nomor_telepon: "082198765432",
          },
          {
            jemaat_id: "j-3",
            nama_lengkap: "Marten Gaghana",
            tanggal_lahir: "1988-10-28",
            usia_akan_dicapai: 38,
            hari_lagi: 5,
            pelka: "Pelka Bapak",
            kelompok: "Kelompok 05",
            nomor_telepon: "085311223344",
          },
        ],
        pending_pelka_reviews: 14,
        recent_audits: [
          {
            id: "a-1",
            username: "admin_maranatha",
            role: "ADMIN",
            action: "LOGIN",
            entity: "users",
            summary: "Pengguna berhasil login",
            timestamp: new Date().toISOString(),
          },
          {
            id: "a-2",
            username: "admin_maranatha",
            role: "ADMIN",
            action: "CREATE",
            entity: "jemaat",
            summary: "Pendaftaran anggota jemaat baru: Jonathan Tatengkeng",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      };
      return summary as unknown as T;
    }

    case "get_pelka_recommendation": {
      const birthDate = (args.birthDate as string || args.birth_date as string || "").trim();
      const gender = (args.gender as string || "").trim();
      const maritalStatus = (args.maritalStatus as string || args.marital_status as string || "").trim();
      return calculatePelkaRecommendation(birthDate, gender, maritalStatus) as unknown as T;
    }

    case "get_jemaat_form_options": {
      return {
        pelka_options: MOCK_PELKA.map((p) => ({ id: p.id, label: p.nama, code: p.kode })),
        kelompok_options: MOCK_KELOMPOK.map((k) => ({ id: k.id, label: k.nama, code: k.nomor })),
      } as unknown as T;
    }

    case "search_jemaat_brief": {
      const query = ((args.query as string) || "").trim().toLowerCase();
      const jemaatList = getMockJemaat();
      const results = jemaatList
        .filter((j) => !j.is_archived && (
          j.nama_lengkap.toLowerCase().includes(query) ||
          j.nomor_anggota.toLowerCase().includes(query) ||
          (j.nik && j.nik.includes(query))
        ))
        .slice(0, 20)
        .map((j) => ({
          id: j.id,
          nomor_anggota: j.nomor_anggota,
          nama_lengkap: j.nama_lengkap,
          jenis_kelamin: j.jenis_kelamin,
          tanggal_lahir: j.tanggal_lahir,
          nama_pelka: j.nama_pelka,
          nama_kelompok: j.nama_kelompok,
        }));
      return results as unknown as T;
    }

    case "check_jemaat_duplicate": {
      const nik = (args.nik as string | undefined)?.trim();
      const nama = ((args.namaLengkap as string || args.nama_lengkap as string) || "").trim().toLowerCase();
      const tglLahir = ((args.tanggalLahir as string || args.tanggal_lahir as string) || "").trim();
      const excludeId = args.excludeId as string | undefined || args.exclude_id as string | undefined;

      const jemaatList = getMockJemaat();

      // Check NIK
      if (nik) {
        const foundNik = jemaatList.find((j) => !j.is_archived && j.nik === nik && j.id !== excludeId);
        if (foundNik) {
          return {
            is_duplicate: true,
            duplicate_reason: `NIK '${nik}' sudah terdaftar atas nama: ${foundNik.nama_lengkap}`,
            existing_id: foundNik.id,
            existing_name: foundNik.nama_lengkap,
          } as unknown as T;
        }
      }

      // Check Name + DOB
      const foundName = jemaatList.find(
        (j) => !j.is_archived && j.nama_lengkap.toLowerCase() === nama && j.tanggal_lahir === tglLahir && j.id !== excludeId
      );
      if (foundName) {
        return {
          is_duplicate: true,
          duplicate_reason: `Terdapat jemaat aktif dengan nama serupa dan tanggal lahir sama: ${foundName.nama_lengkap} (${tglLahir})`,
          existing_id: foundName.id,
          existing_name: foundName.nama_lengkap,
        } as unknown as T;
      }

      return {
        is_duplicate: false,
        duplicate_reason: undefined,
        existing_id: undefined,
        existing_name: undefined,
      } as unknown as T;
    }

    case "list_jemaat": {
      const filter = (args.filter as Record<string, unknown>) || {};
      const search = (filter.search as string | undefined)?.trim().toLowerCase();
      const pelkaId = filter.pelka_id as string | undefined;
      const kelompokId = filter.kelompok_id as string | undefined;
      const statusKeanggotaan = filter.status_keanggotaan as string | undefined;
      const jenisKelamin = filter.jenis_kelamin as string | undefined;
      const statusPerkawinan = filter.status_perkawinan as string | undefined;
      const includeArchived = Boolean(filter.include_archived);
      const page = Number(filter.page || 1);
      const pageSize = Number(filter.page_size || 15);

      let items = getMockJemaat();
      if (!includeArchived) {
        items = items.filter((j) => !j.is_archived);
      }
      if (search) {
        items = items.filter(
          (j) =>
            j.nama_lengkap.toLowerCase().includes(search) ||
            j.nomor_anggota.toLowerCase().includes(search) ||
            (j.nik && j.nik.includes(search))
        );
      }
      if (pelkaId) items = items.filter((j) => j.pelka_id === pelkaId);
      if (kelompokId) items = items.filter((j) => j.kelompok_id === kelompokId);
      if (statusKeanggotaan) items = items.filter((j) => j.status_keanggotaan === statusKeanggotaan);
      if (jenisKelamin) items = items.filter((j) => j.jenis_kelamin === jenisKelamin);
      if (statusPerkawinan) items = items.filter((j) => j.status_perkawinan === statusPerkawinan);

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const pagedItems = items.slice(offset, offset + pageSize).map((j) => ({
        ...j,
        pelka_recommendation: calculatePelkaRecommendation(j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan),
      }));

      return {
        items: pagedItems,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
      } as unknown as T;
    }

    case "get_jemaat_detail": {
      const id = args.id as string;
      const jemaatList = getMockJemaat();
      const found = jemaatList.find((j) => j.id === id);
      if (!found) throw new Error("Data jemaat tidak ditemukan");

      const rec = calculatePelkaRecommendation(found.tanggal_lahir, found.jenis_kelamin, found.status_perkawinan);
      const detail = {
        ...found,
        pelka_recommendation: rec,
        keluarga: found.keluarga,
        riwayat_kelompok: found.riwayat_kelompok || [],
        riwayat_gerejawi: found.riwayat_gerejawi || [],
      };
      return detail as unknown as T;
    }

    case "create_jemaat": {
      const input = (args.input as Record<string, unknown>) || {};
      const jemaatList = getMockJemaat();
      const nama = ((input.nama_lengkap as string) || "").trim();
      const tglLahir = ((input.tanggal_lahir as string) || "").trim();
      if (!nama) throw new Error("Nama lengkap jemaat wajib diisi");
      if (!tglLahir) throw new Error("Tanggal lahir jemaat wajib diisi");

      const newId = `j-${Date.now()}`;
      const pelka = MOCK_PELKA.find((p) => p.id === input.pelka_id);
      const kelompok = MOCK_KELOMPOK.find((k) => k.id === input.kelompok_id);

      const newJemaat = {
        id: newId,
        nomor_anggota: (input.nomor_anggota as string) || `JM-2026-${String(jemaatList.length + 1).padStart(4, "0")}`,
        nik: (input.nik as string)?.trim() || undefined,
        nama_lengkap: nama,
        tempat_lahir: (input.tempat_lahir as string)?.trim() || undefined,
        tanggal_lahir: tglLahir,
        jenis_kelamin: input.jenis_kelamin as 'L' | 'P',
        status_perkawinan: input.status_perkawinan as 'BELUM_MENIKAH' | 'MENIKAH' | 'CERAI_HIDUP' | 'CERAI_MATI',
        tanggal_menikah: (input.tanggal_menikah as string) || undefined,
        pendidikan_terakhir: (input.pendidikan_terakhir as string) || undefined,
        bidang_ilmu: (input.bidang_ilmu as string) || undefined,
        pekerjaan: (input.pekerjaan as string) || undefined,
        alamat: (input.alamat as string) || undefined,
        desa_kelurahan: (input.desa_kelurahan as string) || undefined,
        kecamatan: (input.kecamatan as string) || undefined,
        nomor_telepon: (input.nomor_telepon as string) || undefined,
        status_keanggotaan: (input.status_keanggotaan as 'AKTIF' | 'PINDAH' | 'MENINGGAL' | 'NONAKTIF') || 'AKTIF',
        tanggal_masuk: (input.tanggal_masuk as string) || new Date().toISOString().split("T")[0],
        pelka_id: input.pelka_id as string || undefined,
        nama_pelka: pelka?.nama,
        kode_pelka: pelka?.kode,
        kelompok_id: input.kelompok_id as string || undefined,
        nama_kelompok: kelompok?.nama,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        riwayat_kelompok: [],
        riwayat_gerejawi: [],
      };

      jemaatList.unshift(newJemaat);
      saveMockJemaat(jemaatList);
      return newId as unknown as T;
    }

    case "update_jemaat": {
      const id = args.id as string;
      const input = (args.input as Record<string, unknown>) || {};
      const jemaatList = getMockJemaat();
      const idx = jemaatList.findIndex((j) => j.id === id);
      if (idx === -1) throw new Error("Data jemaat tidak ditemukan");

      const pelka = MOCK_PELKA.find((p) => p.id === input.pelka_id);
      const kelompok = MOCK_KELOMPOK.find((k) => k.id === input.kelompok_id);

      jemaatList[idx] = {
        ...jemaatList[idx],
        nik: (input.nik as string)?.trim() || undefined,
        nama_lengkap: ((input.nama_lengkap as string) || jemaatList[idx].nama_lengkap).trim(),
        tempat_lahir: (input.tempat_lahir as string)?.trim() || jemaatList[idx].tempat_lahir,
        tanggal_lahir: (input.tanggal_lahir as string) || jemaatList[idx].tanggal_lahir,
        jenis_kelamin: (input.jenis_kelamin as 'L' | 'P') || jemaatList[idx].jenis_kelamin,
        status_perkawinan: (input.status_perkawinan as any) || jemaatList[idx].status_perkawinan,
        tanggal_menikah: (input.tanggal_menikah as string) || jemaatList[idx].tanggal_menikah,
        pendidikan_terakhir: (input.pendidikan_terakhir as string) || jemaatList[idx].pendidikan_terakhir,
        bidang_ilmu: (input.bidang_ilmu as string) || jemaatList[idx].bidang_ilmu,
        pekerjaan: (input.pekerjaan as string) || jemaatList[idx].pekerjaan,
        alamat: (input.alamat as string) || jemaatList[idx].alamat,
        desa_kelurahan: (input.desa_kelurahan as string) || jemaatList[idx].desa_kelurahan,
        kecamatan: (input.kecamatan as string) || jemaatList[idx].kecamatan,
        nomor_telepon: (input.nomor_telepon as string) || jemaatList[idx].nomor_telepon,
        status_keanggotaan: (input.status_keanggotaan as any) || jemaatList[idx].status_keanggotaan,
        pelka_id: input.pelka_id as string || jemaatList[idx].pelka_id,
        nama_pelka: pelka ? pelka.nama : jemaatList[idx].nama_pelka,
        kode_pelka: pelka ? pelka.kode : jemaatList[idx].kode_pelka,
        kelompok_id: input.kelompok_id as string || jemaatList[idx].kelompok_id,
        nama_kelompok: kelompok ? kelompok.nama : jemaatList[idx].nama_kelompok,
        updated_at: new Date().toISOString(),
      };

      saveMockJemaat(jemaatList);
      return undefined as unknown as T;
    }

    case "archive_jemaat": {
      const id = args.id as string;
      const jemaatList = getMockJemaat();
      const idx = jemaatList.findIndex((j) => j.id === id);
      if (idx === -1) throw new Error("Data jemaat tidak ditemukan");
      jemaatList[idx].is_archived = true;
      jemaatList[idx].updated_at = new Date().toISOString();
      saveMockJemaat(jemaatList);
      return undefined as unknown as T;
    }

    case "list_keluarga": {
      const filter = (args.filter as Record<string, unknown>) || {};
      const search = (filter.search as string | undefined)?.trim().toLowerCase();
      const status = filter.status as string | undefined;
      const page = Number(filter.page || 1);
      const pageSize = Number(filter.page_size || 15);

      let items = getMockKeluarga();
      if (search) {
        items = items.filter(
          (k) =>
            k.nama_keluarga.toLowerCase().includes(search) ||
            k.nomor_keluarga.toLowerCase().includes(search) ||
            (k.kepala_keluarga_nama && k.kepala_keluarga_nama.toLowerCase().includes(search))
        );
      }
      if (status) items = items.filter((k) => k.status === status);

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const paged = items.slice(offset, offset + pageSize);

      return {
        items: paged,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
      } as unknown as T;
    }

    case "get_keluarga_detail": {
      const id = args.id as string;
      const keluargaList = getMockKeluarga();
      const found = keluargaList.find((k) => k.id === id);
      if (!found) throw new Error("Data keluarga tidak ditemukan");
      return found as unknown as T;
    }

    case "create_keluarga": {
      const input = (args.input as Record<string, unknown>) || {};
      const nama = ((input.nama_keluarga as string) || "").trim();
      if (!nama) throw new Error("Nama keluarga wajib diisi");

      const keluargaList = getMockKeluarga();
      const newId = `k-${Date.now()}`;
      const noKk = (input.nomor_keluarga as string) || `KK-2026-${String(keluargaList.length + 1).padStart(4, "0")}`;

      let kepalaNama: string | undefined;
      const anggotaList: any[] = [];

      if (input.kepala_keluarga_id) {
        const jList = getMockJemaat();
        const kepala = jList.find((j) => j.id === input.kepala_keluarga_id);
        if (kepala) {
          kepalaNama = kepala.nama_lengkap;
          anggotaList.push({
            id: `ak-${Date.now()}-1`,
            keluarga_id: newId,
            jemaat_id: kepala.id,
            nomor_anggota: kepala.nomor_anggota,
            nama_lengkap: kepala.nama_lengkap,
            jenis_kelamin: kepala.jenis_kelamin,
            tanggal_lahir: kepala.tanggal_lahir,
            status_perkawinan: kepala.status_perkawinan,
            hubungan_keluarga: "KEPALA_KELUARGA",
            nama_pelka: kepala.nama_pelka,
            nama_kelompok: kepala.nama_kelompok,
            tanggal_mulai: (input.tanggal_pembentukan as string) || new Date().toISOString().split("T")[0],
          });
        }
      }

      const newKeluarga = {
        id: newId,
        nomor_keluarga: noKk,
        nama_keluarga: nama,
        kepala_keluarga_id: input.kepala_keluarga_id as string || undefined,
        kepala_keluarga_nama: kepalaNama,
        jumlah_anggota: anggotaList.length,
        status: (input.status as string) || "AKTIF",
        alamat: (input.alamat as string) || undefined,
        catatan: (input.catatan as string) || undefined,
        tanggal_pembentukan: (input.tanggal_pembentukan as string) || new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        anggota: anggotaList,
      };

      keluargaList.unshift(newKeluarga);
      saveMockKeluarga(keluargaList);
      return newId as unknown as T;
    }

    case "update_keluarga": {
      const id = args.id as string;
      const input = (args.input as Record<string, unknown>) || {};
      const keluargaList = getMockKeluarga();
      const idx = keluargaList.findIndex((k) => k.id === id);
      if (idx === -1) throw new Error("Data keluarga tidak ditemukan");

      let kepalaNama = keluargaList[idx].kepala_keluarga_nama;
      if (input.kepala_keluarga_id && input.kepala_keluarga_id !== keluargaList[idx].kepala_keluarga_id) {
        const jList = getMockJemaat();
        const kepala = jList.find((j) => j.id === input.kepala_keluarga_id);
        if (kepala) kepalaNama = kepala.nama_lengkap;
      }

      keluargaList[idx] = {
        ...keluargaList[idx],
        nama_keluarga: ((input.nama_keluarga as string) || keluargaList[idx].nama_keluarga).trim(),
        kepala_keluarga_id: input.kepala_keluarga_id as string || keluargaList[idx].kepala_keluarga_id,
        kepala_keluarga_nama: kepalaNama,
        status: (input.status as string) || keluargaList[idx].status,
        alamat: (input.alamat as string) || keluargaList[idx].alamat,
        catatan: (input.catatan as string) || keluargaList[idx].catatan,
        tanggal_pembentukan: (input.tanggal_pembentukan as string) || keluargaList[idx].tanggal_pembentukan,
        updated_at: new Date().toISOString(),
      };

      saveMockKeluarga(keluargaList);
      return undefined as unknown as T;
    }

    case "add_anggota_keluarga": {
      const input = (args.input as Record<string, unknown>) || {};
      const keluargaId = input.keluarga_id as string;
      const jemaatId = input.jemaat_id as string;
      const hubungan = input.hubungan_keluarga as string;

      const keluargaList = getMockKeluarga();
      const kIdx = keluargaList.findIndex((k) => k.id === keluargaId);
      if (kIdx === -1) throw new Error("Data keluarga tidak ditemukan");

      const jList = getMockJemaat();
      const jemaat = jList.find((j) => j.id === jemaatId);
      if (!jemaat) throw new Error("Data jemaat tidak ditemukan");

      // Check if already in this keluarga
      if (keluargaList[kIdx].anggota.some((a: any) => a.jemaat_id === jemaatId)) {
        throw new Error("Jemaat ini sudah terdaftar dalam Kartu Keluarga ini");
      }

      const newAnggota = {
        id: `ak-${Date.now()}`,
        keluarga_id: keluargaId,
        jemaat_id: jemaat.id,
        nomor_anggota: jemaat.nomor_anggota,
        nama_lengkap: jemaat.nama_lengkap,
        jenis_kelamin: jemaat.jenis_kelamin,
        tanggal_lahir: jemaat.tanggal_lahir,
        status_perkawinan: jemaat.status_perkawinan,
        hubungan_keluarga: hubungan,
        nama_pelka: jemaat.nama_pelka,
        nama_kelompok: jemaat.nama_kelompok,
        tanggal_mulai: (input.tanggal_mulai as string) || new Date().toISOString().split("T")[0],
        catatan: (input.catatan as string) || undefined,
      };

      keluargaList[kIdx].anggota.push(newAnggota);
      keluargaList[kIdx].jumlah_anggota = keluargaList[kIdx].anggota.length;

      if (hubungan === "KEPALA_KELUARGA") {
        keluargaList[kIdx].kepala_keluarga_id = jemaat.id;
        keluargaList[kIdx].kepala_keluarga_nama = jemaat.nama_lengkap;
      }

      saveMockKeluarga(keluargaList);
      return newAnggota.id as unknown as T;
    }

    case "remove_anggota_keluarga": {
      const id = args.id as string;
      const keluargaList = getMockKeluarga();
      for (const k of keluargaList) {
        const aIdx = k.anggota.findIndex((a: any) => a.id === id);
        if (aIdx !== -1) {
          const removed = k.anggota.splice(aIdx, 1)[0];
          k.jumlah_anggota = k.anggota.length;
          if (removed.hubungan_keluarga === "KEPALA_KELUARGA") {
            k.kepala_keluarga_id = undefined;
            k.kepala_keluarga_nama = undefined;
          }
          saveMockKeluarga(keluargaList);
          return undefined as unknown as T;
        }
      }
      throw new Error("Anggota keluarga tidak ditemukan");
    }

    case "list_kelompok": {
      const jList = getMockJemaat().filter((j) => !j.is_archived);
      return MOCK_KELOMPOK.map((k) => ({
        id: k.id,
        nomor_kelompok: k.nomor,
        nama_kelompok: k.nama,
        deskripsi: k.deskripsi,
        is_active: true,
        jumlah_jemaat: jList.filter((j) => j.kelompok_id === k.id).length,
      })) as unknown as T;
    }

    case "get_kelompok_detail": {
      const id = args.id as string;
      const kelompok = MOCK_KELOMPOK.find((k) => k.id === id);
      if (!kelompok) throw new Error("Data kelompok tidak ditemukan");

      const jList = getMockJemaat().filter((j) => !j.is_archived && j.kelompok_id === id);
      return {
        id: kelompok.id,
        nomor_kelompok: kelompok.nomor,
        nama_kelompok: kelompok.nama,
        deskripsi: kelompok.deskripsi,
        is_active: true,
        jemaat_list: jList.map((j) => ({
          id: j.id,
          nomor_anggota: j.nomor_anggota,
          nama_lengkap: j.nama_lengkap,
          jenis_kelamin: j.jenis_kelamin,
          tanggal_lahir: j.tanggal_lahir,
          status_perkawinan: j.status_perkawinan,
          status_keanggotaan: j.status_keanggotaan,
          nama_pelka: j.nama_pelka,
          alamat: j.alamat,
          nomor_telepon: j.nomor_telepon,
        })),
      } as unknown as T;
    }

    case "move_jemaat_kelompok": {
      const input = (args.input as Record<string, unknown>) || {};
      const jemaatId = input.jemaat_id as string;
      const tujuanId = input.kelompok_tujuan_id as string;
      const tgl = (input.tanggal_perpindahan as string) || new Date().toISOString().split("T")[0];
      const alasan = input.alasan as string | undefined;

      const jList = getMockJemaat();
      const jIdx = jList.findIndex((j) => j.id === jemaatId);
      if (jIdx === -1) throw new Error("Data jemaat tidak ditemukan");

      const asalId = jList[jIdx].kelompok_id;
      if (asalId === tujuanId) {
        throw new Error("Kelompok tujuan sama dengan kelompok jemaat saat ini");
      }

      const kelompokTujuan = MOCK_KELOMPOK.find((k) => k.id === tujuanId);
      const kelompokAsal = MOCK_KELOMPOK.find((k) => k.id === asalId);

      jList[jIdx].kelompok_id = tujuanId;
      jList[jIdx].nama_kelompok = kelompokTujuan?.nama;
      jList[jIdx].riwayat_kelompok = jList[jIdx].riwayat_kelompok || [];
      jList[jIdx].riwayat_kelompok.unshift({
        id: `rk-${Date.now()}`,
        kelompok_asal: kelompokAsal?.nama,
        kelompok_tujuan: kelompokTujuan?.nama || "Kelompok Baru",
        tanggal_perpindahan: tgl,
        alasan,
        recorded_by_name: "Administrator",
      });

      saveMockJemaat(jList);
      return undefined as unknown as T;
    }

    case "create_kelompok": {
      const input = (args.input as Record<string, unknown>) || {};
      const nomor = String(input.nomor_kelompok || "").trim();
      const nama = String(input.nama_kelompok || "").trim();
      const deskripsi = input.deskripsi as string | undefined;

      if (!nomor) throw new Error("Nomor kelompok wajib diisi");
      if (!nama) throw new Error("Nama kelompok wajib diisi");

      if (MOCK_KELOMPOK.some((k) => k.nomor === nomor)) {
        throw new Error(`Nomor kelompok '${nomor}' sudah digunakan`);
      }

      const newId = `kelompok-${Date.now()}`;
      const newKel = {
        id: newId,
        nomor,
        nama,
        deskripsi: deskripsi || `Kelompok Ibadah ${nama}`,
      };
      MOCK_KELOMPOK.push(newKel);

      return {
        id: newId,
        nomor_kelompok: nomor,
        nama_kelompok: nama,
        deskripsi: deskripsi || null,
        is_active: true,
        jumlah_jemaat: 0,
      } as unknown as T;
    }

    case "update_kelompok": {
      const input = (args.input as Record<string, unknown>) || {};
      const id = String(input.id || "");
      const nomor = String(input.nomor_kelompok || "").trim();
      const nama = String(input.nama_kelompok || "").trim();
      const deskripsi = input.deskripsi as string | undefined;

      if (!nomor) throw new Error("Nomor kelompok wajib diisi");
      if (!nama) throw new Error("Nama kelompok wajib diisi");

      const idx = MOCK_KELOMPOK.findIndex((k) => k.id === id);
      if (idx === -1) throw new Error("Kelompok tidak ditemukan");

      if (MOCK_KELOMPOK.some((k) => k.nomor === nomor && k.id !== id)) {
        throw new Error(`Nomor kelompok '${nomor}' sudah digunakan oleh kelompok lain`);
      }

      MOCK_KELOMPOK[idx].nomor = nomor;
      MOCK_KELOMPOK[idx].nama = nama;
      if (deskripsi !== undefined) {
        MOCK_KELOMPOK[idx].deskripsi = deskripsi;
      }

      return undefined as unknown as T;
    }

    case "delete_kelompok": {
      const id = args.id as string;
      const idx = MOCK_KELOMPOK.findIndex((k) => k.id === id);
      if (idx === -1) throw new Error("Kelompok tidak ditemukan");

      const jList = getMockJemaat().filter((j) => !j.is_archived && j.kelompok_id === id);
      if (jList.length > 0) {
        throw new Error(
          `Kelompok tidak dapat dihapus karena masih menaungi ${jList.length} jemaat aktif. Silakan pindahkan anggota kelompok terlebih dahulu.`
        );
      }

      MOCK_KELOMPOK.splice(idx, 1);
      return undefined as unknown as T;
    }

    case "list_pelka_summary": {
      const jList = getMockJemaat().filter((j) => !j.is_archived);
      return MOCK_PELKA.map((p) => {
        const aktual_count = jList.filter((j) => j.pelka_id === p.id).length;
        const rekomendasi_count = jList.filter((j) => {
          const rec = calculatePelkaRecommendation(j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan);
          return rec.kode === p.kode;
        }).length;
        return {
          id: p.id,
          kode: p.kode,
          nama_pelka: p.nama,
          deskripsi: `Pelayanan Kategorial ${p.nama}`,
          is_active: true,
          jumlah_anggota_aktual: aktual_count,
          jumlah_rekomendasi: rekomendasi_count,
        };
      }) as unknown as T;
    }

    case "get_pelka_review_queue": {
      const jList = getMockJemaat().filter((j) => !j.is_archived && j.status_keanggotaan === "AKTIF");
      const queue: any[] = [];
      for (const j of jList) {
        const rec = calculatePelkaRecommendation(j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan);
        if (rec.kode !== "TIDAK_DAPAT_DITENTUKAN" && rec.kode !== "BELUM_DITENTUKAN") {
          const is_mismatch = j.kode_pelka ? j.kode_pelka !== rec.kode : true;
          if (is_mismatch) {
            const targetPelka = MOCK_PELKA.find((p) => p.kode === rec.kode);
            queue.push({
              jemaat_id: j.id,
              nomor_anggota: j.nomor_anggota,
              nama_lengkap: j.nama_lengkap,
              jenis_kelamin: j.jenis_kelamin,
              tanggal_lahir: j.tanggal_lahir,
              usia: rec.usia ?? 0,
              status_perkawinan: j.status_perkawinan,
              pelka_aktual_id: j.pelka_id,
              pelka_aktual_nama: j.nama_pelka,
              pelka_aktual_kode: j.kode_pelka,
              rekomendasi_kode: rec.kode,
              rekomendasi_nama: rec.nama_pelka,
              rekomendasi_id: targetPelka?.id,
              alasan_rekomendasi: rec.alasan,
              nama_kelompok: j.nama_kelompok,
            });
          }
        }
      }
      return queue as unknown as T;
    }

    case "apply_pelka_mutation": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak menyetujui mutasi Pelka");
      }
      const input = (args.input as any) || {};
      if (!input.reason || !input.reason.trim()) {
        throw new Error("Alasan mutasi Pelka wajib diisi untuk catatan riwayat audit");
      }
      const targetPelka = MOCK_PELKA.find((p) => p.id === input.new_pelka_id);
      if (!targetPelka) {
        throw new Error("Pelka tujuan tidak valid atau tidak ditemukan");
      }
      const jList = getMockJemaat();
      const idx = jList.findIndex((j) => j.id === input.jemaat_id);
      if (idx === -1) {
        throw new Error("Data jemaat tidak ditemukan");
      }
      jList[idx].pelka_id = targetPelka.id;
      jList[idx].nama_pelka = targetPelka.nama;
      jList[idx].kode_pelka = targetPelka.kode;
      jList[idx].updated_at = new Date().toISOString();
      saveMockJemaat(jList);
      return undefined as unknown as T;
    }

    case "update_pelka": {
      const input = (args.input as any) || {};
      const id = String(input.id || "");
      const nama = String(input.nama_pelka || "").trim();
      const deskripsi = input.deskripsi as string | undefined;

      const pIdx = MOCK_PELKA.findIndex((p) => p.id === id);
      if (pIdx !== -1) {
        if (nama) MOCK_PELKA[pIdx].nama = nama;
      }
      return undefined as unknown as T;
    }

    case "list_jabatan": {
      const pList = getMockPejabat();
      const today = new Date().toISOString().split("T")[0];
      return MOCK_JABATAN.map((jab) => {
        const activeCount = pList.filter(
          (p) => p.jabatan_id === jab.id && (!p.tanggal_berakhir || p.tanggal_berakhir >= today)
        ).length;
        return {
          ...jab,
          jumlah_pejabat_aktif: activeCount,
        };
      }) as unknown as T;
    }

    case "list_pejabat_aktif": {
      const pList = getMockPejabat();
      const today = new Date().toISOString().split("T")[0];
      const lingkup = args.lingkup as string | undefined;
      const jabatanId = args.jabatan_id as string | undefined;

      let filtered = pList.filter((p) => !p.tanggal_berakhir || p.tanggal_berakhir >= today);
      if (lingkup && lingkup.trim()) {
        filtered = filtered.filter((p) => p.lingkup === lingkup.trim());
      }
      if (jabatanId && jabatanId.trim()) {
        filtered = filtered.filter((p) => p.jabatan_id === jabatanId.trim());
      }
      return filtered as unknown as T;
    }

    case "create_pengangkatan_jabatan": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat pengangkatan jabatan pelayanan");
      }
      const input = (args.input as any) || {};
      if (!input.tanggal_pengangkatan || !input.tanggal_pengangkatan.trim()) {
        throw new Error("Tanggal pengangkatan wajib diisi");
      }
      const validLingkup = ["JEMAAT", "KELOMPOK", "PELKA"];
      if (!validLingkup.includes(input.lingkup?.trim())) {
        throw new Error("Lingkup jabatan tidak valid (pilihan: JEMAAT, KELOMPOK, PELKA)");
      }
      const jList = getMockJemaat();
      const jemaat = jList.find((j) => j.id === input.jemaat_id);
      if (!jemaat) throw new Error("Data jemaat tidak ditemukan");

      const jabatan = MOCK_JABATAN.find((j) => j.id === input.jabatan_id);
      if (!jabatan) throw new Error("Data jabatan tidak ditemukan");

      const kelompok = input.kelompok_id ? MOCK_KELOMPOK.find((k) => k.id === input.kelompok_id) : undefined;
      const pelka = input.pelka_id ? MOCK_PELKA.find((p) => p.id === input.pelka_id) : undefined;

      const newId = `rj-${Date.now()}`;
      const newPejabat = {
        id: newId,
        jemaat_id: jemaat.id,
        nomor_anggota: jemaat.nomor_anggota,
        nama_lengkap: jemaat.nama_lengkap,
        jenis_kelamin: jemaat.jenis_kelamin,
        jabatan_id: jabatan.id,
        nama_jabatan: jabatan.nama_jabatan,
        jenis_jabatan: jabatan.jenis,
        lingkup: input.lingkup.trim(),
        kelompok_id: input.kelompok_id || undefined,
        nama_kelompok: kelompok?.nama || undefined,
        pelka_id: input.pelka_id || undefined,
        nama_pelka: pelka?.nama || undefined,
        tanggal_pengangkatan: input.tanggal_pengangkatan.trim(),
        tanggal_berakhir: input.tanggal_berakhir?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
      };

      const pList = getMockPejabat();
      pList.unshift(newPejabat);
      saveMockPejabat(pList);
      return newId as unknown as T;
    }

    case "akhiri_masa_jabatan": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengakhiri masa jabatan pelayanan");
      }
      const input = (args.input as any) || {};
      if (!input.tanggal_berakhir || !input.tanggal_berakhir.trim()) {
        throw new Error("Tanggal pengakhiran jabatan wajib diisi");
      }
      const pList = getMockPejabat();
      const idx = pList.findIndex((p) => p.id === input.riwayat_id);
      if (idx === -1) {
        throw new Error("Data riwayat jabatan tidak ditemukan");
      }
      pList[idx].tanggal_berakhir = input.tanggal_berakhir.trim();
      pList[idx].keterangan = pList[idx].keterangan
        ? `${pList[idx].keterangan} | Selesai: ${input.keterangan?.trim() || "-"}`
        : input.keterangan?.trim() || undefined;
      saveMockPejabat(pList);
      return undefined as unknown as T;
    }

    case "get_jemaat_riwayat_jabatan": {
      const jemaatId = args.jemaat_id as string;
      const pList = getMockPejabat();
      return pList.filter((p) => p.jemaat_id === jemaatId) as unknown as T;
    }

    case "list_peristiwa_gerejawi": {
      const pList = getMockPeristiwa();
      const jenis = args.jenis_peristiwa as string | undefined;
      const search = (args.search as string | undefined)?.toLowerCase().trim();

      let res = pList;
      if (jenis && jenis.trim()) {
        res = res.filter((p) => p.jenis_peristiwa === jenis.trim());
      }
      if (search) {
        res = res.filter(
          (p) =>
            p.nama_lengkap.toLowerCase().includes(search) ||
            p.nomor_anggota.toLowerCase().includes(search) ||
            (p.nomor_surat && p.nomor_surat.toLowerCase().includes(search)) ||
            (p.pelayan_firman && p.pelayan_firman.toLowerCase().includes(search))
        );
      }
      return res as unknown as T;
    }

    case "create_peristiwa_gerejawi": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat peristiwa gerejawi");
      }
      const input = (args.input as any) || {};
      if (!input.tanggal_peristiwa || !input.tanggal_peristiwa.trim()) {
        throw new Error("Tanggal peristiwa wajib diisi");
      }
      const jList = getMockJemaat();
      const jemaat = jList.find((j) => j.id === input.jemaat_id);
      if (!jemaat) throw new Error("Data jemaat tidak ditemukan");

      const newId = `pg-${Date.now()}`;
      const newPeristiwa = {
        id: newId,
        jemaat_id: jemaat.id,
        nomor_anggota: jemaat.nomor_anggota,
        nama_lengkap: jemaat.nama_lengkap,
        jenis_kelamin: jemaat.jenis_kelamin,
        jenis_peristiwa: input.jenis_peristiwa,
        tanggal_peristiwa: input.tanggal_peristiwa.trim(),
        tempat: input.tempat?.trim() || undefined,
        pelayan_firman: input.pelayan_firman?.trim() || undefined,
        nomor_surat: input.nomor_surat?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      const pList = getMockPeristiwa();
      pList.unshift(newPeristiwa);
      saveMockPeristiwa(pList);
      return newId as unknown as T;
    }

    case "create_perkawinan_gerejawi": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat perkawinan gerejawi");
      }
      const input = (args.input as any) || {};
      if (!input.tanggal_perkawinan || !input.tanggal_perkawinan.trim()) {
        throw new Error("Tanggal perkawinan kudus wajib diisi");
      }

      const jList = getMockJemaat();
      const m1Idx = jList.findIndex((j) => j.id === input.mempelai_1_id);
      if (m1Idx === -1) throw new Error("Data jemaat mempelai 1 tidak ditemukan");

      let m2Nama = input.nama_pasangan_luar?.trim();
      let m2Idx = -1;
      if (input.mempelai_2_id) {
        m2Idx = jList.findIndex((j) => j.id === input.mempelai_2_id);
        if (m2Idx !== -1) {
          m2Nama = jList[m2Idx].nama_lengkap;
        }
      }

      const namaPasanganDisplay = m2Nama || "Pasangan";
      const now = new Date().toISOString();
      const newId1 = `pg-${Date.now()}`;

      // Update mempelai 1
      jList[m1Idx].status_perkawinan = "MENIKAH";
      jList[m1Idx].tanggal_menikah = input.tanggal_perkawinan.trim();
      jList[m1Idx].updated_at = now;

      const pList = getMockPeristiwa();
      pList.unshift({
        id: newId1,
        jemaat_id: jList[m1Idx].id,
        nomor_anggota: jList[m1Idx].nomor_anggota,
        nama_lengkap: jList[m1Idx].nama_lengkap,
        jenis_kelamin: jList[m1Idx].jenis_kelamin,
        jenis_peristiwa: "PERKAWINAN",
        tanggal_peristiwa: input.tanggal_perkawinan.trim(),
        tempat: input.tempat?.trim() || undefined,
        pelayan_firman: input.pelayan_firman?.trim() || undefined,
        nomor_surat: input.nomor_surat?.trim() || undefined,
        keterangan: `Menikah dengan ${namaPasanganDisplay}${input.keterangan?.trim() ? `. Catatan: ${input.keterangan.trim()}` : ""}`,
        created_at: now,
      });

      // Update mempelai 2 jika internal
      if (m2Idx !== -1 && m2Idx !== m1Idx) {
        jList[m2Idx].status_perkawinan = "MENIKAH";
        jList[m2Idx].tanggal_menikah = input.tanggal_perkawinan.trim();
        jList[m2Idx].updated_at = now;

        const newId2 = `pg-${Date.now()}-2`;
        pList.unshift({
          id: newId2,
          jemaat_id: jList[m2Idx].id,
          nomor_anggota: jList[m2Idx].nomor_anggota,
          nama_lengkap: jList[m2Idx].nama_lengkap,
          jenis_kelamin: jList[m2Idx].jenis_kelamin,
          jenis_peristiwa: "PERKAWINAN",
          tanggal_peristiwa: input.tanggal_perkawinan.trim(),
          tempat: input.tempat?.trim() || undefined,
          pelayan_firman: input.pelayan_firman?.trim() || undefined,
          nomor_surat: input.nomor_surat?.trim() || undefined,
          keterangan: `Menikah dengan ${jList[m1Idx].nama_lengkap}${input.keterangan?.trim() ? `. Catatan: ${input.keterangan.trim()}` : ""}`,
          created_at: now,
        });
      }

      saveMockJemaat(jList);
      saveMockPeristiwa(pList);
      return newId1 as unknown as T;
    }

    case "list_atestasi": {
      const atList = getMockAtestasi();
      const search = (args.search as string | undefined)?.toLowerCase().trim();
      let res = atList;
      if (search) {
        res = res.filter(
          (a) =>
            a.nama_lengkap.toLowerCase().includes(search) ||
            a.nomor_anggota.toLowerCase().includes(search) ||
            (a.jemaat_tujuan_asal && a.jemaat_tujuan_asal.toLowerCase().includes(search)) ||
            (a.nomor_surat && a.nomor_surat.toLowerCase().includes(search))
        );
      }
      return res as unknown as T;
    }

    case "create_atestasi_keluar": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat atestasi keluar");
      }
      const input = (args.input as any) || {};
      if (!input.gereja_tujuan || !input.gereja_tujuan.trim()) {
        throw new Error("Nama jemaat / gereja tujuan wajib diisi");
      }
      if (!input.tanggal_keluar || !input.tanggal_keluar.trim()) {
        throw new Error("Tanggal atestasi keluar wajib diisi");
      }
      if (!input.alasan || !input.alasan.trim()) {
        throw new Error("Alasan pindah keanggotaan wajib diisi");
      }

      const jList = getMockJemaat();
      const idx = jList.findIndex((j) => j.id === input.jemaat_id);
      if (idx === -1) throw new Error("Data jemaat tidak ditemukan");

      const oldStatus = jList[idx].status_keanggotaan;
      jList[idx].status_keanggotaan = "PINDAH";
      jList[idx].updated_at = new Date().toISOString();
      saveMockJemaat(jList);

      // Selesaikan jabatan aktif jika ada
      const pejs = getMockPejabat();
      for (const p of pejs) {
        if (p.jemaat_id === input.jemaat_id && !p.tanggal_berakhir) {
          p.tanggal_berakhir = input.tanggal_keluar.trim();
          p.keterangan = p.keterangan
            ? `${p.keterangan} | Selesai karena Pindah Jemaat`
            : "Selesai karena Pindah Jemaat";
        }
      }
      saveMockPejabat(pejs);

      const newId = `at-${Date.now()}`;
      const atList = getMockAtestasi();
      atList.unshift({
        id: newId,
        jemaat_id: jList[idx].id,
        nomor_anggota: jList[idx].nomor_anggota,
        nama_lengkap: jList[idx].nama_lengkap,
        jenis_kelamin: jList[idx].jenis_kelamin,
        status_sebelumnya: oldStatus,
        status_baru: "PINDAH",
        tanggal_perubahan: input.tanggal_keluar.trim(),
        alasan: input.alasan.trim(),
        jemaat_tujuan_asal: input.gereja_tujuan.trim(),
        nomor_surat: input.nomor_surat?.trim() || undefined,
        created_at: new Date().toISOString(),
      });
      saveMockAtestasi(atList);

      return newId as unknown as T;
    }

    case "create_atestasi_masuk": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat atestasi masuk");
      }
      const input = (args.input as any) || {};
      if (!input.gereja_asal || !input.gereja_asal.trim()) {
        throw new Error("Nama gereja asal wajib diisi");
      }
      if (!input.tanggal_masuk || !input.tanggal_masuk.trim()) {
        throw new Error("Tanggal atestasi masuk wajib diisi");
      }

      const jList = getMockJemaat();
      const idx = jList.findIndex((j) => j.id === input.jemaat_id);
      if (idx === -1) throw new Error("Data jemaat tidak ditemukan");

      const oldStatus = jList[idx].status_keanggotaan;
      jList[idx].status_keanggotaan = "AKTIF";
      jList[idx].tanggal_masuk = input.tanggal_masuk.trim();
      jList[idx].updated_at = new Date().toISOString();
      saveMockJemaat(jList);

      const newId = `at-${Date.now()}`;
      const atList = getMockAtestasi();
      atList.unshift({
        id: newId,
        jemaat_id: jList[idx].id,
        nomor_anggota: jList[idx].nomor_anggota,
        nama_lengkap: jList[idx].nama_lengkap,
        jenis_kelamin: jList[idx].jenis_kelamin,
        status_sebelumnya: oldStatus,
        status_baru: "AKTIF",
        tanggal_perubahan: input.tanggal_masuk.trim(),
        alasan: input.keterangan?.trim() || "Pindah masuk keanggotaan",
        jemaat_tujuan_asal: input.gereja_asal.trim(),
        nomor_surat: input.nomor_surat?.trim() || undefined,
        created_at: new Date().toISOString(),
      });
      saveMockAtestasi(atList);

      return newId as unknown as T;
    }

    case "list_kematian": {
      const kmList = getMockKematian();
      const search = (args.search as string | undefined)?.toLowerCase().trim();
      let res = kmList;
      if (search) {
        res = res.filter(
          (k) =>
            k.nama_lengkap.toLowerCase().includes(search) ||
            k.nomor_anggota.toLowerCase().includes(search) ||
            (k.tempat_pemakaman && k.tempat_pemakaman.toLowerCase().includes(search)) ||
            (k.nomor_surat_kematian && k.nomor_surat_kematian.toLowerCase().includes(search))
        );
      }
      return res as unknown as T;
    }

    case "catat_kematian": {
      const user = getMockCurrentUser();
      if (!user || user.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mencatat kematian jemaat");
      }
      const input = (args.input as any) || {};
      if (!input.tanggal_meninggal || !input.tanggal_meninggal.trim()) {
        throw new Error("Tanggal meninggal dunia wajib diisi");
      }

      const jList = getMockJemaat();
      const idx = jList.findIndex((j) => j.id === input.jemaat_id);
      if (idx === -1) throw new Error("Data jemaat tidak ditemukan");

      const now = new Date().toISOString();
      jList[idx].status_keanggotaan = "MENINGGAL";
      jList[idx].tanggal_meninggal = input.tanggal_meninggal.trim();
      jList[idx].is_archived = true;
      jList[idx].updated_at = now;
      saveMockJemaat(jList);

      // Selesaikan jabatan aktif
      const pejs = getMockPejabat();
      for (const p of pejs) {
        if (p.jemaat_id === input.jemaat_id && !p.tanggal_berakhir) {
          p.tanggal_berakhir = input.tanggal_meninggal.trim();
          p.keterangan = p.keterangan
            ? `${p.keterangan} | Selesai karena Meninggal Dunia`
            : "Selesai karena Meninggal Dunia";
        }
      }
      saveMockPejabat(pejs);

      // Selesaikan keanggotaan KK
      const kels = getMockKeluarga();
      for (const k of kels) {
        for (const a of k.anggota) {
          if (a.jemaat_id === input.jemaat_id && !a.tanggal_berakhir) {
            a.tanggal_berakhir = input.tanggal_meninggal.trim();
            a.catatan = a.catatan ? `${a.catatan} | Meninggal Dunia` : "Meninggal Dunia";
          }
        }
        if (k.kepala_keluarga_id === input.jemaat_id) {
          k.kepala_keluarga_id = undefined;
          k.kepala_keluarga_nama = undefined;
        }
      }
      saveMockKeluarga(kels);

      const newId = `km-${Date.now()}`;
      const kmList = getMockKematian();
      kmList.unshift({
        id: newId,
        jemaat_id: jList[idx].id,
        nomor_anggota: jList[idx].nomor_anggota,
        nama_lengkap: jList[idx].nama_lengkap,
        jenis_kelamin: jList[idx].jenis_kelamin,
        tanggal_lahir: jList[idx].tanggal_lahir,
        tanggal_meninggal: input.tanggal_meninggal.trim(),
        tempat_meninggal: input.tempat_meninggal?.trim() || undefined,
        tempat_pemakaman: input.tempat_pemakaman?.trim() || undefined,
        pelayan_pemakaman: input.pelayan_pemakaman?.trim() || undefined,
        nomor_surat_kematian: input.nomor_surat_kematian?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
        created_at: now,
      });
      saveMockKematian(kmList);

      return newId as unknown as T;
    }

    case "list_audit_logs": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengakses audit log");
      }
      const filter = (args.filter || {}) as Record<string, unknown>;
      let logs = getMockAudit();

      if (filter.action && String(filter.action).trim()) {
        logs = logs.filter((l) => l.action === String(filter.action).trim());
      }
      if (filter.entity && String(filter.entity).trim()) {
        logs = logs.filter((l) => l.entity === String(filter.entity).trim());
      }
      if (filter.user_id && String(filter.user_id).trim()) {
        logs = logs.filter((l) => l.user_id === String(filter.user_id).trim());
      }
      if (filter.search && String(filter.search).trim()) {
        const q = String(filter.search).toLowerCase();
        logs = logs.filter(
          (l) =>
            l.summary.toLowerCase().includes(q) ||
            (l.reason && l.reason.toLowerCase().includes(q)) ||
            l.username.toLowerCase().includes(q)
        );
      }
      if (filter.from_date && String(filter.from_date).trim()) {
        logs = logs.filter((l) => l.timestamp >= String(filter.from_date).trim());
      }
      if (filter.to_date && String(filter.to_date).trim()) {
        const toVal =
          String(filter.to_date).trim().length === 10
            ? `${String(filter.to_date).trim()}T23:59:59Z`
            : String(filter.to_date).trim();
        logs = logs.filter((l) => l.timestamp <= toVal);
      }

      const total_records = logs.length;
      const page = Math.max(1, Number(filter.page) || 1);
      const page_size = Math.min(200, Math.max(5, Number(filter.page_size) || 20));
      const total_pages = total_records === 0 ? 1 : Math.ceil(total_records / page_size);
      const offset = (page - 1) * page_size;
      const items = logs.slice(offset, offset + page_size);

      return {
        items,
        total_records,
        page,
        page_size,
        total_pages,
      } as unknown as T;
    }

    case "create_database_backup": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak membuat backup database");
      }
      const dateStr = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
      const file_name = `simarta_backup_${dateStr}.db`;
      const file_path = `/data/simarta/backups/${file_name}`;
      const created_at = new Date().toISOString();
      const file_size_bytes = 524288;

      const backups = getMockBackups();
      backups.unshift({ file_name, file_path, file_size_bytes, created_at });
      saveMockBackups(backups);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "BACKUP",
        entity: "database",
        summary: `Membuat cadangan database: ${file_name}`,
      });

      return {
        backup_path: file_path,
        file_name,
        file_size_bytes,
        created_at,
      } as unknown as T;
    }

    case "list_backups": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak melihat daftar backup");
      }
      return getMockBackups() as unknown as T;
    }

    case "restore_database_from_backup": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak memulihkan database");
      }
      const backup_path = String(args.backup_path);
      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "RESTORE",
        entity: "database",
        summary: `Memulihkan database dari snapshot: ${backup_path}`,
      });
      return null as unknown as T;
    }

    case "get_export_jemaat_data": {
      const jList = getMockJemaat().filter((j) => !j.is_archived);
      const exportRows = jList.map((j) => ({
        nomor_anggota: j.nomor_anggota,
        nik: j.nik || "",
        nama_lengkap: j.nama_lengkap,
        tempat_lahir: j.tempat_lahir || "",
        tanggal_lahir: j.tanggal_lahir,
        jenis_kelamin: j.jenis_kelamin,
        status_perkawinan: j.status_perkawinan,
        tanggal_menikah: j.tanggal_menikah || "",
        alamat: j.alamat || "",
        desa_kelurahan: j.desa_kelurahan || "",
        kecamatan: j.kecamatan || "",
        nomor_telepon: j.nomor_telepon || "",
        status_keanggotaan: j.status_keanggotaan,
        nama_pelka: j.nama_pelka || "",
        nama_kelompok: j.nama_kelompok || "",
      }));
      return exportRows as unknown as T;
    }

    case "get_export_keluarga_data": {
      const kList = getMockKeluarga();
      const exportRows = kList.map((k) => ({
        nomor_keluarga: k.nomor_keluarga,
        nama_keluarga: k.nama_keluarga,
        kepala_keluarga: k.kepala_keluarga_nama || "",
        alamat: k.alamat || "",
        jumlah_anggota: (k.anggota || []).length,
        status: k.status,
      }));
      return exportRows as unknown as T;
    }

    case "import_jemaat_batch": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengimpor data jemaat");
      }
      const rows = (args.rows || []) as any[];
      if (rows.length === 0) {
        throw new Error("Tidak ada data jemaat yang dikirim untuk diimpor");
      }
      const jList = getMockJemaat();
      let curMax = jList.reduce((max, j) => {
        const m = j.nomor_anggota.match(/^JM-\d{4}-(\d+)$/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);

      let inserted = 0;
      const failed: string[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 1;
        if (!r.nama_lengkap || !r.nama_lengkap.trim()) {
          failed.push(`Baris ${rowNum}: Nama lengkap wajib diisi`);
          continue;
        }
        if (!r.tanggal_lahir || !r.tanggal_lahir.trim()) {
          failed.push(`Baris ${rowNum}: Tanggal lahir wajib diisi`);
          continue;
        }
        const jk = (r.jenis_kelamin || "").trim().toUpperCase();
        if (jk !== "L" && jk !== "P") {
          failed.push(`Baris ${rowNum}: Jenis kelamin harus 'L' atau 'P'`);
          continue;
        }
        const sp = (r.status_perkawinan || "").trim().toUpperCase();
        if (!["BELUM_MENIKAH", "MENIKAH", "CERAI_HIDUP", "CERAI_MATI"].includes(sp)) {
          failed.push(`Baris ${rowNum}: Status perkawinan tidak valid`);
          continue;
        }

        if (r.nik && r.nik.trim()) {
          const existingNik = jList.find((j: any) => j.nik === r.nik.trim() && !j.is_archived);
          if (existingNik) {
            failed.push(`Baris ${rowNum}: NIK ${r.nik.trim()} sudah terdaftar atas nama ${existingNik.nama_lengkap}`);
            continue;
          }
        }

        curMax += 1;
        const nomor_anggota = `JM-2026-${String(curMax).padStart(4, "0")}`;
        const rec = calculatePelkaRecommendation(r.tanggal_lahir.trim(), jk as "L" | "P", sp as any);

        jList.unshift({
          id: `j-${Date.now()}-${i}`,
          nomor_anggota,
          nik: r.nik?.trim() || undefined,
          nama_lengkap: r.nama_lengkap.trim(),
          tempat_lahir: r.tempat_lahir?.trim() || undefined,
          tanggal_lahir: r.tanggal_lahir.trim(),
          jenis_kelamin: jk,
          status_perkawinan: sp,
          status_keanggotaan: "AKTIF",
          pelka_id: `pelka-${rec.kode.toLowerCase()}`,
          nama_pelka: rec.nama_pelka,
          kode_pelka: rec.kode,
          kelompok_id: r.nomor_kelompok ? `kelompok-${r.nomor_kelompok}` : undefined,
          nama_kelompok: r.nomor_kelompok ? `Kelompok ${String(r.nomor_kelompok).padStart(2, "0")}` : undefined,
          nomor_telepon: r.nomor_telepon?.trim() || undefined,
          alamat: r.alamat?.trim() || undefined,
          is_archived: false,
          created_at: now,
          updated_at: now,
          riwayat_kelompok: [],
          riwayat_gerejawi: [],
        });
        inserted += 1;
      }

      saveMockJemaat(jList);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "IMPORT",
        entity: "jemaat",
        summary: `Mengimpor batch jemaat: ${inserted} berhasil dari ${rows.length} baris`,
      });

      return {
        total_submitted: rows.length,
        total_inserted: inserted,
        failed_records: failed,
      } as unknown as T;
    }

    case "update_user_status": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengubah status akun");
      }
      const userId = String(args.user_id);
      const isActive = Boolean(args.is_active);

      if (currentUser.id === userId && !isActive) {
        throw new Error("Tidak dapat menonaktifkan akun sendiri");
      }

      const users = getMockUsers();
      const target = users.find((u) => u.id === userId);
      if (!target) throw new Error("Akun pengguna tidak ditemukan");

      if (target.role === "ADMIN" && !isActive) {
        const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.is_active && u.id !== userId);
        if (activeAdmins.length === 0) {
          throw new Error("Tidak dapat menonaktifkan satu-satunya Administrator yang aktif");
        }
      }

      target.is_active = isActive;
      saveMockUsers(users);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "UPDATE",
        entity: "users",
        entity_id: userId,
        summary: `${isActive ? "Mengaktifkan" : "Menonaktifkan"} akun: ${target.username}`,
      });

      return null as unknown as T;
    }

    case "change_password": {
      const currentUser = getMockCurrentUser();
      if (!currentUser) throw new Error("Sesi tidak valid");
      const newPw = String(args.new_password);
      if (newPw.length < 8) throw new Error("Password baru minimal 8 karakter");

      const users = getMockUsers();
      const target = users.find((u) => u.id === currentUser.id);
      if (!target) throw new Error("Pengguna tidak ditemukan");

      target.password_hash = `hash_${newPw}`;
      saveMockUsers(users);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "UPDATE",
        entity: "users",
        entity_id: currentUser.id,
        summary: "Mengubah kata sandi akun pribadi",
      });

      return null as unknown as T;
    }

    case "reset_user_password": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mereset password pengguna");
      }
      const userId = String(args.user_id);
      const newPw = String(args.new_password);
      if (newPw.length < 8) throw new Error("Password baru minimal 8 karakter");

      const users = getMockUsers();
      const target = users.find((u) => u.id === userId);
      if (!target) throw new Error("Akun pengguna tidak ditemukan");

      target.password_hash = `hash_${newPw}`;
      saveMockUsers(users);

      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "UPDATE",
        entity: "users",
        entity_id: userId,
        summary: `Administrator mereset password akun: ${target.username}`,
      });

      return null as unknown as T;
    }

    case "get_data_summary": {
      const jList = getMockJemaat().filter((j: any) => !j.is_archived);
      const kList = getMockKeluarga();
      const pList = getMockPeristiwa();
      const peList = getMockPejabat();
      return {
        total_jemaat: jList.length,
        total_keluarga: kList.length,
        total_peristiwa: pList.length,
        total_pejabat: peList.length,
        dummy_status: jList.length > 0 ? "active" : "cleared",
      } as unknown as T;
    }

    case "clear_dummy_data": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak mengosongkan data dummy");
      }
      saveMockJemaat([]);
      saveMockKeluarga([]);
      if (typeof window !== "undefined") {
        localStorage.setItem(MOCK_STORAGE_KEY_PERISTIWA, JSON.stringify([]));
        localStorage.setItem(MOCK_STORAGE_KEY_JABATAN, JSON.stringify([]));
        localStorage.setItem(MOCK_STORAGE_KEY_ATESTASI, JSON.stringify([]));
        localStorage.setItem(MOCK_STORAGE_KEY_KEMATIAN, JSON.stringify([]));
      }
      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "DELETE",
        entity: "system",
        summary: "Mengosongkan seluruh data dummy jemaat, keluarga, dan catatan gerejawi",
      });
      return null as unknown as T;
    }

    case "seed_dummy_data_cmd": {
      const currentUser = getMockCurrentUser();
      if (!currentUser || currentUser.role !== "ADMIN") {
        throw new Error("Akses ditolak: Hanya Administrator yang berhak memuat ulang data dummy");
      }
      saveMockJemaat(INITIAL_MOCK_JEMAAT);
      saveMockKeluarga(INITIAL_MOCK_KELUARGA);
      if (typeof window !== "undefined") {
        localStorage.setItem(MOCK_STORAGE_KEY_PERISTIWA, JSON.stringify(INITIAL_MOCK_PERISTIWA));
        localStorage.setItem(MOCK_STORAGE_KEY_JABATAN, JSON.stringify(INITIAL_MOCK_PEJABAT));
        localStorage.setItem(MOCK_STORAGE_KEY_ATESTASI, JSON.stringify(INITIAL_MOCK_ATESTASI));
        localStorage.setItem(MOCK_STORAGE_KEY_KEMATIAN, JSON.stringify(INITIAL_MOCK_KEMATIAN));
      }
      logMockAuditEntry({
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: "CREATE",
        entity: "system",
        summary: "Memuat ulang data dummy contoh GMIST Maranatha Tahuna",
      });
      return null as unknown as T;
    }

    default:
      throw new Error(`Command ${cmd} tidak dikenali`);
  }
}

