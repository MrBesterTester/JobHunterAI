use chrono::{DateTime, Utc};
use reqwest;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use thiserror::Error;
use uuid::Uuid;

use crate::calendar_auth::{self, CalendarAuth, CalendarAuthError};

#[derive(Error, Debug)]
pub enum CalendarServiceError {
    #[error("Calendar auth error: {0}")]
    AuthError(#[from] CalendarAuthError),

    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("API error: {status} - {message}")]
    ApiError { status: u16, message: String },

    #[error("Invalid event data: {0}")]
    ValidationError(String),

    #[error("Event not found: {0}")]
    EventNotFound(String),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
}

pub type Result<T> = std::result::Result<T, CalendarServiceError>;

const CALENDAR_API_BASE: &str = "https://www.googleapis.com/calendar/v3";

/// Request structure for creating a calendar event
#[derive(Debug, Serialize)]
pub struct CreateEventRequest {
    pub summary: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub attendees: Option<Vec<Attendee>>,
    pub reminders: Option<EventReminders>,
}

/// Request structure for updating a calendar event
#[derive(Debug, Serialize)]
pub struct UpdateEventRequest {
    pub summary: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub attendees: Option<Vec<Attendee>>,
    pub reminders: Option<EventReminders>,
}

/// Event date/time structure
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EventDateTime {
    pub date_time: String,  // RFC3339 timestamp
    pub time_zone: String,  // e.g., "America/Los_Angeles"
}

/// Attendee structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Attendee {
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional: Option<bool>,
}

/// Event reminders configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EventReminders {
    pub use_default: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overrides: Option<Vec<ReminderOverride>>,
}

/// Individual reminder override
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReminderOverride {
    pub method: String,  // "email" or "popup"
    pub minutes: i32,    // Minutes before event
}

/// Calendar event response from Google
#[derive(Debug, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub summary: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub attendees: Option<Vec<Attendee>>,
    pub status: Option<String>,
    #[serde(rename = "htmlLink")]
    pub html_link: Option<String>,
}

/// Calendar service for managing Google Calendar events
pub struct CalendarService {
    pool: PgPool,
    client: reqwest::Client,
}

impl CalendarService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            client: reqwest::Client::new(),
        }
    }

    /// Get a valid access token for calendar operations
    async fn get_access_token(&self) -> Result<String> {
        let calendar_auth = CalendarAuth::from_env(self.pool.clone())?;
        let token = calendar_auth.get_access_token().await?;
        Ok(token)
    }

    /// Create a new calendar event
    pub async fn create_event(
        &self,
        calendar_id: &str,
        event: CreateEventRequest,
    ) -> Result<CalendarEvent> {
        let access_token = self.get_access_token().await?;

        let url = format!(
            "{}/calendars/{}/events",
            CALENDAR_API_BASE,
            urlencoding::encode(calendar_id)
        );

        let response = self
            .client
            .post(&url)
            .bearer_auth(&access_token)
            .json(&event)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(CalendarServiceError::ApiError { status, message });
        }

        let calendar_event: CalendarEvent = response.json().await?;
        Ok(calendar_event)
    }

    /// Update an existing calendar event
    pub async fn update_event(
        &self,
        calendar_id: &str,
        event_id: &str,
        event: UpdateEventRequest,
    ) -> Result<CalendarEvent> {
        let access_token = self.get_access_token().await?;

        let url = format!(
            "{}/calendars/{}/events/{}",
            CALENDAR_API_BASE,
            urlencoding::encode(calendar_id),
            urlencoding::encode(event_id)
        );

        let response = self
            .client
            .put(&url)
            .bearer_auth(&access_token)
            .json(&event)
            .send()
            .await?;

        if response.status() == 404 {
            return Err(CalendarServiceError::EventNotFound(event_id.to_string()));
        }

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(CalendarServiceError::ApiError { status, message });
        }

        let calendar_event: CalendarEvent = response.json().await?;
        Ok(calendar_event)
    }

    /// Delete a calendar event
    pub async fn delete_event(
        &self,
        calendar_id: &str,
        event_id: &str,
    ) -> Result<()> {
        let access_token = self.get_access_token().await?;

        let url = format!(
            "{}/calendars/{}/events/{}",
            CALENDAR_API_BASE,
            urlencoding::encode(calendar_id),
            urlencoding::encode(event_id)
        );

        let response = self
            .client
            .delete(&url)
            .bearer_auth(&access_token)
            .send()
            .await?;

        if response.status() == 404 {
            return Err(CalendarServiceError::EventNotFound(event_id.to_string()));
        }

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(CalendarServiceError::ApiError { status, message });
        }

        Ok(())
    }

    /// List upcoming events from a calendar
    pub async fn list_upcoming_events(
        &self,
        calendar_id: &str,
        max_results: Option<i32>,
        time_min: Option<DateTime<Utc>>,
    ) -> Result<Vec<CalendarEvent>> {
        let access_token = self.get_access_token().await?;

        let time_min = time_min.unwrap_or_else(Utc::now);
        let max_results = max_results.unwrap_or(10);

        let url = format!(
            "{}/calendars/{}/events?timeMin={}&maxResults={}&singleEvents=true&orderBy=startTime",
            CALENDAR_API_BASE,
            urlencoding::encode(calendar_id),
            urlencoding::encode(&time_min.to_rfc3339()),
            max_results
        );

        let response = self
            .client
            .get(&url)
            .bearer_auth(&access_token)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(CalendarServiceError::ApiError { status, message });
        }

        #[derive(Deserialize)]
        struct EventsList {
            items: Vec<CalendarEvent>,
        }

        let events_list: EventsList = response.json().await?;
        Ok(events_list.items)
    }

    /// Get a specific event by ID
    pub async fn get_event(
        &self,
        calendar_id: &str,
        event_id: &str,
    ) -> Result<CalendarEvent> {
        let access_token = self.get_access_token().await?;

        let url = format!(
            "{}/calendars/{}/events/{}",
            CALENDAR_API_BASE,
            urlencoding::encode(calendar_id),
            urlencoding::encode(event_id)
        );

        let response = self
            .client
            .get(&url)
            .bearer_auth(&access_token)
            .send()
            .await?;

        if response.status() == 404 {
            return Err(CalendarServiceError::EventNotFound(event_id.to_string()));
        }

        if !response.status().is_success() {
            let status = response.status().as_u16();
            let message = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(CalendarServiceError::ApiError { status, message });
        }

        let calendar_event: CalendarEvent = response.json().await?;
        Ok(calendar_event)
    }
}

/// Helper function to create default reminders (1 day before and 1 hour before)
pub fn default_interview_reminders() -> EventReminders {
    EventReminders {
        use_default: false,
        overrides: Some(vec![
            ReminderOverride {
                method: "email".to_string(),
                minutes: 24 * 60, // 1 day before
            },
            ReminderOverride {
                method: "popup".to_string(),
                minutes: 60, // 1 hour before
            },
        ]),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_reminders() {
        let reminders = default_interview_reminders();
        assert!(!reminders.use_default);
        assert!(reminders.overrides.is_some());

        let overrides = reminders.overrides.unwrap();
        assert_eq!(overrides.len(), 2);
        assert_eq!(overrides[0].method, "email");
        assert_eq!(overrides[0].minutes, 24 * 60);
        assert_eq!(overrides[1].method, "popup");
        assert_eq!(overrides[1].minutes, 60);
    }
}
