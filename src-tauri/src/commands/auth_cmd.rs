use crate::audit::log_audit;
use crate::auth::password::{hash_password, verify_password};
use crate::auth::session::{generate_token, hash_token};
use crate::auth::{AuthUser, Role};
use crate::db::DbState;
use chrono::{Duration, Utc};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: AuthUser,
}

pub fn verify_session(conn: &Connection, token: &str) -> Result<AuthUser, String> {
    let token_hash = hash_token(token);
    let now = Utc::now().to_rfc3339();

    let mut stmt = conn
        .prepare(
            "SELECT u.id, u.username, u.role, u.full_name, u.is_active, s.expires_at
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.token_hash = ?1",
        )
        .map_err(|e| e.to_string())?;

    let row = stmt
        .query_row([token_hash], |r| {
            let role_str: String = r.get(2)?;
            let role = match role_str.as_str() {
                "ADMIN" => Role::ADMIN,
                _ => Role::OPERATOR,
            };

            let is_active_int: i32 = r.get(4)?;
            let expires_at: String = r.get(5)?;

            Ok((
                AuthUser {
                    id: r.get(0)?,
                    username: r.get(1)?,
                    role,
                    full_name: r.get(3)?,
                    is_active: is_active_int == 1,
                },
                expires_at,
            ))
        })
        .map_err(|_| "Sesi tidak valid atau telah berakhir".to_string())?;

    let (user, expires_at) = row;

    if expires_at < now {
        return Err("Sesi telah kedaluwarsa. Silakan login kembali.".to_string());
    }

    if !user.is_active {
        return Err("Akun ini telah dinonaktifkan".to_string());
    }

    Ok(user)
}

#[tauri::command]
pub fn check_needs_setup(state: State<DbState>) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let admin_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = 1",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(admin_count == 0)
}

#[tauri::command]
pub fn setup_initial_admin(
    state: State<DbState>,
    username: String,
    password: String,
    full_name: String,
) -> Result<LoginResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let admin_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = 1",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if admin_count > 0 {
        return Err("Setup awal Administrator sudah pernah dilakukan".to_string());
    }

    if username.trim().len() < 3 {
        return Err("Username minimal 3 karakter".to_string());
    }

    if password.len() < 8 {
        return Err("Password minimal 8 karakter".to_string());
    }

    let user_id = Uuid::new_v4().to_string();
    let hashed_pw = hash_password(&password)?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at, created_by)
         VALUES (?1, ?2, ?3, 'ADMIN', ?4, 1, ?5, ?1)",
        rusqlite::params![user_id, username.trim(), hashed_pw, full_name.trim(), now],
    )
    .map_err(|e| format!("Gagal membuat administrator: {}", e))?;

    // Create session
    let token = generate_token();
    let token_hash = hash_token(&token);
    let session_id = Uuid::new_v4().to_string();
    let expires_at = (Utc::now() + Duration::hours(8)).to_rfc3339();

    conn.execute(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![session_id, user_id, token_hash, expires_at, now],
    )
    .map_err(|e| e.to_string())?;

    let _ = log_audit(
        &conn,
        Some(&user_id),
        &username,
        "ADMIN",
        "CREATE",
        "users",
        Some(&user_id),
        None,
        Some(&format!("{{\"username\": \"{}\", \"role\": \"ADMIN\"}}", username)),
        "Inisialisasi akun Administrator utama",
        None,
        None,
    );

    Ok(LoginResponse {
        token,
        user: AuthUser {
            id: user_id,
            username: username.trim().to_string(),
            role: Role::ADMIN,
            full_name: full_name.trim().to_string(),
            is_active: true,
        },
    })
}

#[tauri::command]
pub fn login(
    state: State<DbState>,
    username: String,
    password: String,
) -> Result<LoginResponse, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, username, password_hash, role, full_name, is_active
             FROM users WHERE username = ?1",
        )
        .map_err(|e| e.to_string())?;

    let user_row = stmt
        .query_row([username.trim()], |r| {
            let role_str: String = r.get(3)?;
            let role = match role_str.as_str() {
                "ADMIN" => Role::ADMIN,
                _ => Role::OPERATOR,
            };
            let is_active_int: i32 = r.get(5)?;

            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                role,
                r.get::<_, String>(4)?,
                is_active_int == 1,
            ))
        })
        .map_err(|_| "Username atau kata sandi salah".to_string())?;

    let (id, uname, hash, role, full_name, is_active) = user_row;

    if !is_active {
        return Err("Akun ini telah dinonaktifkan. Hubungi Administrator.".to_string());
    }

    let is_valid = verify_password(&password, &hash)?;
    if !is_valid {
        let _ = log_audit(
            &conn,
            Some(&id),
            &uname,
            role.as_str(),
            "LOGIN",
            "users",
            Some(&id),
            None,
            None,
            "Percobaan login gagal: password salah",
            None,
            None,
        );
        return Err("Username atau kata sandi salah".to_string());
    }

    let token = generate_token();
    let token_hash = hash_token(&token);
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let expires_at = (Utc::now() + Duration::hours(8)).to_rfc3339();

    conn.execute(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![session_id, id, token_hash, expires_at, now],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE users SET last_login_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;

    let _ = log_audit(
        &conn,
        Some(&id),
        &uname,
        role.as_str(),
        "LOGIN",
        "users",
        Some(&id),
        None,
        None,
        "Pengguna berhasil login",
        None,
        None,
    );

    Ok(LoginResponse {
        token,
        user: AuthUser {
            id,
            username: uname,
            role,
            full_name,
            is_active,
        },
    })
}

#[tauri::command]
pub fn logout(state: State<DbState>, token: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let token_hash = hash_token(&token);

    if let Ok(user) = verify_session(&conn, &token) {
        let _ = log_audit(
            &conn,
            Some(&user.id),
            &user.username,
            user.role.as_str(),
            "LOGOUT",
            "sessions",
            None,
            None,
            None,
            "Pengguna berhasil logout",
            None,
            None,
        );
    }

    conn.execute(
        "DELETE FROM sessions WHERE token_hash = ?1",
        rusqlite::params![token_hash],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_current_user(state: State<DbState>, token: String) -> Result<AuthUser, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    verify_session(&conn, &token)
}

#[tauri::command]
pub fn list_users(state: State<DbState>, token: String) -> Result<Vec<AuthUser>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengelola akun pengguna".to_string());
    }

    let mut stmt = conn
        .prepare("SELECT id, username, role, full_name, is_active FROM users ORDER BY username ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |r| {
            let role_str: String = r.get(2)?;
            let role = match role_str.as_str() {
                "ADMIN" => Role::ADMIN,
                _ => Role::OPERATOR,
            };
            let is_active_int: i32 = r.get(4)?;

            Ok(AuthUser {
                id: r.get(0)?,
                username: r.get(1)?,
                role,
                full_name: r.get(3)?,
                is_active: is_active_int == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut users = Vec::new();
    for u in rows {
        users.push(u.map_err(|e| e.to_string())?);
    }

    Ok(users)
}

#[tauri::command]
pub fn create_user(
    state: State<DbState>,
    token: String,
    username: String,
    password: String,
    role: String,
    full_name: String,
) -> Result<AuthUser, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak membuat akun pengguna".to_string());
    }

    if username.trim().len() < 3 {
        return Err("Username minimal 3 karakter".to_string());
    }

    if password.len() < 8 {
        return Err("Password minimal 8 karakter".to_string());
    }

    let target_role = match role.trim().to_uppercase().as_str() {
        "ADMIN" => Role::ADMIN,
        "OPERATOR" => Role::OPERATOR,
        _ => return Err("Role tidak valid (pilih ADMIN atau OPERATOR)".to_string()),
    };

    let user_id = Uuid::new_v4().to_string();
    let hashed_pw = hash_password(&password)?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7)",
        rusqlite::params![
            user_id,
            username.trim(),
            hashed_pw,
            target_role.as_str(),
            full_name.trim(),
            now,
            current_user.id
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Username sudah digunakan".to_string()
        } else {
            format!("Gagal membuat akun: {}", e)
        }
    })?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "users",
        Some(&user_id),
        None,
        Some(&format!(
            "{{\"username\": \"{}\", \"role\": \"{}\"}}",
            username,
            target_role.as_str()
        )),
        &format!("Membuat akun pengguna baru: {} ({})", username, target_role.as_str()),
        None,
        None,
    );

    Ok(AuthUser {
        id: user_id,
        username: username.trim().to_string(),
        role: target_role,
        full_name: full_name.trim().to_string(),
        is_active: true,
    })
}

#[tauri::command]
pub fn update_user_status(
    state: State<DbState>,
    token: String,
    user_id: String,
    is_active: bool,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengubah status akun".to_string());
    }

    if current_user.id == user_id && !is_active {
        return Err("Tidak dapat menonaktifkan akun sendiri".to_string());
    }

    // Ambil info target user
    let (target_username, target_role, current_status): (String, String, i32) = conn
        .query_row(
            "SELECT username, role, is_active FROM users WHERE id = ?1",
            [&user_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| "Akun pengguna tidak ditemukan".to_string())?;

    if target_role == "ADMIN" && !is_active {
        let active_admin_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id != ?1",
                [&user_id],
                |r| r.get(0),
            )
            .unwrap_or(0);

        if active_admin_count == 0 {
            return Err("Tidak dapat menonaktifkan satu-satunya Administrator yang aktif".to_string());
        }
    }

    let new_active_int = if is_active { 1 } else { 0 };
    conn.execute(
        "UPDATE users SET is_active = ?1 WHERE id = ?2",
        rusqlite::params![new_active_int, user_id],
    )
    .map_err(|e| format!("Gagal memperbarui status akun: {}", e))?;

    // Jika dinonaktifkan, cabut semua sesi aktif
    if !is_active {
        let _ = conn.execute("DELETE FROM sessions WHERE user_id = ?1", [&user_id]);
    }

    let action_desc = if is_active { "Mengaktifkan akun" } else { "Menonaktifkan akun" };
    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "users",
        Some(&user_id),
        Some(&format!("{{\"is_active\": {}}}", current_status == 1)),
        Some(&format!("{{\"is_active\": {}}}", is_active)),
        &format!("{}: {}", action_desc, target_username),
        None,
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn change_password(
    state: State<DbState>,
    token: String,
    old_password: String,
    new_password: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if new_password.len() < 8 {
        return Err("Password baru minimal 8 karakter".to_string());
    }

    let current_hash: String = conn
        .query_row(
            "SELECT password_hash FROM users WHERE id = ?1",
            [&current_user.id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    let is_valid = verify_password(&old_password, &current_hash)?;
    if !is_valid {
        return Err("Password lama tidak sesuai".to_string());
    }

    let hashed_pw = hash_password(&new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        rusqlite::params![hashed_pw, current_user.id],
    )
    .map_err(|e| format!("Gagal memperbarui password: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "users",
        Some(&current_user.id),
        None,
        None,
        "Mengubah kata sandi akun pribadi",
        None,
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn reset_user_password(
    state: State<DbState>,
    token: String,
    user_id: String,
    new_password: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mereset password pengguna".to_string());
    }

    if new_password.len() < 8 {
        return Err("Password baru minimal 8 karakter".to_string());
    }

    let target_username: String = conn
        .query_row(
            "SELECT username FROM users WHERE id = ?1",
            [&user_id],
            |r| r.get(0),
        )
        .map_err(|_| "Akun pengguna tidak ditemukan".to_string())?;

    let hashed_pw = hash_password(&new_password)?;
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        rusqlite::params![hashed_pw, user_id],
    )
    .map_err(|e| format!("Gagal mereset password: {}", e))?;

    // Invalidate sessions so user must login with new password
    let _ = conn.execute("DELETE FROM sessions WHERE user_id = ?1", [&user_id]);

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "users",
        Some(&user_id),
        None,
        None,
        &format!("Administrator mereset password akun: {}", target_username),
        None,
        None,
    );

    Ok(())
}
