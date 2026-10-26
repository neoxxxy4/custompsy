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
обратиться к специалисту или на телефон доверия. \
Ниже в этом сообщении могут идти реальные данные пользователя из его приложения — это не просьба, а факт: \
ты их видишь. Если пользователь спрашивает, видишь ли ты его данные, — отвечай «да» и кратко перечисли, \
что именно видишь. Если блока с данными нет — честно скажи, что данных нет.";

const ACTIONS_SPEC: &str = "Ты можешь ВЫПОЛНЯТЬ ДЕЙСТВИЯ в приложении пользователя, когда он явно просит \
(«добавь», «запиши», «отметь», «вычеркни», «удали», «создай», «поставь»). Формат — отдельный блок в ответе:\n\
[ACTION]{\"type\":\"...\",...}[/ACTION]\n\
Доступные type:\n\
- add_task {\"text\":\"...\",\"block\":\"название блока, если указан\"} — новый пункт в дне на сегодня\n\
- toggle_task {\"match\":\"фрагмент текста пункта\",\"done\":true} — отметить пункт дня выполненным (done:false — снять отметку)\n\
- remove_task {\"match\":\"фрагмент текста пункта\"} — удалить пункт дня\n\
- add_therapy_note {\"category\":\"trauma|offense|shame|guilt|fear|anger|other\",\"text\":\"...\"} — запись в Терапию\n\
- add_note {\"title\":\"...\",\"body\":\"...\"} — заметка\n\
- add_listrec {\"kind\":\"checklist|list\",\"title\":\"...\",\"items\":[\"...\"]} — чек-лист или список в Записях\n\
- add_psysoc_person {\"name\":\"...\"} — человек в Социуме\n\
- add_psysoc_situation {\"person\":\"имя\",\"text\":\"...\",\"emo\":\"trauma|offense|shame|guilt|fear|anger\",\"sign\":0-12} — ситуация человеку (человек создаётся, если его нет)\n\
- set_belief {\"match\":\"фрагмент текста убеждения\",\"strength\":0-12} — выставить силу убеждения\n\
- set_path_pct {\"pct\":0-100} — шкала ненормальности\n\
Правила: JSON строго однострочный; действие только по явной просьбе пользователя, никогда не выдумывай; \
«отметь/вычеркни/сделал/выполнил» — это toggle_task, «удали/убери» — remove_task, «добавь/запланируй» — add_task; \
используй только поля из спецификации, свои поля не придумывай; после блока одним предложением подтверди, что сделал.";

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
    context: Option<String>,
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

    let mut system = format!("{SYSTEM_PROMPT}\n\n{ACTIONS_SPEC}").to_string();
    let ctx_len = req.context.as_deref().map(|c| c.len()).unwrap_or(0);
    println!("ai/chat: messages={}, context={} байт", clean.len(), ctx_len);
    if let Some(ctx) = req.context {
        let ctx: String = ctx.chars().take(8000).collect();
        if !ctx.trim().is_empty() {
            system.push_str("\n\nДанные пользователя из его приложения (используй как контекст для ответов, не пересказывай целиком):\n");
            system.push_str(&ctx);
        }
    }
    let mut messages = vec![serde_json::json!({ "role": "system", "content": system })];
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
