pub mod audit;
pub mod auth;
pub mod commands;
pub mod db;
pub mod pelka;

#[cfg(test)]
pub mod tests;

use db::{init_db, DbState};
use std::fs;
use std::sync::Mutex;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .on_page_load(|_window, payload| {
            println!(">>> TAURI PAGE LOAD: URL='{}' EVENT={:?}", payload.url(), payload.event());
        })
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir)
                    .expect("Failed to create app data directory");
            }

            let db_path = app_data_dir.join("simarta.db");
            let conn = init_db(&db_path).expect("Failed to initialize SQLite database");

            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth_cmd::check_needs_setup,
            commands::auth_cmd::setup_initial_admin,
            commands::auth_cmd::login,
            commands::auth_cmd::logout,
            commands::auth_cmd::get_current_user,
            commands::auth_cmd::list_users,
            commands::auth_cmd::create_user,
            commands::dashboard_cmd::get_dashboard_summary,
            commands::pelka_cmd::get_pelka_recommendation,
            commands::pelka_cmd::list_pelka_summary,
            commands::pelka_cmd::get_pelka_review_queue,
            commands::pelka_cmd::apply_pelka_mutation,
            commands::pelka_cmd::update_pelka,
            // Jemaat
            commands::jemaat_cmd::check_jemaat_duplicate,
            commands::jemaat_cmd::list_jemaat,
            commands::jemaat_cmd::get_jemaat_detail,
            commands::jemaat_cmd::create_jemaat,
            commands::jemaat_cmd::update_jemaat,
            commands::jemaat_cmd::archive_jemaat,
            commands::jemaat_cmd::get_jemaat_form_options,
            commands::jemaat_cmd::search_jemaat_brief,
            // Keluarga
            commands::keluarga_cmd::list_keluarga,
            commands::keluarga_cmd::get_keluarga_detail,
            commands::keluarga_cmd::create_keluarga,
            commands::keluarga_cmd::update_keluarga,
            commands::keluarga_cmd::add_anggota_keluarga,
            commands::keluarga_cmd::remove_anggota_keluarga,
            // Kelompok
            commands::kelompok_cmd::list_kelompok,
            commands::kelompok_cmd::get_kelompok_detail,
            commands::kelompok_cmd::move_jemaat_kelompok,
            commands::kelompok_cmd::create_kelompok,
            commands::kelompok_cmd::update_kelompok,
            commands::kelompok_cmd::delete_kelompok,
            // Jabatan
            commands::jabatan_cmd::list_jabatan,
            commands::jabatan_cmd::list_pejabat_aktif,
            commands::jabatan_cmd::create_pengangkatan_jabatan,
            commands::jabatan_cmd::akhiri_masa_jabatan,
            commands::jabatan_cmd::get_jemaat_riwayat_jabatan,
            // Peristiwa Gerejawi & Atestasi & Kematian
            commands::peristiwa_cmd::list_peristiwa_gerejawi,
            commands::peristiwa_cmd::create_peristiwa_gerejawi,
            commands::peristiwa_cmd::create_perkawinan_gerejawi,
            commands::peristiwa_cmd::list_atestasi,
            commands::peristiwa_cmd::create_atestasi_keluar,
            commands::peristiwa_cmd::create_atestasi_masuk,
            commands::peristiwa_cmd::list_kematian,
            commands::peristiwa_cmd::catat_kematian,
            // User Management & Security
            commands::auth_cmd::update_user_status,
            commands::auth_cmd::change_password,
            commands::auth_cmd::reset_user_password,
            // Audit Log Explorer
            commands::audit_cmd::list_audit_logs,
            // Backup & Restore
            commands::backup_cmd::create_database_backup,
            commands::backup_cmd::list_backups,
            commands::backup_cmd::restore_database_from_backup,
            // Impor & Ekspor Data
            commands::impor_ekspor_cmd::get_export_jemaat_data,
            commands::impor_ekspor_cmd::get_export_keluarga_data,
            commands::impor_ekspor_cmd::import_jemaat_batch,
            // Pengelolaan Data Dummy & Transaksional
            commands::data_cmd::get_data_summary,
            commands::data_cmd::clear_dummy_data,
            commands::data_cmd::seed_dummy_data_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running SiMarta application");
}
