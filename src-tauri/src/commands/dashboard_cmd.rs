use crate::audit::{get_recent_audits, AuditEntry};
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use crate::pelka::{calculate_pelka_recommendation, is_leap_year};
use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct DistributionItem {
    pub label: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BirthdayItem {
    pub jemaat_id: String,
    pub nama_lengkap: String,
    pub tanggal_lahir: String,
    pub usia_akan_dicapai: u32,
    pub hari_lagi: i64,
    pub pelka: String,
    pub kelompok: String,
    pub nomor_telepon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub total_jemaat_aktif: i64,
    pub total_keluarga_aktif: i64,
    pub total_kelompok: i64,
    pub pelka_distribution: Vec<DistributionItem>,
    pub kelompok_distribution: Vec<DistributionItem>,
    pub upcoming_birthdays: Vec<BirthdayItem>,
    pub pending_pelka_reviews: i64,
    pub recent_audits: Vec<AuditEntry>,
}

#[tauri::command]
pub fn get_dashboard_summary(
    state: State<DbState>,
    token: String,
    ref_date: Option<String>,
) -> Result<DashboardSummary, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    let total_jemaat_aktif: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jemaat WHERE status_keanggotaan = 'AKTIF' AND is_archived = 0",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let total_keluarga_aktif: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM keluarga WHERE status = 'AKTIF'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let total_kelompok: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM kelompok WHERE is_active = 1",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    // Pelka actual distribution
    let mut pelka_distribution = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT p.nama_pelka, COUNT(j.id)
                 FROM pelka p
                 LEFT JOIN jemaat j ON j.pelka_id = p.id AND j.status_keanggotaan = 'AKTIF' AND j.is_archived = 0
                 GROUP BY p.id, p.nama_pelka
                 ORDER BY p.kode ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |r| {
                Ok(DistributionItem {
                    label: r.get(0)?,
                    count: r.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for item in rows {
            if let Ok(i) = item {
                pelka_distribution.push(i);
            }
        }
    }

    // Kelompok distribution
    let mut kelompok_distribution = Vec::new();
    {
        let mut stmt = conn
            .prepare(
                "SELECT k.nama_kelompok, COUNT(j.id)
                 FROM kelompok k
                 LEFT JOIN jemaat j ON j.kelompok_id = k.id AND j.status_keanggotaan = 'AKTIF' AND j.is_archived = 0
                 GROUP BY k.id, k.nama_kelompok
                 ORDER BY k.nomor_kelompok ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |r| {
                Ok(DistributionItem {
                    label: r.get(0)?,
                    count: r.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for item in rows {
            if let Ok(i) = item {
                kelompok_distribution.push(i);
            }
        }
    }

    // Upcoming birthdays & pending Pelka reviews
    let today = if let Some(ref d_str) = ref_date {
        NaiveDate::parse_from_str(d_str, "%Y-%m-%d").unwrap_or_else(|_| Utc::now().date_naive())
    } else {
        Utc::now().date_naive()
    };
    let mut upcoming_birthdays = Vec::new();
    let mut pending_pelka_reviews = 0i64;

    {
        let mut stmt = conn
            .prepare(
                "SELECT j.id, j.nama_lengkap, j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan,
                        p.kode, COALESCE(p.nama_pelka, '-'), COALESCE(k.nama_kelompok, '-'), j.nomor_telepon
                 FROM jemaat j
                 LEFT JOIN pelka p ON j.pelka_id = p.id
                 LEFT JOIN kelompok k ON j.kelompok_id = k.id
                 WHERE j.status_keanggotaan = 'AKTIF' AND j.is_archived = 0",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, Option<String>>(5)?,
                    r.get::<_, String>(6)?,
                    r.get::<_, String>(7)?,
                    r.get::<_, Option<String>>(8)?,
                ))
            })
            .map_err(|e| e.to_string())?;

        for r in rows {
            if let Ok((id, nama, tgl_lahir, jk, status_nikah, pelka_kode, pelka_nama, kelompok_nama, telp)) = r {
                // Check Pelka recommendation difference
                let rec = calculate_pelka_recommendation(&tgl_lahir, &jk, &status_nikah, Some(today));
                if rec.is_applicable {
                    let current_kode = pelka_kode.unwrap_or_default();
                    if current_kode != rec.kode {
                        pending_pelka_reviews += 1;
                    }
                }

                // Check birthday in next 7 days from today (ref_date)
                if let Ok(bdate) = NaiveDate::parse_from_str(&tgl_lahir, "%Y-%m-%d") {
                    let b_month = bdate.month();
                    let b_day = bdate.day();

                    let this_year_bday = if b_month == 2 && b_day == 29 && !is_leap_year(today.year()) {
                        NaiveDate::from_ymd_opt(today.year(), 3, 1)
                    } else {
                        NaiveDate::from_ymd_opt(today.year(), b_month, b_day)
                    };

                    if let Some(target_bday) = this_year_bday {
                        let mut diff_days = (target_bday - today).num_days();
                        let final_year = if diff_days < 0 {
                            let next_year = today.year() + 1;
                            let next_bday = if b_month == 2 && b_day == 29 && !is_leap_year(next_year) {
                                NaiveDate::from_ymd_opt(next_year, 3, 1)
                            } else {
                                NaiveDate::from_ymd_opt(next_year, b_month, b_day)
                            };
                            if let Some(nb) = next_bday {
                                diff_days = (nb - today).num_days();
                                next_year
                            } else {
                                today.year()
                            }
                        } else {
                            today.year()
                        };

                        if diff_days >= 0 && diff_days <= 7 {
                            let age_achieved = (final_year - bdate.year()) as u32;
                            upcoming_birthdays.push(BirthdayItem {
                                jemaat_id: id,
                                nama_lengkap: nama,
                                tanggal_lahir: tgl_lahir,
                                usia_akan_dicapai: age_achieved,
                                hari_lagi: diff_days,
                                pelka: pelka_nama,
                                kelompok: kelompok_nama,
                                nomor_telepon: telp,
                            });
                        }
                    }
                }
            }
        }
    }

    upcoming_birthdays.sort_by_key(|b| b.hari_lagi);

    // Recent audits: Operator only sees basic summary, Admin sees all
    let recent_audits = if current_user.role == crate::auth::Role::ADMIN {
        get_recent_audits(&conn, 10).unwrap_or_default()
    } else {
        Vec::new()
    };

    Ok(DashboardSummary {
        total_jemaat_aktif,
        total_keluarga_aktif,
        total_kelompok,
        pelka_distribution,
        kelompok_distribution,
        upcoming_birthdays,
        pending_pelka_reviews,
        recent_audits,
    })
}
