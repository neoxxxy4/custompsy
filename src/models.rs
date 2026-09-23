use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksState {
    pub date: String,
    pub checks: HashMap<String, bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksUpdate {
    pub checks: HashMap<String, bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceState {
    pub values: Vec<i64>,
}

impl Default for BalanceState {
    fn default() -> Self {
        Self {
            values: vec![6, 7, 5, 4, 6, 5],
        }
    }
}
