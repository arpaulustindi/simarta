use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use crate::pelka::calculate_pelka_recommendation;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatExportRow {
    pub nomor_anggota: String,
    pub nik: Option<String>,
    pub nama_lengkap: String,
    pub tempat_lahir: Option<String>,
    pub tanggal_lahir: String,
    pub jenis_kelamin: String,
    pub status_perkawinan: String,
    pub tanggal_menikah: Option<String>,
    pub alamat: Option<String>,
    pub desa_kelurahan: Option<String>,
    pub kecamatan: Option<String>,
    pub nomor_telepon: Option<String>,
    pub status_keanggotaan: String,
    pub nama_pelka: Option<String>,
    pub nama_kelompok: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaExportRow {
    pub nomor_keluarga: String,
    pub nama_keluarga: String,
    pub kepala_keluarga: Option<String>,
    pub alamat: Option<String>,
    pub jumlah_anggota: usize,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JemaatImportRow {
    pub nik: Option<String>,
    pub nama_lengkap: String,
    pub tempat_lahir: Option<String>,
    pub tanggal_lahir: String,
    pub jenis_kelamin: String,
    pub status_perkawinan: String,
    pub alamat: Option<String>,
    pub nomor_telepon: Option<String>,
    pub nomor_kelompok: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSummary {
    pub total_submitted: usize,
    pub total_inserted: usize,
    pub failed_records: Vec<String>,
}

#[tauri::command]
pub fn get_export_jemaat_data(
    state: State<DbState>,
    token: String,
) -> Result<Vec<JemaatExportRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengekspor data jemaat".to_string());
    }

    let sql = "
        SELECT j.nomor_anggota, j.nik, j.nama_lengkap, j.tempat_lahir, j.tanggal_lahir,
               j.jenis_kelamin, j.status_perkawinan, j.tanggal_menikah, j.alamat,
               j.desa_kelurahan, j.kecamatan, j.nomor_telepon, j.status_keanggotaan,
               p.nama_pelka, k.nama_kelompok
        FROM jemaat j
        LEFT JOIN pelka p ON j.pelka_id = p.id
        LEFT JOIN kelompok k ON j.kelompok_id = k.id
        ORDER BY j.nama_lengkap ASC
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(JemaatExportRow {
                nomor_anggota: r.get(0)?,
                nik: r.get(1)?,
                nama_lengkap: r.get(2)?,
                tempat_lahir: r.get(3)?,
                tanggal_lahir: r.get(4)?,
                jenis_kelamin: r.get(5)?,
                status_perkawinan: r.get(6)?,
                tanggal_menikah: r.get(7)?,
                alamat: r.get(8)?,
                desa_kelurahan: r.get(9)?,
                kecamatan: r.get(10)?,
                nomor_telepon: r.get(11)?,
                status_keanggotaan: r.get(12)?,
                nama_pelka: r.get(13)?,
                nama_kelompok: r.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "EXPORT",
        "jemaat",
        None,
        None,
        Some(&format!("{{\"total_exported\": {}}}", items.len())),
        &format!("Ekspor data jemaat: {} baris", items.len()),
        None,
        None,
    );

    Ok(items)
}

#[tauri::command]
pub fn get_export_keluarga_data(
    state: State<DbState>,
    token: String,
) -> Result<Vec<KeluargaExportRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengekspor data keluarga".to_string());
    }

    let sql = "
        SELECT k.nomor_keluarga, k.nama_keluarga, j.nama_lengkap, k.alamat,
               (SELECT COUNT(*) FROM anggota_keluarga ak WHERE ak.keluarga_id = k.id AND ak.tanggal_berakhir IS NULL) as jml,
               k.status
        FROM keluarga k
        LEFT JOIN jemaat j ON k.kepala_keluarga_id = j.id
        ORDER BY k.nomor_keluarga ASC
    ";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            let jml: i64 = r.get(4)?;
            Ok(KeluargaExportRow {
                nomor_keluarga: r.get(0)?,
                nama_keluarga: r.get(1)?,
                kepala_keluarga: r.get(2)?,
                alamat: r.get(3)?,
                jumlah_anggota: jml as usize,
                status: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "EXPORT",
        "keluarga",
        None,
        None,
        Some(&format!("{{\"total_exported\": {}}}", items.len())),
        &format!("Ekspor data keluarga: {} kartu keluarga", items.len()),
        None,
        None,
    );

    Ok(items)
}

#[tauri::command]
pub fn import_jemaat_batch(
    state: State<DbState>,
    token: String,
    rows: Vec<JemaatImportRow>,
) -> Result<ImportSummary, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengimpor data jemaat".to_string());
    }

    if rows.is_empty() {
        return Err("Tidak ada data jemaat yang dikirim untuk diimpor".to_string());
    }

    // Cache Pelka maps: kode -> id & Kelompok maps: nomor_kelompok -> id
    let (pelka_map, kelompok_map): (HashMap<String, String>, HashMap<String, String>) = {
        let mut pelka_stmt = conn.prepare("SELECT kode, id FROM pelka").map_err(|e| e.to_string())?;
        let p_map: HashMap<String, String> = pelka_stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|res| res.ok())
            .collect();

        let mut kelompok_stmt = conn.prepare("SELECT nomor_kelompok, id FROM kelompok").map_err(|e| e.to_string())?;
        let k_map: HashMap<String, String> = kelompok_stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .map_err(|e| e.to_string())?
            .filter_map(|res| res.ok())
            .collect();

        (p_map, k_map)
    };

    let current_year = Utc::now().format("%Y").to_string();
    let now = Utc::now().to_rfc3339();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ambil nomor jemaat urut terakhir
    let last_num_sql = format!(
        "SELECT MAX(CAST(SUBSTR(nomor_anggota, 9) AS INTEGER)) FROM jemaat WHERE nomor_anggota LIKE 'JM-{}-%'",
        current_year
    );
    let mut cur_max: i64 = tx.query_row(&last_num_sql, [], |r| r.get(0)).unwrap_or(0);

    let mut inserted = 0;
    let mut failed = Vec::new();
    let total_submitted = rows.len();

    for (idx, row) in rows.into_iter().enumerate() {
        let row_num = idx + 1;
        let nama = row.nama_lengkap.trim();
        if nama.is_empty() {
            failed.push(format!("Baris {}: Nama lengkap kosong", row_num));
            continue;
        }

        let jk = row.jenis_kelamin.trim().to_uppercase();
        if jk != "L" && jk != "P" {
            failed.push(format!("Baris {}: Jenis kelamin harus 'L' atau 'P' ({})", row_num, nama));
            continue;
        }

        let sp = row.status_perkawinan.trim().to_uppercase();
        let valid_sp = ["BELUM_MENIKAH", "MENIKAH", "CERAI_HIDUP", "CERAI_MATI"];
        if !valid_sp.contains(&sp.as_str()) {
            failed.push(format!("Baris {}: Status perkawinan tidak valid ({})", row_num, nama));
            continue;
        }

        // Generate nomor anggota
        cur_max += 1;
        let nomor_anggota = format!("JM-{}-{:04}", current_year, cur_max);

        // Rekomendasi Pelka
        let rec = calculate_pelka_recommendation(&row.tanggal_lahir, &jk, &sp, None);
        let pelka_id = pelka_map.get(&rec.kode).cloned();

        // Cari kelompok
        let mut kelompok_id = None;
        if let Some(nk) = &row.nomor_kelompok {
            let clean_nk = format!("{:02}", nk.trim().parse::<u32>().unwrap_or(0));
            kelompok_id = kelompok_map.get(&clean_nk).cloned();
        }

        let j_id = Uuid::new_v4().to_string();

        let res = tx.execute(
            "INSERT INTO jemaat (
                id, nomor_anggota, nik, nama_lengkap, tempat_lahir, tanggal_lahir,
                jenis_kelamin, status_perkawinan, alamat, nomor_telepon,
                status_keanggotaan, pelka_id, kelompok_id, is_archived,
                created_at, created_by, updated_at, updated_by
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'AKTIF', ?11, ?12, 0, ?13, ?14, ?13, ?14)",
            rusqlite::params![
                j_id,
                nomor_anggota,
                row.nik.as_ref().map(|n| n.trim().to_string()),
                nama,
                row.tempat_lahir.as_ref().map(|t| t.trim().to_string()),
                row.tanggal_lahir.trim(),
                jk,
                sp,
                row.alamat.as_ref().map(|a| a.trim().to_string()),
                row.nomor_telepon.as_ref().map(|t| t.trim().to_string()),
                pelka_id,
                kelompok_id,
                now,
                current_user.id
            ],
        );

        match res {
            Ok(_) => {
                inserted += 1;
            }
            Err(e) => {
                failed.push(format!("Baris {}: Gagal memasukkan {}: {}", row_num, nama, e));
            }
        }
    }

    let _ = log_audit(
        &tx,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "IMPORT",
        "jemaat",
        None,
        None,
        Some(&format!(
            "{{\"submitted\": {}, \"inserted\": {}, \"failed\": {}}}",
            total_submitted,
            inserted,
            failed.len()
        )),
        &format!("Impor batch jemaat: {} berhasil, {} gagal", inserted, failed.len()),
        Some("Impor berkas Excel oleh Administrator"),
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(ImportSummary {
        total_submitted,
        total_inserted: inserted,
        failed_records: failed,
    })
}
