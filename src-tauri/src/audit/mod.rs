use chrono::Utc;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub user_id: Option<String>,
    pub username: String,
    pub role: String,
    pub action: String,
    pub entity: String,
    pub entity_id: Option<String>,
    pub old_data: Option<String>,
    pub new_data: Option<String>,
    pub summary: String,
    pub reason: Option<String>,
    pub ip_or_device: Option<String>,
    pub timestamp: String,
}

pub fn log_audit(
    conn: &Connection,
    user_id: Option<&str>,
    username: &str,
    role: &str,
    action: &str,
    entity: &str,
    entity_id: Option<&str>,
    old_data: Option<&str>,
    new_data: Option<&str>,
    summary: &str,
    reason: Option<&str>,
    ip_or_device: Option<&str>,
) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO audit_logs (
            id, user_id, username, role, action, entity, entity_id,
            old_data, new_data, summary, reason, ip_or_device, timestamp
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            id,
            user_id,
            username,
            role,
            action,
            entity,
            entity_id,
            old_data,
            new_data,
            summary,
            reason,
            ip_or_device,
            timestamp
        ],
    )?;

    Ok(id)
}

pub fn get_recent_audits(conn: &Connection, limit: usize) -> Result<Vec<AuditEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, user_id, username, role, action, entity, entity_id,
                old_data, new_data, summary, reason, ip_or_device, timestamp
         FROM audit_logs
         ORDER BY timestamp DESC
         LIMIT ?1",
    )?;

    let rows = stmt.query_map([limit], |row| {
        Ok(AuditEntry {
            id: row.get(0)?,
            user_id: row.get(1)?,
            username: row.get(2)?,
            role: row.get(3)?,
            action: row.get(4)?,
            entity: row.get(5)?,
            entity_id: row.get(6)?,
            old_data: row.get(7)?,
            new_data: row.get(8)?,
            summary: row.get(9)?,
            reason: row.get(10)?,
            ip_or_device: row.get(11)?,
            timestamp: row.get(12)?,
        })
    })?;

    let mut result = Vec::new();
    for entry in rows {
        result.push(entry?);
    }
    Ok(result)
}
