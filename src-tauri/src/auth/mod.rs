pub mod password;
pub mod session;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Role {
    ADMIN,
    OPERATOR,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::ADMIN => "ADMIN",
            Role::OPERATOR => "OPERATOR",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "ADMIN" => Some(Role::ADMIN),
            "OPERATOR" => Some(Role::OPERATOR),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub username: String,
    pub role: Role,
    pub full_name: String,
    pub is_active: bool,
}
