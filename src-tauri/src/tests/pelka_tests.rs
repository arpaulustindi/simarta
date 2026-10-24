use crate::pelka::{calculate_age, calculate_pelka_recommendation, is_leap_year};
use chrono::NaiveDate;

#[test]
fn test_leap_year_detection() {
    assert!(is_leap_year(2024));
    assert!(is_leap_year(2020));
    assert!(is_leap_year(2000));
    assert!(!is_leap_year(2023));
    assert!(!is_leap_year(2025));
    assert!(!is_leap_year(2100));
}

#[test]
fn test_feb_29_birthday_non_leap_year() {
    let birth_date = NaiveDate::from_ymd_opt(2004, 2, 29).unwrap();
    // 2025 is non-leap year.
    // On Feb 28, 2025, age has not turned 21 yet -> 20.
    let ref_feb28 = NaiveDate::from_ymd_opt(2025, 2, 28).unwrap();
    assert_eq!(calculate_age(birth_date, ref_feb28), Some(20));

    // On March 1, 2025, birthday is celebrated -> 21.
    let ref_mar01 = NaiveDate::from_ymd_opt(2025, 3, 1).unwrap();
    assert_eq!(calculate_age(birth_date, ref_mar01), Some(21));
}

#[test]
fn test_pelka_lansia_boundary() {
    let ref_date = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();

    // Exactly 60 years old
    let rec_pria = calculate_pelka_recommendation("1966-01-01", "L", "MENIKAH", Some(ref_date));
    assert_eq!(rec_pria.kode, "LANSIA");
    assert_eq!(rec_pria.usia, Some(60));
    assert!(rec_pria.is_applicable);

    let rec_wanita = calculate_pelka_recommendation("1965-05-10", "P", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_wanita.kode, "LANSIA");
    assert_eq!(rec_wanita.usia, Some(60));
}

#[test]
fn test_pelka_anak_and_remaja() {
    let ref_date = NaiveDate::from_ymd_opt(2026, 6, 1).unwrap();

    // Anak: age 12
    let rec_anak = calculate_pelka_recommendation("2014-06-01", "L", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_anak.kode, "ANAK");
    assert_eq!(rec_anak.usia, Some(12));

    // Remaja: age 13
    let rec_remaja_min = calculate_pelka_recommendation("2013-06-01", "P", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_remaja_min.kode, "REMAJA");
    assert_eq!(rec_remaja_min.usia, Some(13));

    // Remaja: age 16
    let rec_remaja_max = calculate_pelka_recommendation("2010-06-01", "L", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_remaja_max.kode, "REMAJA");
    assert_eq!(rec_remaja_max.usia, Some(16));
}

#[test]
fn test_pelka_pemuda_and_young_married() {
    let ref_date = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();

    // Pemuda: 17 years old, belum menikah
    let rec_pemuda_17 = calculate_pelka_recommendation("2009-01-01", "L", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_pemuda_17.kode, "PEMUDA");
    assert_eq!(rec_pemuda_17.usia, Some(17));

    // Pemuda: 35 years old, belum menikah
    let rec_pemuda_35 = calculate_pelka_recommendation("1991-01-01", "P", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_pemuda_35.kode, "PEMUDA");
    assert_eq!(rec_pemuda_35.usia, Some(35));

    // Menikah under 36: Laki-laki -> Bapak
    let rec_bapak_muda = calculate_pelka_recommendation("1995-01-01", "L", "MENIKAH", Some(ref_date));
    assert_eq!(rec_bapak_muda.kode, "BAPAK");
    assert_eq!(rec_bapak_muda.usia, Some(31));

    // Menikah under 36: Perempuan -> Ibu
    let rec_ibu_muda = calculate_pelka_recommendation("1995-01-01", "P", "MENIKAH", Some(ref_date));
    assert_eq!(rec_ibu_muda.kode, "IBU");
    assert_eq!(rec_ibu_muda.usia, Some(31));
}

#[test]
fn test_pelka_dewasa_36_to_59() {
    let ref_date = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();

    // 36 years old male, belum menikah -> Bapak
    let rec_pria_36 = calculate_pelka_recommendation("1990-01-01", "L", "BELUM_MENIKAH", Some(ref_date));
    assert_eq!(rec_pria_36.kode, "BAPAK");
    assert_eq!(rec_pria_36.usia, Some(36));

    // 59 years old female, cerai hidup -> Ibu
    let rec_wanita_59 = calculate_pelka_recommendation("1967-01-01", "P", "CERAI_HIDUP", Some(ref_date));
    assert_eq!(rec_wanita_59.kode, "IBU");
    assert_eq!(rec_wanita_59.usia, Some(59));
}

#[test]
fn test_pelka_divorced_youth_special_case() {
    let ref_date = NaiveDate::from_ymd_opt(2026, 1, 1).unwrap();

    // 25 years old with CERAI_HIDUP -> BELUM_DITENTUKAN
    let rec_cerai = calculate_pelka_recommendation("2001-01-01", "L", "CERAI_HIDUP", Some(ref_date));
    assert_eq!(rec_cerai.kode, "BELUM_DITENTUKAN");
    assert!(!rec_cerai.is_applicable);
    assert!(rec_cerai.alasan.contains("menunggu ketetapan"));

    // 28 years old with CERAI_MATI -> BELUM_DITENTUKAN
    let rec_cerai_mati = calculate_pelka_recommendation("1998-01-01", "P", "CERAI_MATI", Some(ref_date));
    assert_eq!(rec_cerai_mati.kode, "BELUM_DITENTUKAN");
    assert!(!rec_cerai_mati.is_applicable);
}

#[test]
fn test_incomplete_or_invalid_data() {
    // Invalid birth date
    let rec_inv_date = calculate_pelka_recommendation("invalid-date", "L", "MENIKAH", None);
    assert_eq!(rec_inv_date.kode, "TIDAK_DAPAT_DITENTUKAN");
    assert!(!rec_inv_date.is_applicable);

    // Invalid gender
    let rec_inv_gender = calculate_pelka_recommendation("2000-01-01", "X", "MENIKAH", None);
    assert_eq!(rec_inv_gender.kode, "TIDAK_DAPAT_DITENTUKAN");
    assert!(!rec_inv_gender.is_applicable);
}
