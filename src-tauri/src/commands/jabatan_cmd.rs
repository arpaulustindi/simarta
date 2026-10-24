use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JabatanItem {
    pub id: String,
    pub nama_jabatan: String,
    pub jenis: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub jumlah_pejabat_aktif: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PejabatAktifItem {
    pub id: String,
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub jabatan_id: String,
    pub nama_jabatan: String,
    pub jenis_jabatan: String,
    pub lingkup: String,
    pub kelompok_id: Option<String>,
    pub nama_kelompok: Option<String>,
    pub pelka_id: Option<String>,
    pub nama_pelka: Option<String>,
    pub tanggal_pengangkatan: String,
    pub tanggal_berakhir: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PengangkatanJabatanInput {
    pub jemaat_id: String,
    pub jabatan_id: String,
    pub lingkup: String,
    pub kelompok_id: Option<String>,
    pub pelka_id: Option<String>,
    pub tanggal_pengangkatan: String,
    pub tanggal_berakhir: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AkhiriJabatanInput {
    pub riwayat_id: String,
    pub tanggal_berakhir: String,
    pub keterangan: String,
}

#[tauri::command]
pub fn list_jabatan(
    state: State<DbState>,
    token: String,
) -> Result<Vec<JabatanItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let today = Utc::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT jb.id, jb.nama_jabatan, jb.jenis, jb.deskripsi, jb.is_active,
                    (SELECT COUNT(*) FROM riwayat_jabatan rj
                     JOIN jemaat j ON rj.jemaat_id = j.id
                     WHERE rj.jabatan_id = jb.id
                       AND j.is_archived = 0
                       AND (rj.tanggal_berakhir IS NULL OR rj.tanggal_berakhir >= ?1)
                    ) as jml_pejabat
             FROM jabatan jb
             ORDER BY
                CASE jb.jenis WHEN 'FUNGSIONAL' THEN 1 ELSE 2 END,
                jb.nama_jabatan ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&today], |r| {
            let is_active_int: i32 = r.get(4)?;
            let jml: i64 = r.get(5)?;
            Ok(JabatanItem {
                id: r.get(0)?,
                nama_jabatan: r.get(1)?,
                jenis: r.get(2)?,
                deskripsi: r.get(3)?,
                is_active: is_active_int == 1,
                jumlah_pejabat_aktif: jml as usize,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

#[tauri::command]
pub fn list_pejabat_aktif(
    state: State<DbState>,
    token: String,
    lingkup: Option<String>,
    jabatan_id: Option<String>,
) -> Result<Vec<PejabatAktifItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let today = Utc::now().format("%Y-%m-%d").to_string();

    let mut conditions = vec![
        "j.is_archived = 0".to_string(),
        "(rj.tanggal_berakhir IS NULL OR rj.tanggal_berakhir >= ?1)".to_string(),
    ];
    let mut params = vec![rusqlite::types::Value::Text(today)];

    if let Some(l) = &lingkup {
        if !l.trim().is_empty() {
            conditions.push("rj.lingkup = ?".to_string());
            params.push(rusqlite::types::Value::Text(l.trim().to_string()));
        }
    }

    if let Some(j_id) = &jabatan_id {
        if !j_id.trim().is_empty() {
            conditions.push("rj.jabatan_id = ?".to_string());
            params.push(rusqlite::types::Value::Text(j_id.trim().to_string()));
        }
    }

    let sql = format!(
        "SELECT rj.id, rj.jemaat_id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin,
                jb.id, jb.nama_jabatan, jb.jenis, rj.lingkup,
                rj.kelompok_id, k.nama_kelompok,
                rj.pelka_id, p.nama_pelka,
                rj.tanggal_pengangkatan, rj.tanggal_berakhir, rj.keterangan
         FROM riwayat_jabatan rj
         JOIN jemaat j ON rj.jemaat_id = j.id
         JOIN jabatan jb ON rj.jabatan_id = jb.id
         LEFT JOIN kelompok k ON rj.kelompok_id = k.id
         LEFT JOIN pelka p ON rj.pelka_id = p.id
         WHERE {}
         ORDER BY rj.tanggal_pengangkatan DESC, j.nama_lengkap ASC",
        conditions.join(" AND ")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(PejabatAktifItem {
                id: r.get(0)?,
                jemaat_id: r.get(1)?,
                nomor_anggota: r.get(2)?,
                nama_lengkap: r.get(3)?,
                jenis_kelamin: r.get(4)?,
                jabatan_id: r.get(5)?,
                nama_jabatan: r.get(6)?,
                jenis_jabatan: r.get(7)?,
                lingkup: r.get(8)?,
                kelompok_id: r.get(9)?,
                nama_kelompok: r.get(10)?,
                pelka_id: r.get(11)?,
                nama_pelka: r.get(12)?,
                tanggal_pengangkatan: r.get(13)?,
                tanggal_berakhir: r.get(14)?,
                keterangan: r.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

#[tauri::command]
pub fn create_pengangkatan_jabatan(
    state: State<DbState>,
    token: String,
    input: PengangkatanJabatanInput,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat pengangkatan jabatan pelayanan".to_string());
    }

    if input.tanggal_pengangkatan.trim().is_empty() {
        return Err("Tanggal pengangkatan wajib diisi".to_string());
    }

    let valid_lingkup = ["JEMAAT", "KELOMPOK", "PELKA"];
    if !valid_lingkup.contains(&input.lingkup.trim()) {
        return Err("Lingkup jabatan tidak valid (pilihan: JEMAAT, KELOMPOK, PELKA)".to_string());
    }

    // Ambil info nama jemaat & jabatan
    let nama_jemaat: String = conn
        .query_row("SELECT nama_lengkap FROM jemaat WHERE id = ?1", [&input.jemaat_id], |r| r.get(0))
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let nama_jabatan: String = conn
        .query_row("SELECT nama_jabatan FROM jabatan WHERE id = ?1", [&input.jabatan_id], |r| r.get(0))
        .map_err(|_| "Data jabatan tidak ditemukan".to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO riwayat_jabatan (
            id, jemaat_id, jabatan_id, lingkup, kelompok_id, pelka_id,
            tanggal_pengangkatan, tanggal_berakhir, keterangan, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            id,
            input.jemaat_id,
            input.jabatan_id,
            input.lingkup.trim(),
            input.kelompok_id,
            input.pelka_id,
            input.tanggal_pengangkatan.trim(),
            input.tanggal_berakhir.as_ref().map(|t| t.trim().to_string()),
            input.keterangan.as_ref().map(|k| k.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat pengangkatan jabatan: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "riwayat_jabatan",
        Some(&id),
        None,
        Some(&format!("{{\"jemaat\": \"{}\", \"jabatan\": \"{}\", \"lingkup\": \"{}\"}}", nama_jemaat, nama_jabatan, input.lingkup)),
        &format!("Pengangkatan jabatan baru: {} sebagai {} ({})", nama_jemaat, nama_jabatan, input.lingkup),
        input.keterangan.as_deref(),
        None,
    );

    Ok(id)
}

#[tauri::command]
pub fn akhiri_masa_jabatan(
    state: State<DbState>,
    token: String,
    input: AkhiriJabatanInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengakhiri masa jabatan pelayanan".to_string());
    }

    if input.tanggal_berakhir.trim().is_empty() {
        return Err("Tanggal pengakhiran jabatan wajib diisi".to_string());
    }

    // Ambil info nama jemaat & jabatan dari riwayat
    let (nama_jemaat, nama_jabatan): (String, String) = conn
        .query_row(
            "SELECT j.nama_lengkap, jb.nama_jabatan
             FROM riwayat_jabatan rj
             JOIN jemaat j ON rj.jemaat_id = j.id
             JOIN jabatan jb ON rj.jabatan_id = jb.id
             WHERE rj.id = ?1",
            [&input.riwayat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Data riwayat jabatan tidak ditemukan".to_string())?;

    conn.execute(
        "UPDATE riwayat_jabatan SET
            tanggal_berakhir = ?1,
            keterangan = COALESCE(keterangan || ' | Selesai: ' || ?2, ?2)
         WHERE id = ?3",
        rusqlite::params![input.tanggal_berakhir.trim(), input.keterangan.trim(), input.riwayat_id],
    )
    .map_err(|e| format!("Gagal mengakhiri masa jabatan: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "riwayat_jabatan",
        Some(&input.riwayat_id),
        None,
        Some(&format!("{{\"tanggal_berakhir\": \"{}\"}}", input.tanggal_berakhir.trim())),
        &format!("Pengakhiran masa jabatan: {} ({}) per {}", nama_jemaat, nama_jabatan, input.tanggal_berakhir.trim()),
        Some(input.keterangan.trim()),
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn get_jemaat_riwayat_jabatan(
    state: State<DbState>,
    token: String,
    jemaat_id: String,
) -> Result<Vec<PejabatAktifItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut stmt = conn
        .prepare(
            "SELECT rj.id, rj.jemaat_id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin,
                    jb.id, jb.nama_jabatan, jb.jenis, rj.lingkup,
                    rj.kelompok_id, k.nama_kelompok,
                    rj.pelka_id, p.nama_pelka,
                    rj.tanggal_pengangkatan, rj.tanggal_berakhir, rj.keterangan
             FROM riwayat_jabatan rj
             JOIN jemaat j ON rj.jemaat_id = j.id
             JOIN jabatan jb ON rj.jabatan_id = jb.id
             LEFT JOIN kelompok k ON rj.kelompok_id = k.id
             LEFT JOIN pelka p ON rj.pelka_id = p.id
             WHERE rj.jemaat_id = ?1
             ORDER BY rj.tanggal_pengangkatan DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&jemaat_id], |r| {
            Ok(PejabatAktifItem {
                id: r.get(0)?,
                jemaat_id: r.get(1)?,
                nomor_anggota: r.get(2)?,
                nama_lengkap: r.get(3)?,
                jenis_kelamin: r.get(4)?,
                jabatan_id: r.get(5)?,
                nama_jabatan: r.get(6)?,
                jenis_jabatan: r.get(7)?,
                lingkup: r.get(8)?,
                kelompok_id: r.get(9)?,
                nama_kelompok: r.get(10)?,
                pelka_id: r.get(11)?,
                nama_pelka: r.get(12)?,
                tanggal_pengangkatan: r.get(13)?,
                tanggal_berakhir: r.get(14)?,
                keterangan: r.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}
