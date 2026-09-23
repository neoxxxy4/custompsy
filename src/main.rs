mod api;
mod db;
mod models;

use std::sync::{Arc, Mutex};

use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

#[tokio::main]
async fn main() {
    let conn = db::open().expect("failed to open database");
    let state: api::Db = Arc::new(Mutex::new(conn));

    let app = Router::new()
        .nest("/api", api::router(state))
        .fallback_service(
            ServeDir::new("web/dist").fallback(ServeFile::new("web/dist/index.html")),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Проводник v3.0 — http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
