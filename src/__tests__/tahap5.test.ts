import { describe, it, expect, beforeEach } from "vitest";
import { invokeCommand } from "@/lib/tauri";
import {
  AuditLogPaginationResult,
  BackupFileInfo,
  BackupResult,
  JemaatExportRow,
  KeluargaExportRow,
  JemaatImportRow,
  ImportSummary,
} from "@/types";

describe("Tahap 5: Impor/Ekspor, Backup/Restore, Audit Log, dan Pengaturan Sistem", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const setupAdminSession = () => {
    const adminUser = {
      id: "u-admin",
      username: "admin",
      role: "ADMIN" as const,
      full_name: "Administrator Utama",
      is_active: true,
    };
    localStorage.setItem(
      "simarta_mock_session",
      JSON.stringify({ token: "token-admin-xyz", user: adminUser })
    );
    localStorage.setItem(
      "simarta_mock_users",
      JSON.stringify([
        {
          id: "u-admin",
          username: "admin",
          password_hash: "hash_Admin123!",
          role: "ADMIN",
          full_name: "Administrator Utama",
          is_active: true,
        },
      ])
    );
    return adminUser;
  };

  const setupOperatorSession = () => {
    const operatorUser = {
      id: "u-op",
      username: "operator1",
      role: "OPERATOR" as const,
      full_name: "Operator Staf",
      is_active: true,
    };
    localStorage.setItem(
      "simarta_mock_session",
      JSON.stringify({ token: "token-op-xyz", user: operatorUser })
    );
    localStorage.setItem(
      "simarta_mock_users",
      JSON.stringify([
        {
          id: "u-admin",
          username: "admin",
          password_hash: "hash_Admin123!",
          role: "ADMIN",
          full_name: "Administrator Utama",
          is_active: true,
        },
        {
          id: "u-op",
          username: "operator1",
          password_hash: "hash_Operator123!",
          role: "OPERATOR",
          full_name: "Operator Staf",
          is_active: true,
        },
      ])
    );
    return operatorUser;
  };

  // 1. Audit Log Tests
  describe("Audit Log Explorer", () => {
    it("memperbolehkan Admin melihat log audit dengan pagination & filter", async () => {
      setupAdminSession();

      const res: AuditLogPaginationResult = await invokeCommand("list_audit_logs", {
        token: "token-admin-xyz",
        filter: { page: 1, page_size: 10 },
      });

      expect(res.items).toBeDefined();
      expect(res.total_records).toBeGreaterThan(0);
      expect(res.page).toBe(1);
    });

    it("menolak Operator mengakses audit log", async () => {
      setupOperatorSession();

      await expect(
        invokeCommand("list_audit_logs", {
          token: "token-op-xyz",
          filter: {},
        })
      ).rejects.toThrow("Akses ditolak: Hanya Administrator");
    });
  });

  // 2. Backup & Restore Tests
  describe("Database Backup & Restore", () => {
    it("memperbolehkan Admin membuat snapshot backup dan melihat daftar file", async () => {
      setupAdminSession();

      const backup: BackupResult = await invokeCommand("create_database_backup", {
        token: "token-admin-xyz",
      });

      expect(backup.file_name).toMatch(/^simarta_backup_\d+\.db$/);
      expect(backup.file_size_bytes).toBeGreaterThan(0);

      const list: BackupFileInfo[] = await invokeCommand("list_backups", {
        token: "token-admin-xyz",
      });
      expect(list.some((b) => b.file_name === backup.file_name)).toBe(true);
    });

    it("menolak Operator membuat atau melihat backup", async () => {
      setupOperatorSession();

      await expect(
        invokeCommand("create_database_backup", { token: "token-op-xyz" })
      ).rejects.toThrow("Akses ditolak: Hanya Administrator");

      await expect(
        invokeCommand("list_backups", { token: "token-op-xyz" })
      ).rejects.toThrow("Akses ditolak: Hanya Administrator");
    });

    it("memperbolehkan Admin memulihkan database dari snapshot", async () => {
      setupAdminSession();

      const res = await invokeCommand("restore_database_from_backup", {
        token: "token-admin-xyz",
        backup_path: "/data/simarta/backups/simarta_backup_20260102_000000.db",
      });
      expect(res).toBeNull();
    });
  });

  // 3. Impor & Ekspor Excel Tests
  describe("Impor & Ekspor Data Excel", () => {
    it("menghasilkan data siap ekspor untuk Jemaat dan Keluarga", async () => {
      setupAdminSession();

      const jemaatRows: JemaatExportRow[] = await invokeCommand("get_export_jemaat_data", {
        token: "token-admin-xyz",
      });
      expect(Array.isArray(jemaatRows)).toBe(true);
      expect(jemaatRows.length).toBeGreaterThan(0);
      expect(jemaatRows[0].nomor_anggota).toBeDefined();
      expect(jemaatRows[0].nama_lengkap).toBeDefined();

      const keluargaRows: KeluargaExportRow[] = await invokeCommand("get_export_keluarga_data", {
        token: "token-admin-xyz",
      });
      expect(Array.isArray(keluargaRows)).toBe(true);
      expect(keluargaRows[0].nomor_keluarga).toBeDefined();
    });

    it("Admin berhasil mengimpor batch jemaat dengan auto-penentuan Pelka", async () => {
      setupAdminSession();

      const batchRows: JemaatImportRow[] = [
        {
          nik: "7103011111180001",
          nama_lengkap: "Anak Impor Uji",
          tempat_lahir: "Tahuna",
          tanggal_lahir: "2018-05-10",
          jenis_kelamin: "L",
          status_perkawinan: "BELUM_MENIKAH",
          nomor_kelompok: "01",
        },
        {
          nik: "7103012222850002",
          nama_lengkap: "Ibu Impor Uji",
          tempat_lahir: "Tahuna",
          tanggal_lahir: "1985-08-15",
          jenis_kelamin: "P",
          status_perkawinan: "MENIKAH",
          nomor_kelompok: "02",
        },
      ];

      const summary: ImportSummary = await invokeCommand("import_jemaat_batch", {
        token: "token-admin-xyz",
        rows: batchRows,
      });

      expect(summary.total_submitted).toBe(2);
      expect(summary.total_inserted).toBe(2);
      expect(summary.failed_records.length).toBe(0);
    });

    it("menolak Operator melakukan impor data jemaat", async () => {
      setupOperatorSession();

      await expect(
        invokeCommand("import_jemaat_batch", {
          token: "token-op-xyz",
          rows: [{ nama_lengkap: "Tes", tanggal_lahir: "2000-01-01", jenis_kelamin: "L", status_perkawinan: "BELUM_MENIKAH" }],
        })
      ).rejects.toThrow("Akses ditolak: Hanya Administrator");
    });
  });

  // 4. User Management & Security Tests
  describe("Manajemen Pengguna & Keamanan Akun", () => {
    it("Admin dapat membuat akun baru, mengubah status, dan mereset password", async () => {
      setupAdminSession();

      // Buat user
      const newUser = await invokeCommand("create_user", {
        token: "token-admin-xyz",
        username: "operator_baru",
        password: "PasswordBaru123!",
        role: "OPERATOR",
        full_name: "Operator Baru Terdaftar",
      });
      expect(newUser).toBeDefined();

      // Reset password user oleh Admin
      const resReset = await invokeCommand("reset_user_password", {
        token: "token-admin-xyz",
        user_id: (newUser as any).id,
        new_password: "ResetPassword123!",
      });
      expect(resReset).toBeNull();

      // Nonaktifkan user
      const resStatus = await invokeCommand("update_user_status", {
        token: "token-admin-xyz",
        user_id: (newUser as any).id,
        is_active: false,
      });
      expect(resStatus).toBeNull();
    });

    it("mencegah Admin menonaktifkan akun miliknya sendiri", async () => {
      const admin = setupAdminSession();

      await expect(
        invokeCommand("update_user_status", {
          token: "token-admin-xyz",
          user_id: admin.id,
          is_active: false,
        })
      ).rejects.toThrow("Tidak dapat menonaktifkan akun sendiri");
    });

    it("pengguna dapat mengubah kata sandi pribadi dengan validasi password lama", async () => {
      setupAdminSession();

      const res = await invokeCommand("change_password", {
        token: "token-admin-xyz",
        old_password: "Admin123!",
        new_password: "SuperSecretPassword123!",
      });
      expect(res).toBeNull();

      // Gagal jika password baru kurang dari 8 karakter
      await expect(
        invokeCommand("change_password", {
          token: "token-admin-xyz",
          old_password: "SuperSecretPassword123!",
          new_password: "short",
        })
      ).rejects.toThrow("minimal 8 karakter");
    });
  });
});
