import { describe, it, expect } from "vitest";
import { calculatePelkaRecommendation } from "@/lib/pelka";

describe("Tahap 2: Jemaat & Pelka Recommendation Integration", () => {
  it("harus menyarankan Pelka Pemuda untuk jemaat usia 25 tahun belum menikah", () => {
    const rec = calculatePelkaRecommendation("2001-04-12", "L", "BELUM_MENIKAH", new Date("2026-10-24"));
    expect(rec.kode).toBe("PEMUDA");
    expect(rec.nama_pelka).toBe("Pelka Pemuda");
    expect(rec.usia).toBe(25);
  });

  it("harus menyarankan Pelka Bapak untuk jemaat laki-laki usia 28 tahun yang sudah menikah", () => {
    const rec = calculatePelkaRecommendation("1998-05-20", "L", "MENIKAH", new Date("2026-10-24"));
    expect(rec.kode).toBe("BAPAK");
    expect(rec.nama_pelka).toBe("Pelka Bapak");
  });

  it("harus menyarankan Pelka Ibu untuk jemaat perempuan usia 30 tahun yang sudah menikah", () => {
    const rec = calculatePelkaRecommendation("1996-01-15", "P", "MENIKAH", new Date("2026-10-24"));
    expect(rec.kode).toBe("IBU");
    expect(rec.nama_pelka).toBe("Pelka Ibu");
  });

  it("harus menyarankan Pelka Lansia untuk warga jemaat usia tepat 60 tahun ke atas", () => {
    const rec = calculatePelkaRecommendation("1966-10-24", "L", "MENIKAH", new Date("2026-10-24"));
    expect(rec.kode).toBe("LANSIA");
    expect(rec.usia).toBe(60);
  });

  it("harus menolak atau memberi tanda khusus bagi usia muda dengan status cerai", () => {
    const rec = calculatePelkaRecommendation("1999-03-10", "P", "CERAI_HIDUP", new Date("2026-10-24"));
    expect(rec.kode).toBe("BELUM_DITENTUKAN");
  });
});
