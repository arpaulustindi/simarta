import { describe, it, expect, beforeEach } from "vitest";
import { invokeCommand, MOCK_PELKA, MOCK_JABATAN } from "@/lib/tauri";
import { PelkaSummaryItem, PelkaReviewItem, JabatanItem, PejabatAktifItem } from "@/types";

describe("Tahap 3: Pelka Review Queue & Jabatan Pelayanan Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    // Set up mock admin session in localStorage
    const adminSession = {
      token: "mock-token-admin",
      user: {
        id: "mock-admin-uuid",
        username: "admin",
        role: "ADMIN",
        full_name: "Administrator GMIST",
        is_active: true,
      },
    };
    localStorage.setItem("simarta_mock_session", JSON.stringify(adminSession));
  });

  it("lists pelka summary with all 6 GMIST Pelka categories", async () => {
    const summary = await invokeCommand<PelkaSummaryItem[]>("list_pelka_summary");
    expect(summary).toHaveLength(6);

    const codes = summary.map((p) => p.kode);
    expect(codes).toContain("ANAK");
    expect(codes).toContain("REMAJA");
    expect(codes).toContain("PEMUDA");
    expect(codes).toContain("BAPAK");
    expect(codes).toContain("IBU");
    expect(codes).toContain("LANSIA");

    // All Pelka should have non-negative actual and recommended counts
    for (const p of summary) {
      expect(p.jumlah_anggota_aktual).toBeGreaterThanOrEqual(0);
      expect(p.jumlah_rekomendasi).toBeGreaterThanOrEqual(0);
    }
  });

  it("retrieves the pelka review queue and correctly filters mismatches", async () => {
    const queue = await invokeCommand<PelkaReviewItem[]>("get_pelka_review_queue");
    expect(Array.isArray(queue)).toBe(true);

    // Any jemaat in review queue must have a mismatch or null current pelka
    for (const item of queue) {
      expect(item.rekomendasi_kode).toBeDefined();
      expect(item.rekomendasi_kode).not.toBe("TIDAK_DAPAT_DITENTUKAN");
      expect(item.rekomendasi_kode).not.toBe("BELUM_DITENTUKAN");
      expect(item.pelka_aktual_kode !== item.rekomendasi_kode).toBe(true);
    }
  });

  it("applies pelka mutation when approved by Admin with a valid reason", async () => {
    // 1. Add a jemaat with an outdated pelka to mock storage
    const initialJemaat = [
      {
        id: "j-test-mutation",
        nomor_anggota: "JM-TEST-001",
        nik: "7103011111900001",
        nama_lengkap: "Pemuda Beranjak Bapak",
        tanggal_lahir: "1985-05-10", // age ~41
        jenis_kelamin: "L",
        status_perkawinan: "MENIKAH",
        status_keanggotaan: "AKTIF",
        pelka_id: "pelka-pemuda", // Outdated! Should be Bapak
        nama_pelka: "Pelayanan Kategorial Pemuda",
        kode_pelka: "PEMUDA",
        is_archived: false,
      },
    ];
    localStorage.setItem("simarta_mock_jemaat", JSON.stringify(initialJemaat));

    // 2. Check that this jemaat is in review queue
    const queue = await invokeCommand<PelkaReviewItem[]>("get_pelka_review_queue");
    const item = queue.find((q) => q.jemaat_id === "j-test-mutation");
    expect(item).toBeDefined();
    expect(item?.rekomendasi_kode).toBe("BAPAK");

    // 3. Admin approves mutation
    await invokeCommand("apply_pelka_mutation", {
      input: {
        jemaat_id: "j-test-mutation",
        new_pelka_id: "pelka-bapak",
        reason: "Telah berusia 40+ dan menikah, disahkan Majelis",
      },
    });

    // 4. Verify jemaat is updated and removed from review queue
    const queueAfter = await invokeCommand<PelkaReviewItem[]>("get_pelka_review_queue");
    const itemAfter = queueAfter.find((q) => q.jemaat_id === "j-test-mutation");
    expect(itemAfter).toBeUndefined();
  });

  it("rejects pelka mutation when reason is empty", async () => {
    await expect(
      invokeCommand("apply_pelka_mutation", {
        input: {
          jemaat_id: "j-1",
          new_pelka_id: "pelka-bapak",
          reason: "   ", // Blank reason
        },
      })
    ).rejects.toThrow(/Alasan mutasi Pelka wajib diisi/);
  });

  it("rejects pelka mutation when performed by OPERATOR role", async () => {
    const operatorSession = {
      token: "mock-token-operator",
      user: {
        id: "mock-operator-uuid",
        username: "operator",
        role: "OPERATOR",
        full_name: "Operator Jemaat",
        is_active: true,
      },
    };
    localStorage.setItem("simarta_mock_session", JSON.stringify(operatorSession));

    await expect(
      invokeCommand("apply_pelka_mutation", {
        input: {
          jemaat_id: "j-1",
          new_pelka_id: "pelka-bapak",
          reason: "Usaha mutasi oleh operator",
        },
      })
    ).rejects.toThrow(/Akses ditolak: Hanya Administrator/);
  });

  it("lists all 8 standard GMIST Jabatan Pelayanan", async () => {
    const jabatan = await invokeCommand<JabatanItem[]>("list_jabatan");
    expect(jabatan).toHaveLength(8);

    const names = jabatan.map((j) => j.nama_jabatan);
    expect(names).toContain("Penatua");
    expect(names).toContain("Diaken");
    expect(names).toContain("Ketua Pelka");
    expect(names).toContain("Wakil Ketua Pelka");
    expect(names).toContain("Sekretaris Pelka");
    expect(names).toContain("Bendahara Pelka");
    expect(names).toContain("Koordinator Kelompok");
    expect(names).toContain("Ketua Kelompok");

    const fungsional = jabatan.filter((j) => j.jenis === "FUNGSIONAL");
    const struktural = jabatan.filter((j) => j.jenis === "STRUKTURAL");
    expect(fungsional).toHaveLength(2); // Penatua & Diaken
    expect(struktural).toHaveLength(6);
  });

  it("creates a new appointment (pengangkatan jabatan) and queries active pejabat", async () => {
    const newId = await invokeCommand<string>("create_pengangkatan_jabatan", {
      input: {
        jemaat_id: "j-1",
        jabatan_id: "jab-1", // Penatua
        lingkup: "JEMAAT",
        tanggal_pengangkatan: "2026-01-01",
        keterangan: "Peneguhan Penatua Periode Baru",
      },
    });

    expect(newId).toBeDefined();

    const activeList = await invokeCommand<PejabatAktifItem[]>("list_pejabat_aktif", {
      lingkup: "JEMAAT",
      jabatan_id: "jab-1",
    });

    const found = activeList.find((p) => p.id === newId);
    expect(found).toBeDefined();
    expect(found?.nama_jabatan).toBe("Penatua");
    expect(found?.lingkup).toBe("JEMAAT");
  });

  it("ends term of active pejabat successfully", async () => {
    // 1. Create an appointment
    const newId = await invokeCommand<string>("create_pengangkatan_jabatan", {
      input: {
        jemaat_id: "j-1",
        jabatan_id: "jab-2", // Diaken
        lingkup: "KELOMPOK",
        kelompok_id: "kelompok-1",
        tanggal_pengangkatan: "2024-01-01",
        keterangan: "Diaken Kelompok 1",
      },
    });

    // 2. Akhiri masa jabatan
    await invokeCommand("akhiri_masa_jabatan", {
      input: {
        riwayat_id: newId,
        tanggal_berakhir: "2026-10-01",
        keterangan: "Pindah tempat tugas",
      },
    });

    // 3. Verify it is no longer listed in active list
    const activeList = await invokeCommand<PejabatAktifItem[]>("list_pejabat_aktif");
    const found = activeList.find((p) => p.id === newId);
    expect(found).toBeUndefined();
  });
});
