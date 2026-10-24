import { describe, it, expect, beforeEach } from "vitest";
import { invokeCommand } from "@/lib/tauri";
import {
  PeristiwaGerejawiItem,
  AtestasiItem,
  KematianItem,
  JemaatListItem,
  PejabatAktifItem,
} from "@/types";

describe("Tahap 4: Peristiwa Gerejawi, Atestasi, dan Kematian Tests", () => {
  beforeEach(() => {
    localStorage.clear();
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

  it("lists seeded peristiwa gerejawi correctly", async () => {
    const list = await invokeCommand<PeristiwaGerejawiItem[]>("list_peristiwa_gerejawi");
    expect(list.length).toBeGreaterThanOrEqual(3);

    const jenisList = list.map((p) => p.jenis_peristiwa);
    expect(jenisList).toContain("BAPTIS");
    expect(jenisList).toContain("SIDI");
    expect(jenisList).toContain("PERKAWINAN");
  });

  it("creates a new baptis or sidi event by Admin and checks record", async () => {
    const newId = await invokeCommand<string>("create_peristiwa_gerejawi", {
      input: {
        jemaat_id: "j-1",
        jenis_peristiwa: "SIDI",
        tanggal_peristiwa: "2026-04-05",
        tempat: "GMIST Maranatha Tahuna",
        pelayan_firman: "Pdt. J. Gaghana, S.Th",
        nomor_surat: "SIDI/2026/099",
        keterangan: "Peneguhan sidi angkatan 2026",
      },
    });

    expect(newId).toBeDefined();

    const list = await invokeCommand<PeristiwaGerejawiItem[]>("list_peristiwa_gerejawi", {
      jenis_peristiwa: "SIDI",
      search: "SIDI/2026/099",
    });

    const found = list.find((p) => p.id === newId);
    expect(found).toBeDefined();
    expect(found?.pelayan_firman).toBe("Pdt. J. Gaghana, S.Th");
    expect(found?.nomor_surat).toBe("SIDI/2026/099");
  });

  it("creates sacred marriage and mutates both spouses' marital status to MENIKAH", async () => {
    // Both j-1 and j-2 are available
    // Set j-1 to BELUM_MENIKAH
    const jList = [
      {
        id: "j-m1",
        nomor_anggota: "JM-2026-M1",
        nik: "7103011111950001",
        nama_lengkap: "Pria Pengantin",
        tanggal_lahir: "1995-04-10",
        jenis_kelamin: "L",
        status_perkawinan: "BELUM_MENIKAH",
        status_keanggotaan: "AKTIF",
        is_archived: false,
      },
      {
        id: "j-m2",
        nomor_anggota: "JM-2026-M2",
        nik: "7103012222970002",
        nama_lengkap: "Wanita Pengantin",
        tanggal_lahir: "1997-08-25",
        jenis_kelamin: "P",
        status_perkawinan: "BELUM_MENIKAH",
        status_keanggotaan: "AKTIF",
        is_archived: false,
      },
    ];
    localStorage.setItem("simarta_mock_jemaat", JSON.stringify(jList));

    const newId = await invokeCommand<string>("create_perkawinan_gerejawi", {
      input: {
        mempelai_1_id: "j-m1",
        mempelai_2_id: "j-m2",
        tanggal_perkawinan: "2026-06-20",
        tempat: "GMIST Maranatha Tahuna",
        pelayan_firman: "Pdt. M. Sasundu, M.Th",
        nomor_surat: "NIK/2026/055",
        keterangan: "Diberkati dalam ibadah kudus",
      },
    });

    expect(newId).toBeDefined();

    // Verify both jemaat now have status MENIKAH
    const updatedJList = JSON.parse(localStorage.getItem("simarta_mock_jemaat") || "[]");
    const m1 = updatedJList.find((j: any) => j.id === "j-m1");
    const m2 = updatedJList.find((j: any) => j.id === "j-m2");

    expect(m1.status_perkawinan).toBe("MENIKAH");
    expect(m1.tanggal_menikah).toBe("2026-06-20");
    expect(m2.status_perkawinan).toBe("MENIKAH");
    expect(m2.tanggal_menikah).toBe("2026-06-20");
  });

  it("creates atestasi keluar, marks status PINDAH, and ends active appointment", async () => {
    // 1. Prepare jemaat with active appointment
    const jList = [
      {
        id: "j-pindah",
        nomor_anggota: "JM-PINDAH-01",
        nik: "7103013333850001",
        nama_lengkap: "Pnt. Markus Tatengkeng",
        tanggal_lahir: "1985-05-15",
        jenis_kelamin: "L",
        status_perkawinan: "MENIKAH",
        status_keanggotaan: "AKTIF",
        is_archived: false,
      },
    ];
    localStorage.setItem("simarta_mock_jemaat", JSON.stringify(jList));

    const pList = [
      {
        id: "pej-1",
        jemaat_id: "j-pindah",
        jabatan_id: "jab-1",
        nama_jabatan: "Penatua",
        lingkup: "JEMAAT",
        tanggal_pengangkatan: "2024-01-01",
      },
    ];
    localStorage.setItem("simarta_mock_jabatan_pejabat", JSON.stringify(pList));

    // 2. Create atestasi keluar
    const atId = await invokeCommand<string>("create_atestasi_keluar", {
      input: {
        jemaat_id: "j-pindah",
        gereja_tujuan: "GMIST Imanuel Ondong",
        tanggal_keluar: "2026-07-01",
        nomor_surat: "AT-K/2026/020",
        alasan: "Pindah dinas kerja",
      },
    });

    expect(atId).toBeDefined();

    // 3. Verify status updated to PINDAH
    const updatedJList = JSON.parse(localStorage.getItem("simarta_mock_jemaat") || "[]");
    const jemaat = updatedJList.find((j: any) => j.id === "j-pindah");
    expect(jemaat.status_keanggotaan).toBe("PINDAH");

    // 4. Verify appointment has ended
    const updatedPList = JSON.parse(localStorage.getItem("simarta_mock_jabatan_pejabat") || "[]");
    const pejabat = updatedPList.find((p: any) => p.jemaat_id === "j-pindah");
    expect(pejabat.tanggal_berakhir).toBe("2026-07-01");
    expect(pejabat.keterangan).toContain("Pindah Jemaat");
  });

  it("records bereavement / kematian, marks status MENINGGAL, and archives member", async () => {
    const jList = [
      {
        id: "j-duka",
        nomor_anggota: "JM-DUKA-01",
        nik: "7103014444350001",
        nama_lengkap: "Oma Martha Sasundu",
        tanggal_lahir: "1935-10-12",
        jenis_kelamin: "P",
        status_perkawinan: "CERAI_MATI",
        status_keanggotaan: "AKTIF",
        is_archived: false,
      },
    ];
    localStorage.setItem("simarta_mock_jemaat", JSON.stringify(jList));

    const kmId = await invokeCommand<string>("catat_kematian", {
      input: {
        jemaat_id: "j-duka",
        tanggal_meninggal: "2026-08-14",
        tempat_meninggal: "RSUD Liun Kendage",
        tempat_pemakaman: "TPU Sawang Bendar",
        pelayan_pemakaman: "Pdt. M. Sasundu, M.Th",
        nomor_surat_kematian: "SKM/2026/077",
        keterangan: "Tutup usia 90 tahun",
      },
    });

    expect(kmId).toBeDefined();

    // Verify member is archived & status is MENINGGAL
    const updatedJList = JSON.parse(localStorage.getItem("simarta_mock_jemaat") || "[]");
    const jemaat = updatedJList.find((j: any) => j.id === "j-duka");
    expect(jemaat.status_keanggotaan).toBe("MENINGGAL");
    expect(jemaat.is_archived).toBe(true);
    expect(jemaat.tanggal_meninggal).toBe("2026-08-14");

    // Verify death record appears in list_kematian
    const kmList = await invokeCommand<KematianItem[]>("list_kematian", {
      search: "Martha Sasundu",
    });
    const found = kmList.find((k) => k.jemaat_id === "j-duka");
    expect(found).toBeDefined();
    expect(found?.tempat_pemakaman).toBe("TPU Sawang Bendar");
  });

  it("rejects mutasi events when performed by OPERATOR", async () => {
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
      invokeCommand("create_peristiwa_gerejawi", {
        input: {
          jemaat_id: "j-1",
          jenis_peristiwa: "BAPTIS",
          tanggal_peristiwa: "2026-01-01",
        },
      })
    ).rejects.toThrow(/Akses ditolak: Hanya Administrator/);

    await expect(
      invokeCommand("create_atestasi_keluar", {
        input: {
          jemaat_id: "j-1",
          gereja_tujuan: "Gereja Lain",
          tanggal_keluar: "2026-01-01",
          alasan: "Pindah",
        },
      })
    ).rejects.toThrow(/Akses ditolak: Hanya Administrator/);

    await expect(
      invokeCommand("catat_kematian", {
        input: {
          jemaat_id: "j-1",
          tanggal_meninggal: "2026-01-01",
        },
      })
    ).rejects.toThrow(/Akses ditolak: Hanya Administrator/);
  });
});
