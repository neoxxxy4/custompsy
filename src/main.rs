mod api;
mod db;
mod models;
mod ws;

use std::sync::{Arc, Mutex};

use axum::{Router, http::header, middleware::Next, response::Response};
use tower_http::services::{ServeDir, ServeFile};

#[derive(Clone)]
pub struct AppState {
    pub db: api::Db,
    pub clients: ws::WsClients,
}

async fn no_cache_html(req: axum::extract::Request, next: Next) -> Response {
    let mut res = next.run(req).await;
    if let Some(content_type) = res.headers().get(header::CONTENT_TYPE) {
        if content_type.to_str().map(|s| s.starts_with("text/html")).unwrap_or(false) {
            res.headers_mut().insert(
                header::CACHE_CONTROL,
                header::HeaderValue::from_static("no-cache, no-store, must-revalidate"),
            );
            res.headers_mut().insert(
                header::PRAGMA,
                header::HeaderValue::from_static("no-cache"),
            );
        }
    }
    res
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
        // дистрибуция APK: /app/version.json + /app/latest.apk
        .nest_service("/app", ServeDir::new("apk-live"))
        .with_state(state)
        .fallback_service(
            ServeDir::new("web/dist").fallback(ServeFile::new("web/dist/index.html")),
        )
        .layer(axum::middleware::from_fn(no_cache_html));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Проводник v3.0 — http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
