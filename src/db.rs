use std::path::Path;

use rusqlite::{Connection, Result};

pub const DB_PATH: &str = "data/provodnik.db";

pub fn open() -> Result<Connection> {
    std::fs::create_dir_all(Path::new(DB_PATH).parent().unwrap()).ok();
    let conn = Connection::open(DB_PATH)?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS checks (
            date TEXT NOT NULL,
            key TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (date, key)
        );

        CREATE TABLE IF NOT EXISTS balance (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            values_json TEXT NOT NULL
        );
        ",
    )
}
