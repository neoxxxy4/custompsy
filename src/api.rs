use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use rusqlite::{Connection, OptionalExtension};

use crate::models::{BalanceState, ChecksState, ChecksUpdate};

pub type Db = Arc<Mutex<Connection>>;

pub fn router(db: Db) -> Router {
    Router::new()
        .route("/checks/{date}", get(get_checks).put(put_checks))
        .route("/balance", get(get_balance).put(put_balance))
        .route("/sync", get(get_sync).put(put_sync))
        .route("/sync/{key}", get(get_sync_key).put(put_sync_key))
        .with_state(db)
}

pub struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        (self.0, Json(serde_json::json!({ "error": self.1 }))).into_response()
    }
}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(e: serde_json::Error) -> Self {
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    }
}

fn bad_request(msg: &str) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, msg.to_string())
}

fn valid_date(date: &str) -> bool {
    date.len() == 10
        && date
            .as_bytes()
            .iter()
            .enumerate()
            .all(|(i, b)| if i == 4 || i == 7 { *b == b'-' } else { b.is_ascii_digit() })
}

async fn get_checks(
    State(db): State<Db>,
    Path(date): Path<String>,
) -> Result<Json<ChecksState>, ApiError> {
    if !valid_date(&date) {
        return Err(bad_request("date must be YYYY-MM-DD"));
    }
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare("SELECT key, done FROM checks WHERE date = ?1")?;
    let checks: HashMap<String, bool> = stmt
        .query_map([&date], |r| {
            Ok((r.get::<_, String>("key")?, r.get::<_, i64>("done")? != 0))
        })?
        .filter(|res| res.as_ref().map(|(_, done)| *done).unwrap_or(true))
        .collect::<rusqlite::Result<HashMap<_, _>>>()?;

    Ok(Json(ChecksState { date, checks }))
}

async fn put_checks(
    State(db): State<Db>,
    Path(date): Path<String>,
    Json(update): Json<ChecksUpdate>,
) -> Result<Json<ChecksState>, ApiError> {
    if !valid_date(&date) {
        return Err(bad_request("date must be YYYY-MM-DD"));
    }
    let conn = db.lock().unwrap();

    let tx = conn.unchecked_transaction()?;
    tx.execute("DELETE FROM checks WHERE date = ?1", [&date])?;
    {
        let mut stmt =
            tx.prepare("INSERT INTO checks (date, key, done) VALUES (?1, ?2, ?3)")?;
        for (key, done) in &update.checks {
            if *done {
                stmt.execute(rusqlite::params![date, key, 1])?;
            }
        }
    }
    tx.commit()?;

    Ok(Json(ChecksState {
        date,
        checks: update.checks,
    }))
}

async fn get_balance(State(db): State<Db>) -> Result<Json<BalanceState>, ApiError> {
    let conn = db.lock().unwrap();

    let json: Option<String> = conn
        .query_row("SELECT values_json FROM balance WHERE id = 1", [], |r| {
            r.get(0)
        })
        .optional()?;

    let state = match json {
        Some(j) => serde_json::from_str(&j).unwrap_or_default(),
        None => BalanceState::default(),
    };
    Ok(Json(state))
}

async fn put_balance(
    State(db): State<Db>,
    Json(state): Json<BalanceState>,
) -> Result<Json<BalanceState>, ApiError> {
    if state.values.len() != 6 || state.values.iter().any(|v| !(0..=10).contains(v)) {
        return Err(bad_request("values must be 6 integers in 0..=10"));
    }
    let conn = db.lock().unwrap();

    let json = serde_json::to_string(&state)?;
    conn.execute(
        "INSERT INTO balance (id, values_json) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET values_json = excluded.values_json",
        [json],
    )?;

    Ok(Json(state))
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SyncState {
    pub state: std::collections::HashMap<String, serde_json::Value>,
}

async fn get_sync(State(db): State<Db>) -> Result<Json<SyncState>, ApiError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare("SELECT key, value FROM sync_state")?;
    let state: std::collections::HashMap<String, serde_json::Value> = stmt
        .query_map([], |r| {
            let key: String = r.get(0)?;
            let value: String = r.get(1)?;
            let parsed: serde_json::Value = serde_json::from_str(&value).unwrap_or(serde_json::Value::Null);
            Ok((key, parsed))
        })?
        .collect::<rusqlite::Result<_>>()?;
    Ok(Json(SyncState { state }))
}

async fn put_sync(
    State(db): State<Db>,
    Json(payload): Json<SyncState>,
) -> Result<Json<SyncState>, ApiError> {
    let conn = db.lock().unwrap();
    let tx = conn.unchecked_transaction()?;
    let mut stmt = tx.prepare(
        "INSERT INTO sync_state (key, value, updated_at) VALUES (?1, ?2, unixepoch())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )?;
    for (key, value) in &payload.state {
        let json = serde_json::to_string(value)?;
        stmt.execute(rusqlite::params![key, json])?;
    }
    drop(stmt);
    tx.commit()?;
    Ok(Json(payload))
}

async fn get_sync_key(
    State(db): State<Db>,
    Path(key): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let conn = db.lock().unwrap();
    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM sync_state WHERE key = ?1",
            [&key],
            |r| r.get(0),
        )
        .optional()?;
    match value {
        Some(v) => {
            let parsed: serde_json::Value = serde_json::from_str(&v)?;
            Ok(Json(parsed))
        }
        None => Ok(Json(serde_json::Value::Null)),
    }
}

async fn put_sync_key(
    State(db): State<Db>,
    Path(key): Path<String>,
    Json(value): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let conn = db.lock().unwrap();
    let json = serde_json::to_string(&value)?;
    conn.execute(
        "INSERT INTO sync_state (key, value, updated_at) VALUES (?1, ?2, unixepoch())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        [&key, &json],
    )?;
    Ok(Json(value))
}
