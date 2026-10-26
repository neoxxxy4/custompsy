use axum::body::Bytes;
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
(«добавь», «запиши», «отметь», «вычеркни», «удали», «создай», «поставь», «очисти»). Формат — отдельный блок в ответе:\n\
[ACTION]{\"type\":\"...\",...}[/ACTION]\n\
Доступные type:\n\
- add_task {\"text\":\"...\",\"block\":\"название блока, если указан\"} — новый пункт в дне на сегодня\n\
- toggle_task {\"match\":\"фрагмент текста пункта\",\"block\":\"название блока, если указан\",\"done\":true} — отметить пункт дня выполненным (done:false — снять отметку)\n\
- remove_task {\"match\":\"фрагмент текста пункта\",\"block\":\"название блока, если указан\"} — удалить пункт дня\n\
- add_block {\"title\":\"...\"} — новый пустой блок в дне (если название не названо — title:\"\")\n\
- add_saved_block {\"match\":\"фрагмент названия\"} — добавить в день блок из сохранённых шаблонов (список есть в данных)\n\
- clear_block {\"match\":\"фрагмент названия блока\"} — убрать все пункты из блока дня\n\
- remove_block {\"match\":\"фрагмент названия блока\"} — удалить блок из дня\n\
- add_therapy_note {\"category\":\"trauma|offense|shame|guilt|fear|anger|other\",\"text\":\"...\"} — запись в Терапию\n\
- add_note {\"title\":\"...\",\"body\":\"...\"} — заметка\n\
- add_listrec {\"kind\":\"checklist|list\",\"title\":\"...\",\"items\":[\"...\"]} — чек-лист или список в Записях\n\
- add_psysoc_person {\"name\":\"...\"} — человек в Социуме\n\
- add_psysoc_situation {\"person\":\"имя\",\"text\":\"...\",\"emo\":\"trauma|offense|shame|guilt|fear|anger\",\"sign\":0-12} — ситуация человеку (человек создаётся, если его нет)\n\
- set_belief {\"match\":\"фрагмент текста убеждения\",\"strength\":0-12} — выставить силу убеждения\n\
- set_path_pct {\"pct\":0-100} — шкала ненормальности\n\
Примеры: «сними галочку с X» → [ACTION]{\"type\":\"toggle_task\",\"match\":\"X\",\"done\":false}[/ACTION]; \
«отметь X» → [ACTION]{\"type\":\"toggle_task\",\"match\":\"X\",\"done\":true}[/ACTION]; \
«создай блок» → [ACTION]{\"type\":\"add_block\",\"title\":\"\"}[/ACTION]\n\
Правила: JSON строго однострочный; действие только по явной просьбе пользователя, никогда не выдумывай; \
«отметь/вычеркни/сделал/выполнил» — toggle_task с done:true, «сними галочку/отметку» — toggle_task с done:false ОБЯЗАТЕЛЬНО, \
«удали/убери пункт» — remove_task, «добавь/запланируй» — add_task, «создай блок» — add_block, \
«добавь сохранённый блок» — add_saved_block, «очисти/удали всё из блока» — clear_block; \
используй только поля из спецификации, свои поля не придумывай; \
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать, что действие выполнено, если ты не вставил блок [ACTION] — \
если просьбу нельзя выполнить этими действиями, честно скажи «этого я пока не умею» и кратко перечисли, что умеешь; \
после блока одним предложением подтверди, что сделал. Не начинай ответ со слова «да».";

const MAX_MESSAGES: usize = 30;
const MAX_CONTENT: usize = 4000;
const MAX_AUDIO: usize = 10 * 1024 * 1024;

#[derive(Clone)]
pub struct AiState {
    client: reqwest::Client,
    api_key: Option<String>,
    folder_id: String,
    model: String,
}

impl AiState {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .expect("reqwest client"),
            api_key: std::env::var("YC_API_KEY").ok(),
            folder_id: std::env::var("YC_FOLDER_ID").unwrap_or_else(|_| "b1gbjjd4gdnuhslajjkt".into()),
            model: std::env::var("YC_MODEL").unwrap_or_else(|_| "yandexgpt-lite".into()),
        }
    }

    fn key(&self) -> Result<&str, ApiError> {
        self.api_key
            .as_deref()
            .ok_or_else(|| ApiError(StatusCode::SERVICE_UNAVAILABLE, "ИИ не настроен на сервере".into()))
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
    let last_user: String = clean.last().map(|m| m.content.chars().take(150).collect()).unwrap_or_default();
    println!("ai/chat: messages={}, context={} байт, вопрос: {}", clean.len(), ctx_len, last_user);
    if let Some(ctx) = req.context {
        let ctx: String = ctx.chars().take(8000).collect();
        if !ctx.trim().is_empty() {
            system.push_str("\n\nДанные пользователя из его приложения (используй как контекст для ответов, не пересказывай целиком):\n");
            system.push_str(&ctx);
        }
    }
    let mut messages = vec![serde_json::json!({ "role": "system", "text": system })];
    for m in &clean {
        let content: String = m.content.chars().take(MAX_CONTENT).collect();
        messages.push(serde_json::json!({ "role": m.role, "text": content }));
    }

    let key = state.ai.key()?;
    let res = state
        .ai
        .client
        .post("https://llm.api.cloud.yandex.net/foundationModels/v1/completion")
        .header("Authorization", format!("Api-Key {key}"))
        .json(&serde_json::json!({
            "modelUri": format!("gpt://{}/{}", state.ai.folder_id, state.ai.model),
            "completionOptions": { "stream": false, "temperature": 0.7, "maxTokens": "800" },
            "messages": messages,
        }))
        .send()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("yandexgpt: {e}")))?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        println!("ai/chat ошибка: yandexgpt {status} {}", &text[..text.len().min(300)]);
        return Err(ApiError(StatusCode::BAD_GATEWAY, format!("yandexgpt: {status} {}", &text[..text.len().min(200)])));
    }
    let body: serde_json::Value = res
        .json()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("yandexgpt: {e}")))?;
    let reply = body["result"]["alternatives"][0]["message"]["text"]
        .as_str()
        .unwrap_or("…")
        .to_string();
    println!("ai/chat ответ: {}", reply.chars().take(400).collect::<String>());
    Ok(Json(ChatResponse { reply }))
}

#[derive(Serialize)]
pub struct SttResponse {
    text: String,
}

// голос → текст через Yandex SpeechKit: тело — аудиофайл (webm/ogg opus), Content-Type подсказывает формат
pub async fn stt(State(state): State<AppState>, headers: axum::http::HeaderMap, body: Bytes) -> Result<Json<SttResponse>, ApiError> {
    if body.is_empty() {
        return Err(ApiError(StatusCode::BAD_REQUEST, "пустое аудио".into()));
    }
    if body.len() > MAX_AUDIO {
        return Err(ApiError(StatusCode::PAYLOAD_TOO_LARGE, "аудио слишком длинное".into()));
    }
    let ct = headers
        .get(axum::http::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let format = if ct.contains("webm") {
        "webmopus"
    } else if ct.contains("mpeg") || ct.contains("mp3") {
        "mp3"
    } else if ct.contains("lpcm") || ct.contains("L16") {
        "lpcm"
    } else {
        "oggopus"
    };
    let key = state.ai.key()?.to_string();
    let folder = state.ai.folder_id.clone();
    let res = state
        .ai
        .client
        .post(format!(
            "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?folderId={folder}&lang=ru-RU&format={format}"
        ))
        .header("Authorization", format!("Api-Key {key}"))
        .header("Content-Type", "application/octet-stream")
        .body(body.to_vec())
        .send()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("speechkit: {e}")))?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        println!("stt ошибка: speechkit {status} {}", &text[..text.len().min(300)]);
        return Err(ApiError(StatusCode::BAD_GATEWAY, format!("speechkit: {status}")));
    }
    let body: serde_json::Value = res
        .json()
        .await
        .map_err(|e| ApiError(StatusCode::BAD_GATEWAY, format!("speechkit: {e}")))?;
    let text = body["result"].as_str().unwrap_or("").to_string();
    println!("stt: распознано {} симв", text.chars().count());
    Ok(Json(SttResponse { text }))
}
