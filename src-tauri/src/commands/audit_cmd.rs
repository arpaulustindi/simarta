use crate::audit::AuditEntry;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuditLogFilter {
    pub action: Option<String>,
    pub entity: Option<String>,
    pub user_id: Option<String>,
    pub search: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub page: Option<usize>,
    pub page_size: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogPaginationResult {
    pub items: Vec<AuditEntry>,
    pub total_records: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
}

#[tauri::command]
pub fn list_audit_logs(
    state: State<DbState>,
    token: String,
    filter: Option<AuditLogFilter>,
) -> Result<AuditLogPaginationResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengakses audit log".to_string());
    }

    let f = filter.unwrap_or_default();
    let mut conditions = Vec::new();
    let mut params = Vec::new();

    if let Some(act) = &f.action {
        if !act.trim().is_empty() {
            conditions.push("action = ?".to_string());
            params.push(rusqlite::types::Value::Text(act.trim().to_string()));
        }
    }

    if let Some(ent) = &f.entity {
        if !ent.trim().is_empty() {
            conditions.push("entity = ?".to_string());
            params.push(rusqlite::types::Value::Text(ent.trim().to_string()));
        }
    }

    if let Some(uid) = &f.user_id {
        if !uid.trim().is_empty() {
            conditions.push("user_id = ?".to_string());
            params.push(rusqlite::types::Value::Text(uid.trim().to_string()));
        }
    }

    if let Some(from) = &f.from_date {
        if !from.trim().is_empty() {
            conditions.push("timestamp >= ?".to_string());
            params.push(rusqlite::types::Value::Text(from.trim().to_string()));
        }
    }

    if let Some(to) = &f.to_date {
        if !to.trim().is_empty() {
            conditions.push("timestamp <= ?".to_string());
            // Append end of day time if date only
            let to_val = if to.len() == 10 {
                format!("{}T23:59:59Z", to)
            } else {
                to.clone()
            };
            params.push(rusqlite::types::Value::Text(to_val));
        }
    }

    if let Some(q) = &f.search {
        let q_clean = q.trim();
        if !q_clean.is_empty() {
            conditions.push("(summary LIKE ? OR reason LIKE ? OR username LIKE ?)".to_string());
            let pattern = format!("%{}%", q_clean);
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Count total records
    let count_sql = format!("SELECT COUNT(*) FROM audit_logs {}", where_clause);
    let mut count_stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
    let total_records: usize = count_stmt
        .query_row(rusqlite::params_from_iter(params.iter()), |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let page = f.page.unwrap_or(1).max(1);
    let page_size = f.page_size.unwrap_or(20).clamp(5, 200);
    let offset = (page - 1) * page_size;
    let total_pages = if total_records == 0 {
        1
    } else {
        (total_records + page_size - 1) / page_size
    };

    let query_sql = format!(
        "SELECT id, user_id, username, role, action, entity, entity_id,
                old_data, new_data, summary, reason, ip_or_device, timestamp
         FROM audit_logs
         {}
         ORDER BY timestamp DESC
         LIMIT ? OFFSET ?",
        where_clause
    );

    let mut query_params = params;
    query_params.push(rusqlite::types::Value::Integer(page_size as i64));
    query_params.push(rusqlite::types::Value::Integer(offset as i64));

    let mut stmt = conn.prepare(&query_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(query_params.iter()), |r| {
            Ok(AuditEntry {
                id: r.get(0)?,
                user_id: r.get(1)?,
                username: r.get(2)?,
                role: r.get(3)?,
                action: r.get(4)?,
                entity: r.get(5)?,
                entity_id: r.get(6)?,
                old_data: r.get(7)?,
                new_data: r.get(8)?,
                summary: r.get(9)?,
                reason: r.get(10)?,
                ip_or_device: r.get(11)?,
                timestamp: r.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    Ok(AuditLogPaginationResult {
        items,
        total_records,
        page,
        page_size,
        total_pages,
    })
}
