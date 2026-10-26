use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::api::ApiError;

const SYSTEM_PROMPT: &str = "Ты — поддерживающий психологический помощник в приложении личной терапии. \
Отвечай по-русски, тепло, конкретно и коротко (2–6 предложений). Помогай разобрать ситуации и чувства \
(травма, обида, стыд, вина, страх, гнев), задавай уточняющие вопросы, предлагай маленькие реалистичные шаги. \
Не ставь диагнозы и не назначай лечение. При признаках кризиса или мыслях о самоповреждении мягко посоветуй \
обратиться к специалисту или на телефон доверия.";

const TOKEN_TTL: Duration = Duration::from_secs(25 * 60);
const MAX_MESSAGES: usize = 30;
const MAX_CONTENT: usize = 4000;

struct CachedToken {
    value: String,
    at: Instant,
}

#[derive(Clone)]
pub struct AiState {
    client: reqwest::Client,
    auth_key: Option<String>,
    token: Arc<Mutex<Option<CachedToken>>>,
}

impl AiState {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            // у endpoint'ов Сбера российский TLS-сертификат Минцифры
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(45))
            .build()
            .expect("reqwest client");
        Self {
            client,
            auth_key: std::env::var("GIGACHAT_AUTH_KEY").ok(),
            token: Arc::new(Mutex::new(None)),
        }
    }

    async fn access_token(&self) -> Result<String, ApiError> {
        {
            let guard = self.token.lock().unwrap();
            if let Some(t) = guard.as_ref() {
                if t.at.elapsed() < TOKEN_TTL {
                    return Ok(t.value.clone());
                }
            }
        }
        let key = self
            .auth_key
            .as_ref()
            .ok_or_else(|| ApiError(StatusCode::SERVICE_UNAVAILABLE, "ИИ не настроен на сервере".into()))?;
        let rquid = {
            let n = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
            format!("{:08x}-{:04x}-{:04x}-{:04x}-{:012x}", n as u32, (n >> 32) as u16, (n >> 48) as u16, (n >> 64) as u16, (n >> 80) as u64 & 0xffffffffffff)
        };
        let res = self
            .client
            .post("https://ngw.devices.sberbank.ru:9443/api/v2/oauth")
            .header("Authorization", format!("Basic {key}"))
            .header("RqUID", rquid)
            .header("Accept", "application/json")
            .form(&[("scope", "GIGACHAT_API_PERS")])
            .send()
            .await
            .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("oauth: {e}")))?;
        if !res.status().is_success() {
            return Err(ApiError(StatusCode::BAD_GATEWAY, format!("oauth: статус {}", res.status())));
        }
        let body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("oauth: {e}")))?;
        let token = body["access_token"]
            .as_str()
            .ok_or_else(|| ApiError(StatusCode::BAD_GATEWAY, "oauth: нет access_token".into()))?
            .to_string();
        *self.token.lock().unwrap() = Some(CachedToken { value: token.clone(), at: Instant::now() });
        Ok(token)
    }
}

#[derive(Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
pub struct ChatRequest {
    messages: Vec<ChatMessage>,
}

#[derive(Serialize)]
pub struct ChatResponse {
    reply: String,
}

pub async fn chat(State(state): State<AppState>, Json(req): Json<ChatRequest>) -> Result<Json<ChatResponse>, ApiError> {
    let clean: Vec<ChatMessage> = req
        .messages
        .into_iter()
        .filter(|m| (m.role == "user" || m.role == "assistant") && !m.content.trim().is_empty())
        .take(MAX_MESSAGES)
        .collect();
    if clean.is_empty() || clean.last().map(|m| m.role.as_str()) != Some("user") {
        return Err(ApiError(StatusCode::BAD_REQUEST, "пустой запрос".into()));
    }

    let mut messages = vec![serde_json::json!({ "role": "system", "content": SYSTEM_PROMPT })];
    for m in &clean {
        let content: String = m.content.chars().take(MAX_CONTENT).collect();
        messages.push(serde_json::json!({ "role": m.role, "content": content }));
    }

    let token = state.ai.access_token().await?;
    let res = state
        .ai
        .client
        .post("https://gigachat.devices.sberbank.ru/api/v1/chat/completions")
        .bearer_auth(token)
        .json(&serde_json::json!({
            "model": "GigaChat",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800,
        }))
        .send()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("gigachat: {e}")))?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(ApiError(StatusCode::BAD_GATEWAY, format!("gigachat: {status} {}", &text[..text.len().min(200)])));
    }
    let body: serde_json::Value = res
        .json()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("gigachat: {e}")))?;
    let reply = body["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("…")
        .to_string();
    Ok(Json(ChatResponse { reply }))
}
