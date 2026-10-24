import { PelkaRecommendation } from "@/types";

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function calculateAge(birthDateStr: string, refDate: Date = new Date()): number | null {
  const parts = birthDateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [bYear, bMonth, bDay] = parts;
  if (!bYear || !bMonth || !bDay) return null;

  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth() + 1; // 1-12
  const refDay = refDate.getDate();

  let age = refYear - bYear;

  // Check leap year 29 Feb rule: celebrated March 1 in non-leap year
  let isTargetBdayPassed: boolean;
  if (bMonth === 2 && bDay === 29 && !isLeapYear(refYear)) {
    // Celebrate March 1
    isTargetBdayPassed = refMonth > 3 || (refMonth === 3 && refDay >= 1);
  } else {
    isTargetBdayPassed = refMonth > bMonth || (refMonth === bMonth && refDay >= bDay);
  }

  if (!isTargetBdayPassed) {
    age -= 1;
  }

  return age < 0 ? null : age;
}

export function calculatePelkaRecommendation(
  birthDateStr: string,
  gender: string,
  maritalStatus: string,
  refDate: Date = new Date()
): PelkaRecommendation {
  if (!birthDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
    return {
      kode: "TIDAK_DAPAT_DITENTUKAN",
      nama_pelka: "Data Belum Lengkap",
      alasan: "Format tanggal lahir tidak valid (wajib YYYY-MM-DD)",
      is_applicable: false,
    };
  }

  const age = calculateAge(birthDateStr, refDate);
  if (age === null) {
    return {
      kode: "TIDAK_DAPAT_DITENTUKAN",
      nama_pelka: "Data Belum Lengkap",
      alasan: "Tanggal lahir tidak valid atau berada di masa depan",
      is_applicable: false,
    };
  }

  const normGender = (gender || "").trim().toUpperCase();
  const normMarital = (maritalStatus || "").trim().toUpperCase();

  if (normGender !== "L" && normGender !== "P") {
    return {
      kode: "TIDAK_DAPAT_DITENTUKAN",
      nama_pelka: "Data Belum Lengkap",
      usia: age,
      alasan: "Jenis kelamin belum ditentukan (wajib L atau P)",
      is_applicable: false,
    };
  }

  // 1. Lansia: Usia >= 60 tahun
  if (age >= 60) {
    return {
      kode: "LANSIA",
      nama_pelka: "Pelka Lansia",
      usia: age,
      alasan: `Usia ${age} tahun (memenuhi kriteria Lansia >= 60 tahun)`,
      is_applicable: true,
    };
  }

  // 2. Anak: Usia 0 - 12 tahun
  if (age <= 12) {
    return {
      kode: "ANAK",
      nama_pelka: "Pelka Anak",
      usia: age,
      alasan: `Usia ${age} tahun (memenuhi kriteria Anak 0 - 12 tahun)`,
      is_applicable: true,
    };
  }

  // 3. Remaja: Usia 13 - 16 tahun
  if (age >= 13 && age <= 16) {
    return {
      kode: "REMAJA",
      nama_pelka: "Pelka Remaja",
      usia: age,
      alasan: `Usia ${age} tahun (memenuhi kriteria Remaja 13 - 16 tahun)`,
      is_applicable: true,
    };
  }

  // 4. Usia 17 - 35 tahun
  if (age >= 17 && age <= 35) {
    if (normMarital === "BELUM_MENIKAH") {
      return {
        kode: "PEMUDA",
        nama_pelka: "Pelka Pemuda",
        usia: age,
        alasan: `Usia ${age} tahun dan belum menikah (kriteria Pemuda)`,
        is_applicable: true,
      };
    } else if (normMarital === "MENIKAH") {
      if (normGender === "L") {
        return {
          kode: "BAPAK",
          nama_pelka: "Pelka Bapak",
          usia: age,
          alasan: `Laki-laki usia ${age} tahun dan sudah menikah (kriteria Bapak)`,
          is_applicable: true,
        };
      } else {
        return {
          kode: "IBU",
          nama_pelka: "Pelka Ibu",
          usia: age,
          alasan: `Perempuan usia ${age} tahun dan sudah menikah (kriteria Ibu)`,
          is_applicable: true,
        };
      }
    } else if (normMarital === "CERAI_HIDUP" || normMarital === "CERAI_MATI") {
      return {
        kode: "BELUM_DITENTUKAN",
        nama_pelka: "Belum Ditentukan",
        usia: age,
        alasan: `Usia ${age} tahun dengan status perkawinan ${normMarital}. Rekomendasi menunggu ketetapan Admin/Majelis Jemaat.`,
        is_applicable: false,
      };
    } else {
      return {
        kode: "TIDAK_DAPAT_DITENTUKAN",
        nama_pelka: "Data Belum Lengkap",
        usia: age,
        alasan: "Status perkawinan belum diisi dengan benar",
        is_applicable: false,
      };
    }
  }

  // 5. Usia 36 - 59 tahun
  if (age >= 36 && age <= 59) {
    if (normGender === "L") {
      return {
        kode: "BAPAK",
        nama_pelka: "Pelka Bapak",
        usia: age,
        alasan: `Laki-laki usia ${age} tahun (kriteria Bapak dewasa 36-59 tahun)`,
        is_applicable: true,
      };
    } else {
      return {
        kode: "IBU",
        nama_pelka: "Pelka Ibu",
        usia: age,
        alasan: `Perempuan usia ${age} tahun (kriteria Ibu dewasa 36-59 tahun)`,
        is_applicable: true,
      };
    }
  }

  return {
    kode: "TIDAK_DAPAT_DITENTUKAN",
    nama_pelka: "Tidak Diketahui",
    usia: age,
    alasan: "Kombinasi data tidak memenuhi aturan rekomendasi yang terdaftar",
    is_applicable: false,
  };
}
