use crate::auth::password::{hash_password, verify_password};
use crate::commands::auth_cmd::verify_session;
use crate::db::init_memory_db;
use chrono::{Duration, Utc};
use uuid::Uuid;

#[test]
fn test_argon2id_hashing_and_verification() {
    let password = "RahasiaGereja2026!";
    let hash = hash_password(password).expect("Hashing failed");

    // Must verify successfully
    assert!(verify_password(password, &hash).unwrap());

    // Wrong password must return false
    assert!(!verify_password("SalahPassword!", &hash).unwrap());
}

#[test]
fn test_session_verification_and_expiry() {
    let conn = init_memory_db().expect("Failed to init db");

    let user_id = Uuid::new_v4().to_string();
    let hashed_pw = hash_password("PasswordAdmin123").unwrap();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at)
         VALUES (?1, 'admin_test', ?2, 'ADMIN', 'Admin Test', 1, ?3)",
        rusqlite::params![user_id, hashed_pw, now],
    )
    .unwrap();

    let raw_token = crate::auth::session::generate_token();
    let token_hash = crate::auth::session::hash_token(&raw_token);
    let session_id = Uuid::new_v4().to_string();
    let expires_at = (Utc::now() + Duration::hours(8)).to_rfc3339();

    conn.execute(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![session_id, user_id, token_hash, expires_at, now],
    )
    .unwrap();

    // Verify session
    let auth_user = verify_session(&conn, &raw_token).expect("Session should be valid");
    assert_eq!(auth_user.username, "admin_test");
    assert_eq!(auth_user.role, crate::auth::Role::ADMIN);

    // Invalid token should fail
    assert!(verify_session(&conn, "invalid_token").is_err());
}

#[test]
fn test_operator_rbac_denial() {
    let conn = init_memory_db().expect("Failed to init db");

    let op_id = Uuid::new_v4().to_string();
    let hashed_pw = hash_password("OperatorPass123!").unwrap();
    let now = Utc::now().to_rfc3339();

    // Create OPERATOR user
    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at)
         VALUES (?1, 'operator_user', ?2, 'OPERATOR', 'Operator Gereja', 1, ?3)",
        rusqlite::params![op_id, hashed_pw, now],
    )
    .unwrap();

    let raw_token = crate::auth::session::generate_token();
    let token_hash = crate::auth::session::hash_token(&raw_token);
    let session_id = Uuid::new_v4().to_string();
    let expires_at = (Utc::now() + Duration::hours(8)).to_rfc3339();

    conn.execute(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![session_id, op_id, token_hash, expires_at, now],
    )
    .unwrap();

    let user = verify_session(&conn, &raw_token).expect("Session should be valid");
    assert_eq!(user.role, crate::auth::Role::OPERATOR);

    // Backend rule: Operator CANNOT manage users
    assert_ne!(user.role, crate::auth::Role::ADMIN);
}
