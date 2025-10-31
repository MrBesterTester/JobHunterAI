use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use thiserror::Error;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};

#[derive(Error, Debug)]
pub enum CalendarAuthError {
    #[error("OAuth configuration error: {0}")]
    ConfigError(String),

    #[error("Token exchange failed: {0}")]
    TokenExchangeError(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("HTTP error: {0}")]
    #[allow(dead_code)]
    HttpError(String),

    #[error("Token not found")]
    TokenNotFound,

    #[error("Token refresh failed: {0}")]
    TokenRefreshError(String),

    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, CalendarAuthError>;

/// OAuth token storage structure
#[derive(Debug, Clone)]
pub struct StoredToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// OAuth token response from Google
#[derive(Debug, Deserialize, Serialize)]
struct TokenResponse {
    access_token: String,
    expires_in: Option<i64>,
    refresh_token: Option<String>,
    scope: Option<String>,
    token_type: Option<String>,
}

/// Calendar OAuth client manager
pub struct CalendarAuth {
    client_id: String,
    client_secret: String,
    redirect_uri: String,
    pool: PgPool,
}

impl CalendarAuth {
    /// Create a new CalendarAuth instance
    pub fn new(
        client_id: String,
        client_secret: String,
        redirect_uri: String,
        pool: PgPool,
    ) -> Self {
        Self {
            client_id,
            client_secret,
            redirect_uri,
            pool,
        }
    }

    /// Create from environment variables
    pub fn from_env(pool: PgPool) -> Result<Self> {
        let client_id = std::env::var("GOOGLE_CALENDAR_CLIENT_ID")
            .or_else(|_| std::env::var("GMAIL_CLIENT_ID")) // Fallback to Gmail credentials
            .map_err(|_| CalendarAuthError::ConfigError("GOOGLE_CALENDAR_CLIENT_ID or GMAIL_CLIENT_ID not set".to_string()))?;

        let client_secret = std::env::var("GOOGLE_CALENDAR_CLIENT_SECRET")
            .or_else(|_| std::env::var("GMAIL_CLIENT_SECRET")) // Fallback to Gmail credentials
            .map_err(|_| CalendarAuthError::ConfigError("GOOGLE_CALENDAR_CLIENT_SECRET or GMAIL_CLIENT_SECRET not set".to_string()))?;

        let redirect_uri = std::env::var("GOOGLE_CALENDAR_REDIRECT_URI")
            .unwrap_or_else(|_| "http://localhost:8080/auth/calendar/callback".to_string());

        Ok(Self::new(client_id, client_secret, redirect_uri, pool))
    }

    /// Get the OAuth authorization URL for user to visit
    pub fn get_authorization_url(&self) -> Result<String> {
        // Request both calendar and calendar.events scopes
        let scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events";

        let auth_url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&scope={}&response_type=code&access_type=offline&prompt=consent",
            urlencoding::encode(&self.client_id),
            urlencoding::encode(&self.redirect_uri),
            urlencoding::encode(scope)
        );

        Ok(auth_url)
    }

    /// Exchange authorization code for access token
    pub async fn exchange_code(&self, code: String) -> Result<StoredToken> {
        let client = reqwest::Client::new();

        let token_response = client
            .post("https://oauth2.googleapis.com/token")
            .form(&[
                ("code", code.as_str()),
                ("client_id", &self.client_id),
                ("client_secret", &self.client_secret),
                ("redirect_uri", &self.redirect_uri),
                ("grant_type", "authorization_code"),
            ])
            .send()
            .await?
            .json::<TokenResponse>()
            .await
            .map_err(|e| CalendarAuthError::TokenExchangeError(format!("Failed to parse token response: {}", e)))?;

        let expires_at = token_response.expires_in.map(|seconds| {
            Utc::now() + Duration::seconds(seconds)
        });

        let stored_token = StoredToken {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            expires_at,
        };

        // Store token in database
        self.store_token(&stored_token).await?;

        Ok(stored_token)
    }

    /// Get the source_id for google_calendar
    async fn get_calendar_source_id(&self) -> Result<Uuid> {
        let row = sqlx::query!(
            r#"
            SELECT source_id
            FROM job_sources
            WHERE source_name = 'google_calendar'
            "#
        )
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| r.source_id)
            .ok_or_else(|| CalendarAuthError::ConfigError(
                "google_calendar source not found in job_sources table. Run migration_phase5.1.sql first.".to_string()
            ))
    }

    /// Store token in database
    async fn store_token(&self, token: &StoredToken) -> Result<()> {
        let source_id = self.get_calendar_source_id().await?;

        let scopes = vec![
            "https://www.googleapis.com/auth/calendar".to_string(),
            "https://www.googleapis.com/auth/calendar.events".to_string()
        ];

        sqlx::query!(
            r#"
            INSERT INTO oauth_credentials (
                source_id, client_id, client_secret, access_token, refresh_token,
                token_expires_at, scope, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (source_id)
            DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                updated_at = NOW()
            "#,
            source_id,
            self.client_id,
            self.client_secret,
            token.access_token,
            token.refresh_token,
            token.expires_at,
            &scopes
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get token from database
    async fn get_stored_token(&self) -> Result<StoredToken> {
        let source_id = self.get_calendar_source_id().await?;

        let row = sqlx::query!(
            r#"
            SELECT access_token, refresh_token, token_expires_at
            FROM oauth_credentials
            WHERE source_id = $1
            "#,
            source_id
        )
        .fetch_optional(&self.pool)
        .await?;

        let row = row.ok_or(CalendarAuthError::TokenNotFound)?;

        Ok(StoredToken {
            access_token: row.access_token.ok_or(CalendarAuthError::TokenNotFound)?,
            refresh_token: row.refresh_token,
            expires_at: row.token_expires_at,
        })
    }

    /// Check if token is expired or about to expire (within 5 minutes)
    fn is_token_expired(token: &StoredToken) -> bool {
        if let Some(expires_at) = token.expires_at {
            let now = Utc::now();
            let buffer = Duration::minutes(5);
            expires_at < (now + buffer)
        } else {
            false // If no expiry set, assume not expired
        }
    }

    /// Refresh access token using refresh token
    async fn refresh_token(&self, refresh_token: String) -> Result<StoredToken> {
        let client = reqwest::Client::new();

        let grant_type = "refresh_token".to_string();
        let token_response = client
            .post("https://oauth2.googleapis.com/token")
            .form(&[
                ("client_id", &self.client_id),
                ("client_secret", &self.client_secret),
                ("refresh_token", &refresh_token),
                ("grant_type", &grant_type),
            ])
            .send()
            .await?
            .json::<TokenResponse>()
            .await
            .map_err(|e| CalendarAuthError::TokenRefreshError(format!("Failed to parse refresh response: {}", e)))?;

        let expires_at = token_response.expires_in.map(|seconds| {
            Utc::now() + Duration::seconds(seconds)
        });

        let stored_token = StoredToken {
            access_token: token_response.access_token,
            refresh_token: Some(refresh_token), // Keep the same refresh token
            expires_at,
        };

        // Update token in database
        self.store_token(&stored_token).await?;

        Ok(stored_token)
    }

    /// Get a valid access token (refreshing if necessary)
    pub async fn get_valid_token(&self) -> Result<StoredToken> {
        let mut token = self.get_stored_token().await?;

        // Check if token needs refresh
        if Self::is_token_expired(&token) {
            if let Some(ref refresh_token) = token.refresh_token {
                token = self.refresh_token(refresh_token.clone()).await?;
            } else {
                return Err(CalendarAuthError::TokenRefreshError(
                    "Token expired and no refresh token available".to_string(),
                ));
            }
        }

        Ok(token)
    }

    /// Get the current access token (for use in direct API calls)
    /// This is preferred over get_calendar_hub for simpler REST API integration
    pub async fn get_access_token(&self) -> Result<String> {
        let token = self.get_valid_token().await?;
        Ok(token.access_token)
    }

    // NOTE: CalendarHub integration is currently not implemented due to complexity
    // with yup-oauth2 v8 API. Calendar operations should use direct REST API calls
    // with the access token from get_access_token() instead.
    //
    // Example:
    // let token = calendar_auth.get_access_token().await?;
    // let client = reqwest::Client::new();
    // let response = client
    //     .post("https://www.googleapis.com/calendar/v3/calendars/primary/events")
    //     .bearer_auth(token)
    //     .json(&event_data)
    //     .send()
    //     .await?;

    /// Check if user has authorized calendar access
    #[allow(dead_code)]
    pub async fn is_authorized(&self) -> bool {
        self.get_stored_token().await.is_ok()
    }

    /// Revoke authorization (delete stored tokens)
    #[allow(dead_code)]
    pub async fn revoke_authorization(&self) -> Result<()> {
        let source_id = self.get_calendar_source_id().await?;

        sqlx::query!(
            r#"
            DELETE FROM oauth_credentials
            WHERE source_id = $1
            "#,
            source_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_expiry_check() {
        // Token expired 10 minutes ago
        let expired_token = StoredToken {
            access_token: "test_token".to_string(),
            refresh_token: Some("refresh_token".to_string()),
            expires_at: Some(Utc::now() - Duration::minutes(10)),
        };
        assert!(CalendarAuth::is_token_expired(&expired_token));

        // Token expires in 3 minutes (within 5-minute buffer)
        let soon_expired_token = StoredToken {
            access_token: "test_token".to_string(),
            refresh_token: Some("refresh_token".to_string()),
            expires_at: Some(Utc::now() + Duration::minutes(3)),
        };
        assert!(CalendarAuth::is_token_expired(&soon_expired_token));

        // Token expires in 10 minutes (safe)
        let valid_token = StoredToken {
            access_token: "test_token".to_string(),
            refresh_token: Some("refresh_token".to_string()),
            expires_at: Some(Utc::now() + Duration::minutes(10)),
        };
        assert!(!CalendarAuth::is_token_expired(&valid_token));

        // Token with no expiry
        let no_expiry_token = StoredToken {
            access_token: "test_token".to_string(),
            refresh_token: Some("refresh_token".to_string()),
            expires_at: None,
        };
        assert!(!CalendarAuth::is_token_expired(&no_expiry_token));
    }
}
