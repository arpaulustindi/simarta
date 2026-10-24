use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use crate::pelka::{calculate_pelka_recommendation, PelkaRecommendation};
use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatListItem {
    pub id: String,
    pub nomor_anggota: String,
    pub nik: Option<String>,
    pub nama_lengkap: String,
    pub tempat_lahir: Option<String>,
    pub tanggal_lahir: String,
    pub jenis_kelamin: String,
    pub status_perkawinan: String,
    pub status_keanggotaan: String,
    pub pelka_id: Option<String>,
    pub nama_pelka: Option<String>,
    pub kode_pelka: Option<String>,
    pub kelompok_id: Option<String>,
    pub nama_kelompok: Option<String>,
    pub nomor_telepon: Option<String>,
    pub alamat: Option<String>,
    pub is_archived: bool,
    pub pelka_recommendation: PelkaRecommendation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatDetail {
    pub id: String,
    pub nomor_anggota: String,
    pub nik: Option<String>,
    pub nama_lengkap: String,
    pub tempat_lahir: Option<String>,
    pub tanggal_lahir: String,
    pub jenis_kelamin: String,
    pub status_perkawinan: String,
    pub tanggal_menikah: Option<String>,
    pub pendidikan_terakhir: Option<String>,
    pub bidang_ilmu: Option<String>,
    pub pekerjaan: Option<String>,
    pub alamat: Option<String>,
    pub desa_kelurahan: Option<String>,
    pub kecamatan: Option<String>,
    pub nomor_telepon: Option<String>,
    pub status_keanggotaan: String,
    pub tanggal_masuk: Option<String>,
    pub tanggal_meninggal: Option<String>,
    pub pelka_id: Option<String>,
    pub nama_pelka: Option<String>,
    pub kelompok_id: Option<String>,
    pub nama_kelompok: Option<String>,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
    pub pelka_recommendation: PelkaRecommendation,
    pub keluarga: Option<JemaatKeluargaBrief>,
    pub riwayat_kelompok: Vec<RiwayatKelompokItem>,
    pub riwayat_gerejawi: Vec<RiwayatGerejawiItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatKeluargaBrief {
    pub keluarga_id: String,
    pub nomor_keluarga: String,
    pub nama_keluarga: String,
    pub hubungan_keluarga: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiwayatKelompokItem {
    pub id: String,
    pub kelompok_asal: Option<String>,
    pub kelompok_tujuan: String,
    pub tanggal_perpindahan: String,
    pub alasan: Option<String>,
    pub recorded_by_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiwayatGerejawiItem {
    pub id: String,
    pub jenis_peristiwa: String,
    pub tanggal_peristiwa: String,
    pub tempat: Option<String>,
    pub pelayan_firman: Option<String>,
    pub nomor_surat: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatFilter {
    pub search: Option<String>,
    pub pelka_id: Option<String>,
    pub kelompok_id: Option<String>,
    pub status_keanggotaan: Option<String>,
    pub jenis_kelamin: Option<String>,
    pub status_perkawinan: Option<String>,
    pub include_archived: Option<bool>,
    pub page: Option<usize>,
    pub page_size: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatPaginationResult {
    pub items: Vec<JemaatListItem>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateCheckResult {
    pub is_duplicate: bool,
    pub duplicate_reason: Option<String>,
    pub existing_id: Option<String>,
    pub existing_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatInput {
    pub nomor_anggota: Option<String>,
    pub nik: Option<String>,
    pub nama_lengkap: String,
    pub tempat_lahir: Option<String>,
    pub tanggal_lahir: String,
    pub jenis_kelamin: String,
    pub status_perkawinan: String,
    pub tanggal_menikah: Option<String>,
    pub pendidikan_terakhir: Option<String>,
    pub bidang_ilmu: Option<String>,
    pub pekerjaan: Option<String>,
    pub alamat: Option<String>,
    pub desa_kelurahan: Option<String>,
    pub kecamatan: Option<String>,
    pub nomor_telepon: Option<String>,
    pub status_keanggotaan: Option<String>,
    pub tanggal_masuk: Option<String>,
    pub pelka_id: Option<String>,
    pub kelompok_id: Option<String>,
}

fn generate_nomor_anggota(conn: &Connection) -> Result<String, String> {
    let year = Utc::now().format("%Y").to_string();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jemaat", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(format!("JM-{}-{:04}", year, count + 1))
}

#[tauri::command]
pub fn check_jemaat_duplicate(
    state: State<DbState>,
    token: String,
    nik: Option<String>,
    nama_lengkap: String,
    tanggal_lahir: String,
    exclude_id: Option<String>,
) -> Result<DuplicateCheckResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    // 1. Cek NIK jika diisi
    if let Some(n) = &nik {
        let trimmed_nik = n.trim();
        if !trimmed_nik.is_empty() {
            let query = if let Some(_ex_id) = &exclude_id {
                "SELECT id, nama_lengkap FROM jemaat WHERE nik = ?1 AND id != ?2 AND is_archived = 0 LIMIT 1"
            } else {
                "SELECT id, nama_lengkap FROM jemaat WHERE nik = ?1 AND is_archived = 0 LIMIT 1"
            };

            let row = if let Some(ex_id) = &exclude_id {
                conn.query_row(query, rusqlite::params![trimmed_nik, ex_id], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                })
            } else {
                conn.query_row(query, rusqlite::params![trimmed_nik], |r| {
                    Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
                })
            };

            if let Ok((id, name)) = row {
                return Ok(DuplicateCheckResult {
                    is_duplicate: true,
                    duplicate_reason: Some(format!("NIK '{}' sudah terdaftar atas nama: {}", trimmed_nik, name)),
                    existing_id: Some(id),
                    existing_name: Some(name),
                });
            }
        }
    }

    // 2. Cek Nama Lengkap (case-insensitive) + Tanggal Lahir yang sama
    let trimmed_name = nama_lengkap.trim().to_lowercase();
    let query_name = if let Some(_ex_id) = &exclude_id {
        "SELECT id, nama_lengkap FROM jemaat WHERE LOWER(nama_lengkap) = ?1 AND tanggal_lahir = ?2 AND id != ?3 AND is_archived = 0 LIMIT 1"
    } else {
        "SELECT id, nama_lengkap FROM jemaat WHERE LOWER(nama_lengkap) = ?1 AND tanggal_lahir = ?2 AND is_archived = 0 LIMIT 1"
    };

    let row_name = if let Some(ex_id) = &exclude_id {
        conn.query_row(query_name, rusqlite::params![trimmed_name, tanggal_lahir.trim(), ex_id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
    } else {
        conn.query_row(query_name, rusqlite::params![trimmed_name, tanggal_lahir.trim()], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
    };

    if let Ok((id, name)) = row_name {
        return Ok(DuplicateCheckResult {
            is_duplicate: true,
            duplicate_reason: Some(format!(
                "Terdapat jemaat aktif dengan nama serupa dan tanggal lahir sama: {} ({})",
                name, tanggal_lahir
            )),
            existing_id: Some(id),
            existing_name: Some(name),
        });
    }

    Ok(DuplicateCheckResult {
        is_duplicate: false,
        duplicate_reason: None,
        existing_id: None,
        existing_name: None,
    })
}

#[tauri::command]
pub fn list_jemaat(
    state: State<DbState>,
    token: String,
    filter: JemaatFilter,
) -> Result<JemaatPaginationResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let page = filter.page.unwrap_or(1).max(1);
    let page_size = filter.page_size.unwrap_or(15).max(1);
    let offset = (page - 1) * page_size;

    let mut conditions = Vec::new();
    let mut params = Vec::<rusqlite::types::Value>::new();

    if let Some(inc_arch) = filter.include_archived {
        if !inc_arch {
            conditions.push("j.is_archived = 0".to_string());
        }
    } else {
        conditions.push("j.is_archived = 0".to_string());
    }

    if let Some(search) = &filter.search {
        let s = search.trim();
        if !s.is_empty() {
            conditions.push("(LOWER(j.nama_lengkap) LIKE ? OR j.nomor_anggota LIKE ? OR j.nik LIKE ?)".to_string());
            let pattern = format!("%{}%", s.to_lowercase());
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    if let Some(p_id) = &filter.pelka_id {
        if !p_id.trim().is_empty() {
            conditions.push("j.pelka_id = ?".to_string());
            params.push(rusqlite::types::Value::Text(p_id.trim().to_string()));
        }
    }

    if let Some(k_id) = &filter.kelompok_id {
        if !k_id.trim().is_empty() {
            conditions.push("j.kelompok_id = ?".to_string());
            params.push(rusqlite::types::Value::Text(k_id.trim().to_string()));
        }
    }

    if let Some(st) = &filter.status_keanggotaan {
        if !st.trim().is_empty() {
            conditions.push("j.status_keanggotaan = ?".to_string());
            params.push(rusqlite::types::Value::Text(st.trim().to_string()));
        }
    }

    if let Some(jk) = &filter.jenis_kelamin {
        if !jk.trim().is_empty() {
            conditions.push("j.jenis_kelamin = ?".to_string());
            params.push(rusqlite::types::Value::Text(jk.trim().to_string()));
        }
    }

    if let Some(sp) = &filter.status_perkawinan {
        if !sp.trim().is_empty() {
            conditions.push("j.status_perkawinan = ?".to_string());
            params.push(rusqlite::types::Value::Text(sp.trim().to_string()));
        }
    }

    let where_clause = if conditions.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Count query
    let count_sql = format!("SELECT COUNT(*) FROM jemaat j {}", where_clause);
    let mut count_stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
    let total: usize = count_stmt
        .query_row(rusqlite::params_from_iter(params.iter()), |r| r.get(0))
        .map_err(|e| e.to_string())?;

    // Select query
    let select_sql = format!(
        "SELECT j.id, j.nomor_anggota, j.nik, j.nama_lengkap, j.tempat_lahir,
                j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan, j.status_keanggotaan,
                j.pelka_id, p.nama_pelka, p.kode, j.kelompok_id, k.nama_kelompok,
                j.nomor_telepon, j.alamat, j.is_archived
         FROM jemaat j
         LEFT JOIN pelka p ON j.pelka_id = p.id
         LEFT JOIN kelompok k ON j.kelompok_id = k.id
         {}
         ORDER BY j.nama_lengkap ASC
         LIMIT ? OFFSET ?",
        where_clause
    );

    let mut select_params = params;
    select_params.push(rusqlite::types::Value::Integer(page_size as i64));
    select_params.push(rusqlite::types::Value::Integer(offset as i64));

    let mut stmt = conn.prepare(&select_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(select_params.iter()), |r| {
            let tgl_lahir: String = r.get(5)?;
            let jk: String = r.get(6)?;
            let sp: String = r.get(7)?;
            let is_archived_int: i32 = r.get(16)?;

            let rec = calculate_pelka_recommendation(&tgl_lahir, &jk, &sp, None);

            Ok(JemaatListItem {
                id: r.get(0)?,
                nomor_anggota: r.get(1)?,
                nik: r.get(2)?,
                nama_lengkap: r.get(3)?,
                tempat_lahir: r.get(4)?,
                tanggal_lahir: tgl_lahir,
                jenis_kelamin: jk,
                status_perkawinan: sp,
                status_keanggotaan: r.get(8)?,
                pelka_id: r.get(9)?,
                nama_pelka: r.get(10)?,
                kode_pelka: r.get(11)?,
                kelompok_id: r.get(12)?,
                nama_kelompok: r.get(13)?,
                nomor_telepon: r.get(14)?,
                alamat: r.get(15)?,
                is_archived: is_archived_int == 1,
                pelka_recommendation: rec,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    let total_pages = if total == 0 { 1 } else { (total + page_size - 1) / page_size };

    Ok(JemaatPaginationResult {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn get_jemaat_detail(
    state: State<DbState>,
    token: String,
    id: String,
) -> Result<JemaatDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut stmt = conn
        .prepare(
            "SELECT j.id, j.nomor_anggota, j.nik, j.nama_lengkap, j.tempat_lahir,
                    j.tanggal_lahir, j.jenis_kelamin, j.status_perkawinan, j.tanggal_menikah,
                    j.pendidikan_terakhir, j.bidang_ilmu, j.pekerjaan, j.alamat,
                    j.desa_kelurahan, j.kecamatan, j.nomor_telepon, j.status_keanggotaan,
                    j.tanggal_masuk, j.tanggal_meninggal, j.pelka_id, p.nama_pelka,
                    j.kelompok_id, k.nama_kelompok, j.is_archived, j.created_at, j.updated_at
             FROM jemaat j
             LEFT JOIN pelka p ON j.pelka_id = p.id
             LEFT JOIN kelompok k ON j.kelompok_id = k.id
             WHERE j.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let jemaat = stmt
        .query_row([&id], |r| {
            let tgl_lahir: String = r.get(5)?;
            let jk: String = r.get(6)?;
            let sp: String = r.get(7)?;
            let is_archived_int: i32 = r.get(23)?;

            let rec = calculate_pelka_recommendation(&tgl_lahir, &jk, &sp, None);

            Ok(JemaatDetail {
                id: r.get(0)?,
                nomor_anggota: r.get(1)?,
                nik: r.get(2)?,
                nama_lengkap: r.get(3)?,
                tempat_lahir: r.get(4)?,
                tanggal_lahir: tgl_lahir,
                jenis_kelamin: jk,
                status_perkawinan: sp,
                tanggal_menikah: r.get(8)?,
                pendidikan_terakhir: r.get(9)?,
                bidang_ilmu: r.get(10)?,
                pekerjaan: r.get(11)?,
                alamat: r.get(12)?,
                desa_kelurahan: r.get(13)?,
                kecamatan: r.get(14)?,
                nomor_telepon: r.get(15)?,
                status_keanggotaan: r.get(16)?,
                tanggal_masuk: r.get(17)?,
                tanggal_meninggal: r.get(18)?,
                pelka_id: r.get(19)?,
                nama_pelka: r.get(20)?,
                kelompok_id: r.get(21)?,
                nama_kelompok: r.get(22)?,
                is_archived: is_archived_int == 1,
                created_at: r.get(24)?,
                updated_at: r.get(25)?,
                pelka_recommendation: rec,
                keluarga: None,
                riwayat_kelompok: Vec::new(),
                riwayat_gerejawi: Vec::new(),
            })
        })
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let mut detail = jemaat;

    // Fetch keluarga relation
    let keluarga_row = conn.query_row(
        "SELECT k.id, k.nomor_keluarga, k.nama_keluarga, ak.hubungan_keluarga
         FROM anggota_keluarga ak
         JOIN keluarga k ON ak.keluarga_id = k.id
         WHERE ak.jemaat_id = ?1
         LIMIT 1",
        [&id],
        |r| {
            Ok(JemaatKeluargaBrief {
                keluarga_id: r.get(0)?,
                nomor_keluarga: r.get(1)?,
                nama_keluarga: r.get(2)?,
                hubungan_keluarga: r.get(3)?,
            })
        },
    );
    if let Ok(k) = keluarga_row {
        detail.keluarga = Some(k);
    }

    // Fetch riwayat kelompok
    let mut rk_stmt = conn
        .prepare(
            "SELECT rk.id, k1.nama_kelompok, k2.nama_kelompok, rk.tanggal_perpindahan, rk.alasan, u.full_name
             FROM riwayat_kelompok rk
             LEFT JOIN kelompok k1 ON rk.kelompok_asal_id = k1.id
             JOIN kelompok k2 ON rk.kelompok_tujuan_id = k2.id
             LEFT JOIN users u ON rk.recorded_by = u.id
             WHERE rk.jemaat_id = ?1
             ORDER BY rk.tanggal_perpindahan DESC",
        )
        .map_err(|e| e.to_string())?;

    let rk_rows = rk_stmt
        .query_map([&id], |r| {
            Ok(RiwayatKelompokItem {
                id: r.get(0)?,
                kelompok_asal: r.get(1)?,
                kelompok_tujuan: r.get(2)?,
                tanggal_perpindahan: r.get(3)?,
                alasan: r.get(4)?,
                recorded_by_name: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for r in rk_rows {
        if let Ok(item) = r {
            detail.riwayat_kelompok.push(item);
        }
    }

    // Fetch riwayat gerejawi
    let mut rg_stmt = conn
        .prepare(
            "SELECT id, jenis_peristiwa, tanggal_peristiwa, tempat, pelayan_firman, nomor_surat, keterangan
             FROM riwayat_gerejawi
             WHERE jemaat_id = ?1
             ORDER BY tanggal_peristiwa DESC",
        )
        .map_err(|e| e.to_string())?;

    let rg_rows = rg_stmt
        .query_map([&id], |r| {
            Ok(RiwayatGerejawiItem {
                id: r.get(0)?,
                jenis_peristiwa: r.get(1)?,
                tanggal_peristiwa: r.get(2)?,
                tempat: r.get(3)?,
                pelayan_firman: r.get(4)?,
                nomor_surat: r.get(5)?,
                keterangan: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for r in rg_rows {
        if let Ok(item) = r {
            detail.riwayat_gerejawi.push(item);
        }
    }

    Ok(detail)
}

#[tauri::command]
pub fn create_jemaat(
    state: State<DbState>,
    token: String,
    input: JemaatInput,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if input.nama_lengkap.trim().is_empty() {
        return Err("Nama lengkap jemaat wajib diisi".to_string());
    }
    if input.tanggal_lahir.trim().is_empty() {
        return Err("Tanggal lahir jemaat wajib diisi".to_string());
    }

    let nomor_anggota = match input.nomor_anggota {
        Some(no) if !no.trim().is_empty() => no.trim().to_string(),
        _ => generate_nomor_anggota(&conn)?,
    };

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status_keanggotaan = input.status_keanggotaan.unwrap_or_else(|| "AKTIF".to_string());

    conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nik, nama_lengkap, tempat_lahir, tanggal_lahir,
            jenis_kelamin, status_perkawinan, tanggal_menikah, pendidikan_terakhir,
            bidang_ilmu, pekerjaan, alamat, desa_kelurahan, kecamatan,
            nomor_telepon, status_keanggotaan, tanggal_masuk, pelka_id, kelompok_id,
            is_archived, created_at, created_by, updated_at, updated_by
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            0, ?21, ?22, ?21, ?22
        )",
        rusqlite::params![
            id,
            nomor_anggota,
            input.nik.map(|n| n.trim().to_string()),
            input.nama_lengkap.trim(),
            input.tempat_lahir.map(|t| t.trim().to_string()),
            input.tanggal_lahir.trim(),
            input.jenis_kelamin.trim(),
            input.status_perkawinan.trim(),
            input.tanggal_menikah.map(|m| m.trim().to_string()),
            input.pendidikan_terakhir.map(|p| p.trim().to_string()),
            input.bidang_ilmu.map(|b| b.trim().to_string()),
            input.pekerjaan.map(|k| k.trim().to_string()),
            input.alamat.map(|a| a.trim().to_string()),
            input.desa_kelurahan.map(|d| d.trim().to_string()),
            input.kecamatan.map(|k| k.trim().to_string()),
            input.nomor_telepon.map(|t| t.trim().to_string()),
            status_keanggotaan,
            input.tanggal_masuk.map(|m| m.trim().to_string()),
            input.pelka_id,
            input.kelompok_id,
            now,
            current_user.id
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Nomor anggota sudah terdaftar di sistem".to_string()
        } else {
            format!("Gagal mendaftarkan jemaat: {}", e)
        }
    })?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "jemaat",
        Some(&id),
        None,
        Some(&format!("{{\"nama\": \"{}\", \"nomor\": \"{}\"}}", input.nama_lengkap.trim(), nomor_anggota)),
        &format!("Pendaftaran anggota jemaat baru: {} ({})", input.nama_lengkap.trim(), nomor_anggota),
        None,
        None,
    );

    Ok(id)
}

#[tauri::command]
pub fn update_jemaat(
    state: State<DbState>,
    token: String,
    id: String,
    input: JemaatInput,
    reason: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    // Backend authorization guard: ADMIN ONLY!
    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengubah data jemaat tersimpan".to_string());
    }

    // Fetch existing for audit
    let old_data: Option<String> = conn
        .query_row(
            "SELECT json_object(
                'nama_lengkap', nama_lengkap,
                'nik', nik,
                'status_perkawinan', status_perkawinan,
                'pelka_id', pelka_id,
                'kelompok_id', kelompok_id,
                'status_keanggotaan', status_keanggotaan
            ) FROM jemaat WHERE id = ?1",
            [&id],
            |r| r.get(0),
        )
        .ok();

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE jemaat SET
            nik = ?1,
            nama_lengkap = ?2,
            tempat_lahir = ?3,
            tanggal_lahir = ?4,
            jenis_kelamin = ?5,
            status_perkawinan = ?6,
            tanggal_menikah = ?7,
            pendidikan_terakhir = ?8,
            bidang_ilmu = ?9,
            pekerjaan = ?10,
            alamat = ?11,
            desa_kelurahan = ?12,
            kecamatan = ?13,
            nomor_telepon = ?14,
            status_keanggotaan = COALESCE(?15, status_keanggotaan),
            tanggal_masuk = ?16,
            pelka_id = ?17,
            kelompok_id = ?18,
            updated_at = ?19,
            updated_by = ?20
         WHERE id = ?21",
        rusqlite::params![
            input.nik.map(|n| n.trim().to_string()),
            input.nama_lengkap.trim(),
            input.tempat_lahir.map(|t| t.trim().to_string()),
            input.tanggal_lahir.trim(),
            input.jenis_kelamin.trim(),
            input.status_perkawinan.trim(),
            input.tanggal_menikah.map(|m| m.trim().to_string()),
            input.pendidikan_terakhir.map(|p| p.trim().to_string()),
            input.bidang_ilmu.map(|b| b.trim().to_string()),
            input.pekerjaan.map(|k| k.trim().to_string()),
            input.alamat.map(|a| a.trim().to_string()),
            input.desa_kelurahan.map(|d| d.trim().to_string()),
            input.kecamatan.map(|k| k.trim().to_string()),
            input.nomor_telepon.map(|t| t.trim().to_string()),
            input.status_keanggotaan,
            input.tanggal_masuk.map(|m| m.trim().to_string()),
            input.pelka_id,
            input.kelompok_id,
            now,
            current_user.id,
            id
        ],
    )
    .map_err(|e| format!("Gagal memperbarui data jemaat: {}", e))?;

    let new_data = format!(
        "{{\"nama_lengkap\": \"{}\", \"pelka_id\": \"{:?}\"}}",
        input.nama_lengkap.trim(),
        input.pelka_id
    );

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "jemaat",
        Some(&id),
        old_data.as_deref(),
        Some(&new_data),
        &format!("Pembaruan data jemaat: {}", input.nama_lengkap.trim()),
        reason.as_deref(),
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn archive_jemaat(
    state: State<DbState>,
    token: String,
    id: String,
    reason: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    // Backend authorization guard: ADMIN ONLY!
    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengarsipkan data jemaat".to_string());
    }

    if reason.trim().is_empty() {
        return Err("Alasan pengarsipan wajib diisi".to_string());
    }

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE jemaat SET is_archived = 1, updated_at = ?1, updated_by = ?2 WHERE id = ?3",
        rusqlite::params![now, current_user.id, id],
    )
    .map_err(|e| e.to_string())?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "ARCHIVE",
        "jemaat",
        Some(&id),
        None,
        None,
        &format!("Mengarsipkan data jemaat. Alasan: {}", reason.trim()),
        Some(reason.trim()),
        None,
    );

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormOptionItem {
    pub id: String,
    pub label: String,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatFormOptions {
    pub pelka_options: Vec<FormOptionItem>,
    pub kelompok_options: Vec<FormOptionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatBriefItem {
    pub id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub tanggal_lahir: String,
    pub nama_pelka: Option<String>,
    pub nama_kelompok: Option<String>,
}

#[tauri::command]
pub fn get_jemaat_form_options(
    state: State<DbState>,
    token: String,
) -> Result<JemaatFormOptions, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut pelka_stmt = conn
        .prepare("SELECT id, nama_pelka, kode FROM pelka WHERE is_active = 1 ORDER BY kode ASC")
        .map_err(|e| e.to_string())?;

    let pelka_rows = pelka_stmt
        .query_map([], |r| {
            Ok(FormOptionItem {
                id: r.get(0)?,
                label: r.get(1)?,
                code: Some(r.get(2)?),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut pelka_options = Vec::new();
    for p in pelka_rows {
        if let Ok(item) = p {
            pelka_options.push(item);
        }
    }

    let mut kelompok_stmt = conn
        .prepare("SELECT id, nama_kelompok, nomor_kelompok FROM kelompok WHERE is_active = 1 ORDER BY nomor_kelompok ASC")
        .map_err(|e| e.to_string())?;

    let kelompok_rows = kelompok_stmt
        .query_map([], |r| {
            Ok(FormOptionItem {
                id: r.get(0)?,
                label: r.get(1)?,
                code: Some(r.get(2)?),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut kelompok_options = Vec::new();
    for k in kelompok_rows {
        if let Ok(item) = k {
            kelompok_options.push(item);
        }
    }

    Ok(JemaatFormOptions {
        pelka_options,
        kelompok_options,
    })
}

#[tauri::command]
pub fn search_jemaat_brief(
    state: State<DbState>,
    token: String,
    query: String,
) -> Result<Vec<JemaatBriefItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let q = query.trim().to_lowercase();
    let pattern = format!("%{}%", q);

    let mut stmt = conn
        .prepare(
            "SELECT j.id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin, j.tanggal_lahir,
                    p.nama_pelka, k.nama_kelompok
             FROM jemaat j
             LEFT JOIN pelka p ON j.pelka_id = p.id
             LEFT JOIN kelompok k ON j.kelompok_id = k.id
             WHERE j.is_archived = 0 AND (
                LOWER(j.nama_lengkap) LIKE ?1 OR
                j.nomor_anggota LIKE ?1 OR
                j.nik LIKE ?1
             )
             ORDER BY j.nama_lengkap ASC
             LIMIT 25",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&pattern], |r| {
            Ok(JemaatBriefItem {
                id: r.get(0)?,
                nomor_anggota: r.get(1)?,
                nama_lengkap: r.get(2)?,
                jenis_kelamin: r.get(3)?,
                tanggal_lahir: r.get(4)?,
                nama_pelka: r.get(5)?,
                nama_kelompok: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        if let Ok(item) = row {
            list.push(item);
        }
    }

    Ok(list)
}
