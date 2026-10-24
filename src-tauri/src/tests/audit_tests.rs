use crate::audit::{get_recent_audits, log_audit};
use crate::db::init_memory_db;

#[test]
fn test_audit_logging_and_retrieval() {
    let conn = init_memory_db().expect("Failed to init db");

    let audit_id = log_audit(
        &conn,
        Some("user-1"),
        "admin",
        "ADMIN",
        "CREATE",
        "jemaat",
        Some("jemaat-1"),
        None,
        Some("{\"nama\": \"Yohanes\"}"),
        "Pendaftaran anggota jemaat baru",
        None,
        None,
    )
    .expect("Failed to write audit log");

    assert!(!audit_id.is_empty());

    let recent = get_recent_audits(&conn, 5).expect("Failed to fetch audits");
    assert_eq!(recent.len(), 1);
    assert_eq!(recent[0].username, "admin");
    assert_eq!(recent[0].action, "CREATE");
    assert_eq!(recent[0].entity, "jemaat");
}
