mod api;
mod db;
mod models;
mod ws;

use std::sync::{Arc, Mutex};

use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

#[derive(Clone)]
pub struct AppState {
    pub db: api::Db,
    pub clients: ws::WsClients,
}

#[tokio::main]
async fn main() {
    let conn = db::open().expect("failed to open database");
    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        clients: Arc::new(Mutex::new(Vec::new())),
    };

    let app = Router::new()
        .route("/api/ws", axum::routing::get(ws::ws_handler))
        .nest("/api", api::router())
        .with_state(state)
        .fallback_service(
            ServeDir::new("web/dist").fallback(ServeFile::new("web/dist/index.html")),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Проводник v3.0 — http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
