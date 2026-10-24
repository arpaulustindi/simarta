import { describe, it, expect } from "vitest";
import { calculatePelkaRecommendation, calculateAge, isLeapYear } from "@/lib/pelka";

describe("Pelka Recommendation Engine & Age Calculations", () => {
  it("correctly identifies leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2020)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2100)).toBe(false);
  });

  it("handles Feb 29 leap year birthday correctly in non-leap year (celebrated March 1)", () => {
    // Born on Feb 29, 2004
    // On Feb 28, 2025 (non-leap year), age should be 20
    const refFeb28 = new Date(2025, 1, 28); // Month is 0-indexed: 1 = Feb
    expect(calculateAge("2004-02-29", refFeb28)).toBe(20);

    // On March 1, 2025, birthday has arrived -> 21
    const refMar01 = new Date(2025, 2, 1); // 2 = March
    expect(calculateAge("2004-02-29", refMar01)).toBe(21);
  });

  it("recommends Lansia for age 60 and above", () => {
    const refDate = new Date(2026, 0, 1);
    const recPria = calculatePelkaRecommendation("1966-01-01", "L", "MENIKAH", refDate);
    expect(recPria.kode).toBe("LANSIA");
    expect(recPria.usia).toBe(60);
    expect(recPria.is_applicable).toBe(true);

    const recWanita = calculatePelkaRecommendation("1960-05-10", "P", "BELUM_MENIKAH", refDate);
    expect(recWanita.kode).toBe("LANSIA");
  });

  it("recommends Anak for age 0 - 12", () => {
    const refDate = new Date(2026, 5, 1);
    const recAnak = calculatePelkaRecommendation("2014-06-01", "L", "BELUM_MENIKAH", refDate);
    expect(recAnak.kode).toBe("ANAK");
    expect(recAnak.usia).toBe(12);
  });

  it("recommends Remaja for age 13 - 16", () => {
    const refDate = new Date(2026, 5, 1);
    const rec13 = calculatePelkaRecommendation("2013-06-01", "P", "BELUM_MENIKAH", refDate);
    expect(rec13.kode).toBe("REMAJA");
    expect(rec13.usia).toBe(13);

    const rec16 = calculatePelkaRecommendation("2010-06-01", "L", "BELUM_MENIKAH", refDate);
    expect(rec16.kode).toBe("REMAJA");
    expect(rec16.usia).toBe(16);
  });

  it("recommends Pemuda for age 17 - 35 and belum menikah", () => {
    const refDate = new Date(2026, 0, 1);
    const rec17 = calculatePelkaRecommendation("2009-01-01", "L", "BELUM_MENIKAH", refDate);
    expect(rec17.kode).toBe("PEMUDA");
    expect(rec17.usia).toBe(17);

    const rec35 = calculatePelkaRecommendation("1991-01-01", "P", "BELUM_MENIKAH", refDate);
    expect(rec35.kode).toBe("PEMUDA");
    expect(rec35.usia).toBe(35);
  });

  it("recommends Bapak / Ibu for age under 36 and sudah menikah", () => {
    const refDate = new Date(2026, 0, 1);
    const recBapak = calculatePelkaRecommendation("1995-01-01", "L", "MENIKAH", refDate);
    expect(recBapak.kode).toBe("BAPAK");
    expect(recBapak.usia).toBe(31);

    const recIbu = calculatePelkaRecommendation("1995-01-01", "P", "MENIKAH", refDate);
    expect(recIbu.kode).toBe("IBU");
    expect(recIbu.usia).toBe(31);
  });

  it("recommends Bapak for male age 36 - 59 regardless of marital status", () => {
    const refDate = new Date(2026, 0, 1);
    const recBapakBelumNikah = calculatePelkaRecommendation("1990-01-01", "L", "BELUM_MENIKAH", refDate);
    expect(recBapakBelumNikah.kode).toBe("BAPAK");
    expect(recBapakBelumNikah.usia).toBe(36);
  });

  it("recommends Ibu for female age 36 - 59 regardless of marital status", () => {
    const refDate = new Date(2026, 0, 1);
    const recIbuCerai = calculatePelkaRecommendation("1970-01-01", "P", "CERAI_HIDUP", refDate);
    expect(recIbuCerai.kode).toBe("IBU");
    expect(recIbuCerai.usia).toBe(56);
  });

  it("returns BELUM_DITENTUKAN for divorced youth (17 - 35)", () => {
    const refDate = new Date(2026, 0, 1);
    const recCerai = calculatePelkaRecommendation("2000-01-01", "L", "CERAI_HIDUP", refDate);
    expect(recCerai.kode).toBe("BELUM_DITENTUKAN");
    expect(recCerai.is_applicable).toBe(false);
  });

  it("returns TIDAK_DAPAT_DITENTUKAN for invalid birth date or missing data", () => {
    const recInvDate = calculatePelkaRecommendation("not-a-date", "L", "MENIKAH");
    expect(recInvDate.kode).toBe("TIDAK_DAPAT_DITENTUKAN");
    expect(recInvDate.is_applicable).toBe(false);

    const recInvGender = calculatePelkaRecommendation("2000-01-01", "X", "MENIKAH");
    expect(recInvGender.kode).toBe("TIDAK_DAPAT_DITENTUKAN");
  });
});
