use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde_json::Value;
use tokio::sync::mpsc;

use crate::api::Db;
use crate::AppState;

pub type WsClients = Arc<Mutex<Vec<Arc<mpsc::UnboundedSender<String>>>>>;

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsMsg {
    Ping,
    Pong,
    Sync { state: HashMap<String, Value> },
    SyncKey { key: String, value: Value },
}

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let tx = Arc::new(tx);

    state.clients.lock().unwrap().push(tx.clone());

    if let Ok(msg) = initial_sync(&state.db) {
        let _ = sender.send(Message::Text(msg.into())).await;
    }

    let clients = state.clients.clone();
    let tx_recv = tx.clone();

    let mut send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMsg>(&text) {
                        match ws_msg {
                            WsMsg::Ping => {
                                let _ = tx_recv.send(serde_json::to_string(&WsMsg::Pong).unwrap());
                            }
                            WsMsg::Sync { state: sync_state } => {
                                if let Ok(broadcast) = apply_sync(&state.db, sync_state) {
                                    broadcast_all(&clients, broadcast);
                                }
                            }
                            WsMsg::SyncKey { key, value } => {
                                let mut map = HashMap::new();
                                map.insert(key, value);
                                if let Ok(broadcast) = apply_sync(&state.db, map) {
                                    broadcast_all(&clients, broadcast);
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => { recv_task.abort(); }
        _ = (&mut recv_task) => { send_task.abort(); }
    };

    {
        let mut clients = state.clients.lock().unwrap();
        clients.retain(|c| !Arc::ptr_eq(c, &tx));
    }
}

fn initial_sync(db: &Db) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT key, value FROM sync_state").map_err(|e| e.to_string())?;
    let state: HashMap<String, Value> = stmt
        .query_map([], |r| {
            let key: String = r.get(0)?;
            let value: String = r.get(1)?;
            let parsed: Value = serde_json::from_str(&value).unwrap_or(Value::Null);
            Ok((key, parsed))
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<_>>()
        .map_err(|e| e.to_string())?;
    serde_json::to_string(&WsMsg::Sync { state }).map_err(|e| e.to_string())
}

fn apply_sync(db: &Db, state: HashMap<String, Value>) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let mut stmt = tx.prepare(
        "INSERT INTO sync_state (key, value, updated_at) VALUES (?1, ?2, unixepoch())
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ).map_err(|e| e.to_string())?;
    for (key, value) in &state {
        let json = serde_json::to_string(value).map_err(|e| e.to_string())?;
        stmt.execute(rusqlite::params![key, json]).map_err(|e| e.to_string())?;
    }
    drop(stmt);
    tx.commit().map_err(|e| e.to_string())?;
    serde_json::to_string(&WsMsg::Sync { state }).map_err(|e| e.to_string())
}

fn broadcast_all(clients: &WsClients, msg: String) {
    let clients = clients.lock().unwrap();
    for c in clients.iter() {
        let _ = c.send(msg.clone());
    }
}
