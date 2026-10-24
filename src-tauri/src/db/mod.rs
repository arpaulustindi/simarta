pub mod migrations;

use rusqlite::{Connection, Result};
use std::path::Path;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db<P: AsRef<Path>>(path: P) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA busy_timeout = 5000;",
    )?;
    migrations::run_migrations(&conn)?;

    // Check dummy data status in app_settings for desktop app
    let dummy_status: Result<String, _> = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'dummy_data_status'",
        [],
        |r| r.get(0),
    );

    if dummy_status.is_err() {
        migrations::seed_dummy_data(&conn)?;
    }

    Ok(conn)
}

pub fn init_memory_db() -> Result<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}
