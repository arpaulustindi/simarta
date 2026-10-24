use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PelkaRecommendation {
    pub kode: String, // ANAK, REMAJA, PEMUDA, BAPAK, IBU, LANSIA, BELUM_DITENTUKAN, TIDAK_DAPAT_DITENTUKAN
    pub nama_pelka: String,
    pub usia: Option<u32>,
    pub alasan: String,
    pub is_applicable: bool,
}

pub fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

pub fn calculate_age(birth_date: NaiveDate, ref_date: NaiveDate) -> Option<u32> {
    if ref_date < birth_date {
        return None;
    }

    let mut age = ref_date.year() - birth_date.year();

    // Check if birthday has occurred in the ref_date year
    let b_month = birth_date.month();
    let b_day = birth_date.day();

    let birthday_this_year = if b_month == 2 && b_day == 29 && !is_leap_year(ref_date.year()) {
        // In non-leap years, 29 Feb birthday is celebrated on March 1
        NaiveDate::from_ymd_opt(ref_date.year(), 3, 1)
    } else {
        NaiveDate::from_ymd_opt(ref_date.year(), b_month, b_day)
    };

    if let Some(bday) = birthday_this_year {
        if ref_date < bday {
            age -= 1;
        }
    }

    if age < 0 {
        Some(0)
    } else {
        Some(age as u32)
    }
}

pub fn calculate_pelka_recommendation(
    birth_date_str: &str,
    gender: &str,          // 'L' atau 'P'
    marital_status: &str,  // 'BELUM_MENIKAH', 'MENIKAH', 'CERAI_HIDUP', 'CERAI_MATI'
    ref_date_opt: Option<NaiveDate>,
) -> PelkaRecommendation {
    let ref_date = ref_date_opt.unwrap_or_else(|| Utc::now().date_naive());

    // Validasi parse tanggal lahir
    let birth_date = match NaiveDate::parse_from_str(birth_date_str, "%Y-%m-%d") {
        Ok(d) => d,
        Err(_) => {
            return PelkaRecommendation {
                kode: "TIDAK_DAPAT_DITENTUKAN".to_string(),
                nama_pelka: "Data Belum Lengkap".to_string(),
                usia: None,
                alasan: "Format tanggal lahir tidak valid (wajib YYYY-MM-DD)".to_string(),
                is_applicable: false,
            };
        }
    };

    let age = match calculate_age(birth_date, ref_date) {
        Some(a) => a,
        None => {
            return PelkaRecommendation {
                kode: "TIDAK_DAPAT_DITENTUKAN".to_string(),
                nama_pelka: "Data Belum Lengkap".to_string(),
                usia: None,
                alasan: "Tanggal lahir berada di masa depan".to_string(),
                is_applicable: false,
            };
        }
    };

    let norm_gender = gender.trim().to_uppercase();
    let norm_marital = marital_status.trim().to_uppercase();

    if norm_gender != "L" && norm_gender != "P" {
        return PelkaRecommendation {
            kode: "TIDAK_DAPAT_DITENTUKAN".to_string(),
            nama_pelka: "Data Belum Lengkap".to_string(),
            usia: Some(age),
            alasan: "Jenis kelamin belum ditentukan (wajib L atau P)".to_string(),
            is_applicable: false,
        };
    }

    // Aturan 1: Usia >= 60 tahun -> Lansia
    if age >= 60 {
        return PelkaRecommendation {
            kode: "LANSIA".to_string(),
            nama_pelka: "Pelka Lansia".to_string(),
            usia: Some(age),
            alasan: format!("Usia {} tahun (memenuhi kriteria Lansia >= 60 tahun)", age),
            is_applicable: true,
        };
    }

    // Aturan 2: Usia 0 - 12 tahun -> Anak
    if age <= 12 {
        return PelkaRecommendation {
            kode: "ANAK".to_string(),
            nama_pelka: "Pelka Anak".to_string(),
            usia: Some(age),
            alasan: format!("Usia {} tahun (memenuhi kriteria Anak 0 - 12 tahun)", age),
            is_applicable: true,
        };
    }

    // Aturan 3: Usia 13 - 16 tahun -> Remaja
    if age >= 13 && age <= 16 {
        return PelkaRecommendation {
            kode: "REMAJA".to_string(),
            nama_pelka: "Pelka Remaja".to_string(),
            usia: Some(age),
            alasan: format!("Usia {} tahun (memenuhi kriteria Remaja 13 - 16 tahun)", age),
            is_applicable: true,
        };
    }

    // Aturan 4: Usia 17 - 35 tahun
    if age >= 17 && age <= 35 {
        if norm_marital == "BELUM_MENIKAH" {
            return PelkaRecommendation {
                kode: "PEMUDA".to_string(),
                nama_pelka: "Pelka Pemuda".to_string(),
                usia: Some(age),
                alasan: format!("Usia {} tahun dan belum menikah (kriteria Pemuda)", age),
                is_applicable: true,
            };
        } else if norm_marital == "MENIKAH" {
            if norm_gender == "L" {
                return PelkaRecommendation {
                    kode: "BAPAK".to_string(),
                    nama_pelka: "Pelka Bapak".to_string(),
                    usia: Some(age),
                    alasan: format!("Laki-laki usia {} tahun dan sudah menikah (kriteria Bapak)", age),
                    is_applicable: true,
                };
            } else {
                return PelkaRecommendation {
                    kode: "IBU".to_string(),
                    nama_pelka: "Pelka Ibu".to_string(),
                    usia: Some(age),
                    alasan: format!("Perempuan usia {} tahun dan sudah menikah (kriteria Ibu)", age),
                    is_applicable: true,
                };
            }
        } else if norm_marital == "CERAI_HIDUP" || norm_marital == "CERAI_MATI" {
            return PelkaRecommendation {
                kode: "BELUM_DITENTUKAN".to_string(),
                nama_pelka: "Belum Ditentukan".to_string(),
                usia: Some(age),
                alasan: format!(
                    "Usia {} tahun dengan status perkawinan {}. Rekomendasi menunggu ketetapan Admin/Majelis Jemaat.",
                    age, norm_marital
                ),
                is_applicable: false,
            };
        } else {
            return PelkaRecommendation {
                kode: "TIDAK_DAPAT_DITENTUKAN".to_string(),
                nama_pelka: "Data Belum Lengkap".to_string(),
                usia: Some(age),
                alasan: "Status perkawinan tidak dikenali".to_string(),
                is_applicable: false,
            };
        }
    }

    // Aturan 5: Usia 36 - 59 tahun
    if age >= 36 && age <= 59 {
        if norm_gender == "L" {
            return PelkaRecommendation {
                kode: "BAPAK".to_string(),
                nama_pelka: "Pelka Bapak".to_string(),
                usia: Some(age),
                alasan: format!("Laki-laki usia {} tahun (kriteria Bapak dewasa 36-59 tahun)", age),
                is_applicable: true,
            };
        } else {
            return PelkaRecommendation {
                kode: "IBU".to_string(),
                nama_pelka: "Pelka Ibu".to_string(),
                usia: Some(age),
                alasan: format!("Perempuan usia {} tahun (kriteria Ibu dewasa 36-59 tahun)", age),
                is_applicable: true,
            };
        }
    }

    PelkaRecommendation {
        kode: "TIDAK_DAPAT_DITENTUKAN".to_string(),
        nama_pelka: "Tidak Diketahui".to_string(),
        usia: Some(age),
        alasan: "Kombinasi data tidak memenuhi aturan rekomendasi yang terdaftar".to_string(),
        is_applicable: false,
    }
}
