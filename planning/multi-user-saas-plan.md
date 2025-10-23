<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Multi-User SaaS Conversion Plan for JobHunter](#multi-user-saas-conversion-plan-for-jobhunter)
  - [Table of Contents](#table-of-contents)
  - [Architecture Overview](#architecture-overview)
    - [Single-User (Current)](#single-user-current)
    - [Multi-User SaaS (Target)](#multi-user-saas-target)
  - [Authentication Strategy](#authentication-strategy)
    - [Option 1: JWT (JSON Web Tokens) - RECOMMENDED](#option-1-jwt-json-web-tokens---recommended)
    - [Option 2: OAuth (Google/GitHub) - EASIER FOR USERS](#option-2-oauth-googlegithub---easier-for-users)
    - [Option 3: Clerk.dev / Auth0 - FULLY MANAGED (Easiest)](#option-3-clerkdev--auth0---fully-managed-easiest)
  - [Database Schema Changes](#database-schema-changes)
    - [Add Users Table](#add-users-table)
    - [Add user_id to Existing Tables](#add-user_id-to-existing-tables)
    - [Add Usage Tracking Table](#add-usage-tracking-table)
    - [Add Payments Table (for Stripe integration)](#add-payments-table-for-stripe-integration)
  - [Authorization & Data Isolation](#authorization--data-isolation)
    - [Middleware for Authentication](#middleware-for-authentication)
    - [Apply Middleware to Routes](#apply-middleware-to-routes)
    - [Extract user_id in Route Handlers](#extract-user_id-in-route-handlers)
  - [Payment & Subscription Management](#payment--subscription-management)
    - [Stripe Integration (Recommended)](#stripe-integration-recommended)
    - [Stripe Webhook Handler](#stripe-webhook-handler)
    - [Subscription Tiers & Feature Gating](#subscription-tiers--feature-gating)
  - [Pricing Strategy](#pricing-strategy)
    - [Suggested Pricing Tiers](#suggested-pricing-tiers)
      - [Free Tier (Freemium)](#free-tier-freemium)
      - [Starter Tier](#starter-tier)
      - [Pro Tier](#pro-tier)
      - [Enterprise Tier](#enterprise-tier)
    - [Pricing Rationale](#pricing-rationale)
  - [Implementation Phases](#implementation-phases)
    - [Phase 1: Authentication (Week 1)](#phase-1-authentication-week-1)
    - [Phase 2: Data Isolation (Week 2)](#phase-2-data-isolation-week-2)
    - [Phase 3: Subscription Tiers (Week 3)](#phase-3-subscription-tiers-week-3)
    - [Phase 4: Stripe Integration (Week 4)](#phase-4-stripe-integration-week-4)
    - [Phase 5: Usage Tracking & Billing (Week 5-6)](#phase-5-usage-tracking--billing-week-5-6)
    - [Phase 6: Polish & Launch (Week 7-8)](#phase-6-polish--launch-week-7-8)
  - [Frontend Changes](#frontend-changes)
    - [Add Authentication Pages](#add-authentication-pages)
    - [Update API Calls to Include JWT](#update-api-calls-to-include-jwt)
    - [Protected Routes](#protected-routes)
  - [Security Considerations](#security-considerations)
    - [1. Password Security](#1-password-security)
    - [2. JWT Security](#2-jwt-security)
    - [3. SQL Injection Protection](#3-sql-injection-protection)
    - [4. Rate Limiting](#4-rate-limiting)
    - [5. HTTPS Everywhere](#5-https-everywhere)
    - [6. GDPR Compliance (if serving EU users)](#6-gdpr-compliance-if-serving-eu-users)
  - [Cost Analysis & Profit Model](#cost-analysis--profit-model)
    - [Monthly Costs Per User Tier](#monthly-costs-per-user-tier)
    - [When to Upgrade Shuttle](#when-to-upgrade-shuttle)
    - [Revenue Projections](#revenue-projections)
    - [Break-Even Analysis](#break-even-analysis)
    - [Recouping Development Costs](#recouping-development-costs)
  - [Alternative: White-Label Licensing](#alternative-white-label-licensing)
  - [Recommendation](#recommendation)
    - [Path 1: SaaS (Recommended if you want passive income)](#path-1-saas-recommended-if-you-want-passive-income)
    - [Path 2: Portfolio Project Only (Fastest)](#path-2-portfolio-project-only-fastest)
  - [Questions Answered](#questions-answered)
    - [1. Frontend hosting on Vercel](#1-frontend-hosting-on-vercel)
    - [2. Private data](#2-private-data)
    - [3. Multi-user with Shuttle](#3-multi-user-with-shuttle)
    - [4. Billing users](#4-billing-users)
    - [5. Recouping costs](#5-recouping-costs)
  - [Next Steps](#next-steps)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Multi-User SaaS Conversion Plan for JobHunter

**Date**: October 1, 2025
**Goal**: Convert JobHunter from single-user to multi-tenant SaaS with authentication, billing, and data isolation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Strategy](#authentication-strategy)
3. [Database Schema Changes](#database-schema-changes)
4. [Authorization & Data Isolation](#authorization--data-isolation)
5. [Payment & Subscription Management](#payment--subscription-management)
6. [Pricing Strategy](#pricing-strategy)
7. [Implementation Phases](#implementation-phases)
8. [Frontend Changes](#frontend-changes)
9. [Security Considerations](#security-considerations)
10. [Cost Analysis & Profit Model](#cost-analysis--profit-model)

---

## Architecture Overview

### Single-User (Current)
```
You → JobHunter Frontend → Shuttle Backend → PostgreSQL (all your jobs)
```

### Multi-User SaaS (Target)
```
User A → JobHunter Frontend ─┐
User B → JobHunter Frontend ─┼→ Auth Layer → Shuttle Backend → PostgreSQL
User C → JobHunter Frontend ─┘                                    ├─ User A's jobs
                                                                   ├─ User B's jobs
                                                                   └─ User C's jobs
```

**Key Differences**:
- ✅ Users create accounts and log in
- ✅ Each user sees only their own jobs
- ✅ Shared infrastructure (one database, but isolated data)
- ✅ Subscription management per user
- ✅ Usage tracking for billing

---

## Authentication Strategy

### Option 1: JWT (JSON Web Tokens) - RECOMMENDED

**Why JWT**:
- Stateless (no session storage needed)
- Works great with React frontends
- Standard in Rust ecosystem
- Easy to implement with existing libraries

**Libraries**:
```toml
# Cargo.toml
[dependencies]
jsonwebtoken = "9.3"          # JWT creation/validation
argon2 = "0.5"                # Password hashing
validator = "0.18"             # Email/password validation
```

**Flow**:
```
1. User signs up: POST /api/auth/signup
   ├─ Hash password (argon2)
   ├─ Store in users table
   └─ Return JWT token

2. User logs in: POST /api/auth/login
   ├─ Verify email/password
   ├─ Generate JWT token (expires in 7 days)
   └─ Return token

3. Authenticated requests:
   ├─ Frontend sends: Authorization: Bearer <token>
   ├─ Backend validates token
   ├─ Extract user_id from token
   └─ Filter queries by user_id
```

**JWT Payload**:
```rust
#[derive(Serialize, Deserialize)]
struct Claims {
    sub: Uuid,           // user_id
    email: String,
    exp: usize,          // expiration timestamp
    iat: usize,          // issued at timestamp
}
```

---

### Option 2: OAuth (Google/GitHub) - EASIER FOR USERS

**Why OAuth**:
- Users don't create passwords (one less thing to remember)
- Trusted providers (Google, GitHub)
- Faster signup flow
- Social proof ("Sign in with Google")

**Libraries**:
```toml
[dependencies]
oauth2 = "4.4"
reqwest = { version = "0.11", features = ["json"] }
```

**Flow**:
```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth
3. User authorizes
4. Google redirects back with code
5. Backend exchanges code for user info
6. Create/lookup user in database
7. Issue JWT token
8. Redirect to app with token
```

**Recommendation**: Start with JWT (Option 1), add OAuth later.

---

### Option 3: Clerk.dev / Auth0 - FULLY MANAGED (Easiest)

**Why Managed Auth**:
- Don't build auth yourself (security-critical)
- Pre-built UI components
- Social logins included
- Email verification, password reset, etc.
- MFA/2FA support

**Cost**:
- **Clerk**: Free for 10,000 MAU (monthly active users), then $25/mo per 1,000 users
- **Auth0**: Free for 7,000 MAU, then $23/mo + $0.0175 per user

**Integration** (Clerk example):
```bash
# Frontend
npm install @clerk/clerk-react

# Backend validates Clerk JWT
# No password handling needed!
```

**Recommendation for SaaS**: Consider Clerk if you're serious about monetization (saves months of dev time).

---

## Database Schema Changes

### Add Users Table

```sql
-- Users table (new)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,  -- argon2 hash (or NULL if OAuth)
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Subscription info
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK(subscription_status IN ('active', 'canceled', 'past_due', 'unpaid')),
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT UNIQUE,  -- For Stripe billing

    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
```

### Add user_id to Existing Tables

**Modify all data tables to include user ownership**:

```sql
-- Jobs table (add user_id)
ALTER TABLE jobs ADD COLUMN user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE;
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- Applications table
ALTER TABLE applications ADD COLUMN user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE;
CREATE INDEX idx_applications_user_id ON applications(user_id);

-- Resume versions table
ALTER TABLE resume_versions ADD COLUMN user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE;
CREATE INDEX idx_resume_versions_user_id ON resume_versions(user_id);

-- Cover letter templates table
ALTER TABLE cover_letter_templates ADD COLUMN user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE;
CREATE INDEX idx_cover_letter_templates_user_id ON cover_letter_templates(user_id);

-- Job filtering criteria table (per-user preferences)
ALTER TABLE job_filtering_criteria ADD COLUMN user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_criteria_user_id ON job_filtering_criteria(user_id);
```

### Add Usage Tracking Table

**For billing based on usage**:

```sql
CREATE TABLE usage_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- 'job_created', 'content_generated', 'api_call', etc.
    event_data JSONB,           -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at);

-- Usage summary view
CREATE VIEW user_usage_summary AS
SELECT
    user_id,
    DATE_TRUNC('month', created_at) as month,
    event_type,
    COUNT(*) as event_count
FROM usage_events
GROUP BY user_id, DATE_TRUNC('month', created_at), event_type;
```

### Add Payments Table (for Stripe integration)

```sql
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK(status IN ('pending', 'succeeded', 'failed', 'refunded')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

---

## Authorization & Data Isolation

### Middleware for Authentication

**Create auth middleware** (`backend/src/middleware/auth.rs`):

```rust
use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use jsonwebtoken::{decode, DecodingKey, Validation};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,           // user_id
    pub email: String,
    pub exp: usize,
    pub iat: usize,
}

pub async fn jwt_validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let token = credentials.token();
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::default(),
    ) {
        Ok(token_data) => {
            // Insert user_id into request extensions for route handlers
            req.extensions_mut().insert(token_data.claims.sub);
            Ok(req)
        }
        Err(_) => Err((actix_web::error::ErrorUnauthorized("Invalid token"), req)),
    }
}
```

### Apply Middleware to Routes

```rust
// backend/src/main.rs or routes/mod.rs

use actix_web_httpauth::middleware::HttpAuthentication;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    let auth = HttpAuthentication::bearer(jwt_validator);

    cfg
        // Public routes (no auth required)
        .service(
            web::scope("/api/auth")
                .route("/signup", web::post().to(signup))
                .route("/login", web::post().to(login))
                .route("/forgot-password", web::post().to(forgot_password))
        )

        // Protected routes (require auth)
        .service(
            web::scope("/api")
                .wrap(auth)  // Apply auth middleware
                .route("/jobs", web::get().to(get_jobs))
                .route("/jobs", web::post().to(create_job))
                .route("/jobs/{id}", web::get().to(get_job))
                .route("/jobs/{id}/status", web::put().to(update_job_status))
                // ... all other routes
        );
}
```

### Extract user_id in Route Handlers

```rust
// backend/src/routes/jobs.rs

use actix_web::{web, HttpRequest, HttpResponse, Result};
use uuid::Uuid;

pub async fn get_jobs(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    // Extract user_id from request (inserted by auth middleware)
    let user_id = req.extensions()
        .get::<Uuid>()
        .copied()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Not authenticated"))?;

    // Query ONLY this user's jobs
    let jobs = sqlx::query_as!(
        Job,
        r#"
        SELECT * FROM jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
        "#,
        user_id
    )
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(jobs))
}

pub async fn create_job(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    job_data: web::Json<CreateJobRequest>,
) -> Result<HttpResponse> {
    let user_id = req.extensions()
        .get::<Uuid>()
        .copied()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Not authenticated"))?;

    // Insert job with user_id
    let job = sqlx::query_as!(
        Job,
        r#"
        INSERT INTO jobs (user_id, title, company, location, salary, source, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
        user_id,
        job_data.title,
        job_data.company,
        job_data.location,
        job_data.salary,
        job_data.source,
        job_data.description
    )
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(job))
}
```

**Key Point**: EVERY query must filter by `user_id`. This ensures data isolation.

---

## Payment & Subscription Management

### Stripe Integration (Recommended)

**Why Stripe**:
- Industry standard for SaaS billing
- Handles compliance (PCI, tax, etc.)
- Subscription management built-in
- Webhooks for automation
- Global payment methods

**Setup**:

```toml
# Cargo.toml
[dependencies]
stripe = { version = "0.33", features = ["async"] }
```

```rust
// backend/src/billing/stripe.rs

use stripe::{
    Client, Customer, Price, Subscription,
    CreateCustomer, CreateSubscription
};

pub struct BillingService {
    stripe_client: Client,
}

impl BillingService {
    pub fn new(stripe_secret_key: String) -> Self {
        Self {
            stripe_client: Client::new(stripe_secret_key),
        }
    }

    pub async fn create_customer(&self, email: String, user_id: Uuid) -> Result<Customer, Error> {
        let mut params = CreateCustomer::new();
        params.email = Some(&email);
        params.metadata = Some([
            ("user_id".to_string(), user_id.to_string())
        ].iter().cloned().collect());

        Customer::create(&self.stripe_client, params).await
    }

    pub async fn create_subscription(
        &self,
        customer_id: &str,
        price_id: &str,
    ) -> Result<Subscription, Error> {
        let mut params = CreateSubscription::new(customer_id);
        params.items = Some(vec![
            CreateSubscriptionItems {
                price: Some(price_id.to_string()),
                ..Default::default()
            }
        ]);

        Subscription::create(&self.stripe_client, params).await
    }
}
```

### Stripe Webhook Handler

**Handle subscription events**:

```rust
// backend/src/routes/webhooks.rs

use actix_web::{web, HttpRequest, HttpResponse, Result};
use stripe::{Event, EventObject, EventType};

pub async fn stripe_webhook(
    req: HttpRequest,
    payload: String,
    pool: web::Data<PgPool>,
) -> Result<HttpResponse> {
    let signature = req.headers()
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing signature"))?;

    let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")?;

    let event = stripe::Webhook::construct_event(
        &payload,
        signature,
        &webhook_secret,
    )?;

    match event.type_ {
        EventType::CustomerSubscriptionCreated => {
            // Update user's subscription status
            if let EventObject::Subscription(subscription) = event.data.object {
                update_user_subscription(pool.get_ref(), &subscription).await?;
            }
        }
        EventType::CustomerSubscriptionUpdated => {
            // Handle subscription changes (upgrades/downgrades)
        }
        EventType::CustomerSubscriptionDeleted => {
            // Handle cancellations
        }
        EventType::InvoicePaymentSucceeded => {
            // Record successful payment
        }
        EventType::InvoicePaymentFailed => {
            // Handle failed payment (send email, suspend account)
        }
        _ => {
            // Ignore other events
        }
    }

    Ok(HttpResponse::Ok().finish())
}

async fn update_user_subscription(
    pool: &PgPool,
    subscription: &Subscription,
) -> Result<(), sqlx::Error> {
    let customer_id = subscription.customer.id();
    let status = match subscription.status {
        SubscriptionStatus::Active => "active",
        SubscriptionStatus::Canceled => "canceled",
        SubscriptionStatus::PastDue => "past_due",
        _ => "inactive",
    };

    sqlx::query!(
        r#"
        UPDATE users
        SET subscription_status = $1,
            subscription_expires_at = $2
        WHERE stripe_customer_id = $3
        "#,
        status,
        subscription.current_period_end,
        customer_id.as_str()
    )
    .execute(pool)
    .await?;

    Ok(())
}
```

### Subscription Tiers & Feature Gating

```rust
// backend/src/models/user.rs

#[derive(Debug, Clone, PartialEq)]
pub enum SubscriptionTier {
    Free,
    Starter,
    Pro,
    Enterprise,
}

impl SubscriptionTier {
    pub fn max_jobs(&self) -> Option<usize> {
        match self {
            Self::Free => Some(10),
            Self::Starter => Some(100),
            Self::Pro => Some(1000),
            Self::Enterprise => None,  // Unlimited
        }
    }

    pub fn max_content_generations_per_month(&self) -> Option<usize> {
        match self {
            Self::Free => Some(5),
            Self::Starter => Some(50),
            Self::Pro => Some(500),
            Self::Enterprise => None,
        }
    }

    pub fn has_gmail_integration(&self) -> bool {
        match self {
            Self::Free => false,
            _ => true,
        }
    }

    pub fn has_priority_support(&self) -> bool {
        matches!(self, Self::Pro | Self::Enterprise)
    }
}
```

**Enforce limits in route handlers**:

```rust
pub async fn create_job(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    job_data: web::Json<CreateJobRequest>,
) -> Result<HttpResponse> {
    let user_id = extract_user_id(&req)?;

    // Get user's subscription tier
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE user_id = $1", user_id)
        .fetch_one(pool.get_ref())
        .await?;

    let tier = user.subscription_tier();

    // Check if user has hit job limit
    if let Some(max_jobs) = tier.max_jobs() {
        let job_count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM jobs WHERE user_id = $1",
            user_id
        )
        .fetch_one(pool.get_ref())
        .await?;

        if job_count >= max_jobs as i64 {
            return Ok(HttpResponse::PaymentRequired().json(json!({
                "error": "Job limit reached",
                "limit": max_jobs,
                "message": "Upgrade to create more jobs"
            })));
        }
    }

    // Proceed with job creation
    // ...
}
```

---

## Pricing Strategy

### Suggested Pricing Tiers

Based on your costs and market research:

#### Free Tier (Freemium)
- **Price**: $0/month
- **Purpose**: Acquisition, let users try the product
- **Limits**:
  - 10 jobs max
  - 5 resume/cover letter generations per month
  - No Gmail/LinkedIn integration
  - Community support only
- **Your Cost**: ~$0-1/month per user (Shuttle free tier can handle many users)

#### Starter Tier
- **Price**: $9/month or $90/year (save $18)
- **Target**: Individual job seekers
- **Features**:
  - 100 jobs
  - 50 content generations per month
  - Gmail integration
  - Email support
- **Your Cost**: ~$1-2/month per user
- **Profit**: $7-8/month per user

#### Pro Tier
- **Price**: $29/month or $290/year (save $58)
- **Target**: Active job seekers, recruiters
- **Features**:
  - 1,000 jobs
  - 500 content generations per month
  - Gmail + LinkedIn integration
  - Priority email support
  - Custom domains
  - API access
- **Your Cost**: ~$3-5/month per user
- **Profit**: $24-26/month per user

#### Enterprise Tier
- **Price**: $99+/month (custom)
- **Target**: Recruiting agencies, career coaches
- **Features**:
  - Unlimited jobs
  - Unlimited content generation
  - All integrations
  - Dedicated support
  - White-labeling
  - SLA guarantees
- **Your Cost**: Variable, depends on usage
- **Profit**: Negotiated per customer

### Pricing Rationale

**Why these prices**:
- **Free tier**: Standard for SaaS (10-20% convert to paid)
- **$9/month**: Lower than competitors (LinkedIn Premium = $40/mo)
- **$29/month**: Sweet spot for serious users
- **$99/month**: Enterprise customers expect to pay more

**Market comparison**:
- LinkedIn Premium: $40-120/month
- Huntr.co: $15/month
- Teal.io: $9-29/month
- JibberJobber: $10/month

**Your pricing is competitive** and justified by automation + AI features.

---

## Implementation Phases

### Phase 1: Authentication (Week 1)
**Time**: 20-30 hours

**Tasks**:
1. Add users table to database
2. Implement signup/login endpoints
3. JWT token generation/validation
4. Auth middleware
5. Frontend login/signup pages
6. Update all routes to require auth
7. Testing

**Deliverable**: Users can sign up, log in, and access their own data

---

### Phase 2: Data Isolation (Week 2)
**Time**: 15-20 hours

**Tasks**:
1. Add user_id to all tables
2. Update all queries to filter by user_id
3. Migrate existing data (assign to admin user)
4. Test data isolation (User A cannot see User B's jobs)
5. Add user profile page

**Deliverable**: Multi-tenant data isolation working

---

### Phase 3: Subscription Tiers (Week 3)
**Time**: 20-25 hours

**Tasks**:
1. Add subscription fields to users table
2. Implement feature gating logic
3. Create pricing page (frontend)
4. Add "Upgrade" prompts when limits hit
5. Admin dashboard to manage users

**Deliverable**: Free tier works with limits, upgrade prompts shown

---

### Phase 4: Stripe Integration (Week 4)
**Time**: 25-35 hours

**Tasks**:
1. Setup Stripe account
2. Create Stripe products/prices
3. Implement Stripe checkout
4. Webhook handler for subscription events
5. Billing portal (let users manage subscription)
6. Payment history page
7. Handle failed payments
8. Testing with Stripe test mode

**Deliverable**: Users can subscribe, pay, upgrade, cancel

---

### Phase 5: Usage Tracking & Billing (Week 5-6)
**Time**: 15-20 hours

**Tasks**:
1. Add usage_events table
2. Track API usage, job creations, content generations
3. Display usage stats to users
4. Email alerts for approaching limits
5. Analytics dashboard (for you)

**Deliverable**: Usage-based billing ready (if needed)

---

### Phase 6: Polish & Launch (Week 7-8)
**Time**: 20-30 hours

**Tasks**:
1. Email notifications (welcome, payment confirmation, etc.)
2. Terms of Service / Privacy Policy pages
3. Help/FAQ section
4. Onboarding flow for new users
5. Marketing landing page
6. SEO optimization
7. Beta testing with 10-20 users
8. Bug fixes
9. Official launch 🚀

**Deliverable**: Production-ready SaaS

---

**Total Implementation Time**: 115-160 hours (3-4 months part-time, 6-8 weeks full-time)

---

## Frontend Changes

### Add Authentication Pages

**Login Page** (`frontend/src/pages/Login.tsx`):

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('jwt_token', token);
      navigate('/dashboard');
    } else {
      alert('Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Log In</button>
    </form>
  );
}
```

**Signup Page** (similar to login)

### Update API Calls to Include JWT

**Create auth context** (`frontend/src/contexts/AuthContext.tsx`):

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('jwt_token')
  );

  const login = (newToken: string) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Update API calls**:

```typescript
// frontend/src/api/api.ts

export async function fetchJobs(): Promise<Job[]> {
  const token = localStorage.getItem('jwt_token');

  const response = await fetch(`${API_BASE_URL}/jobs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response.json();
}
```

### Protected Routes

```typescript
// frontend/src/components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Usage in App.tsx:
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

---

## Security Considerations

### 1. Password Security
- ✅ Use argon2 for password hashing (NOT bcrypt, md5, sha256)
- ✅ Salt passwords automatically (argon2 handles this)
- ✅ Never log passwords
- ✅ Enforce minimum password strength (8+ chars, mixed case, numbers)

### 2. JWT Security
- ✅ Short expiration (7 days max)
- ✅ HTTPS only (Shuttle provides automatically)
- ✅ HttpOnly cookies (alternative to localStorage) for added security
- ✅ Refresh token rotation

### 3. SQL Injection Protection
- ✅ Use sqlx parameterized queries (already doing this)
- ✅ Never concatenate SQL strings

### 4. Rate Limiting
```rust
// Prevent brute force attacks
use actix_governor::{Governor, GovernorConfigBuilder};

let governor_conf = GovernorConfigBuilder::default()
    .per_second(1)
    .burst_size(5)
    .finish()
    .unwrap();

App::new()
    .wrap(Governor::new(&governor_conf))
    // ... routes
```

### 5. HTTPS Everywhere
- ✅ Shuttle provides HTTPS automatically
- ✅ Vercel provides HTTPS automatically
- ✅ Force HTTPS redirects

### 6. GDPR Compliance (if serving EU users)
- ✅ User can export their data
- ✅ User can delete their account (and all data)
- ✅ Privacy policy explaining data usage
- ✅ Cookie consent banner

---

## Cost Analysis & Profit Model

### Monthly Costs Per User Tier

**Free Tier Users**:
```
Compute (Shuttle): $0.00 (free tier covers ~100 users)
Database storage: ~$0.01/user/month
Email: $0.00 (SendGrid free tier)
TOTAL: ~$0.01/user/month
```

**Starter Tier Users** ($9/month):
```
Compute: ~$0.10/user/month
Database: ~$0.05/user/month
Email: ~$0.01/user/month
Payment processing (Stripe): $0.30 + 2.9% = $0.56
TOTAL COST: ~$0.72/user/month
PROFIT: $9.00 - $0.72 = $8.28/user/month
```

**Pro Tier Users** ($29/month):
```
Compute: ~$0.50/user/month
Database: ~$0.20/user/month
Email: ~$0.05/user/month
Payment processing: $0.30 + 2.9% = $1.14
TOTAL COST: ~$1.89/user/month
PROFIT: $29.00 - $1.89 = $27.11/user/month
```

### When to Upgrade Shuttle

**Shuttle Community (Free)**:
- Good for: 0-50 active users
- Cost: $0/month

**Shuttle Pro ($20/month)**:
- Good for: 50-500 active users
- Cost: $20/month
- When to upgrade: When you have ~10 paying customers ($90-290 MRR)

**When you need your own infrastructure**:
- 500+ active users
- High traffic (>10 req/sec sustained)
- Custom requirements
- Consider: Railway ($50-200/mo), Fly.io ($100-500/mo), or AWS

### Revenue Projections

**Scenario 1: Modest Success**
```
Month 6:
- 100 free users
- 10 Starter ($9) = $90/month
- 2 Pro ($29) = $58/month
- Total MRR: $148/month
- Costs: ~$20/month (Shuttle Pro)
- Net profit: $128/month
```

**Scenario 2: Good Traction**
```
Month 12:
- 500 free users
- 50 Starter = $450/month
- 10 Pro = $290/month
- 2 Enterprise = $200/month
- Total MRR: $940/month
- Costs: ~$100/month (better Shuttle tier or Railway)
- Net profit: $840/month
```

**Scenario 3: Breakout Success**
```
Year 2:
- 5,000 free users
- 500 Starter = $4,500/month
- 100 Pro = $2,900/month
- 10 Enterprise = $1,000/month
- Total MRR: $8,400/month ($100,800/year)
- Costs: ~$1,000/month (Dedicated infra, support, etc.)
- Net profit: $7,400/month ($88,800/year)
```

### Break-Even Analysis

**Fixed costs** (monthly):
- Shuttle Pro: $20
- Email service: $0 (free tier sufficient)
- Domain: $1/month ($12/year)
- Total: $21/month

**Break-even**: 3 Starter customers or 1 Pro customer

**You break even very quickly!**

### Recouping Development Costs

**Your time investment**:
- Phase 1-6: ~150 hours
- Hourly rate: $50-150/hour (software dev rates)
- Value of time: $7,500 - $22,500

**Payback period**:
- At $128/month profit (Scenario 1): 5-15 months
- At $840/month profit (Scenario 2): 1-2 months
- At $7,400/month profit (Scenario 3): < 1 month

**Plus**: Your time = equity in a business asset you own!

---

## Alternative: White-Label Licensing

Instead of running a SaaS, **license JobHunter to other companies**:

**Model**: One-time fee or annual license
- **Career coaching firms**: $2,000-5,000/year per company
- **Recruiting agencies**: $5,000-10,000/year
- **Universities**: $1,000-3,000/year per school

**Pros**:
- No ongoing hosting costs (they host it)
- Higher per-customer revenue
- Less support burden

**Cons**:
- Harder to find customers
- They might modify/compete with you
- No recurring revenue visibility

---

## Recommendation

### Path 1: SaaS (Recommended if you want passive income)
1. Start with single-user deployment (already planned)
2. Use it yourself for 1-2 months
3. Get 1-2 beta users (friends, colleagues)
4. Implement Phases 1-6 (multi-user + billing)
5. Launch publicly
6. Market via Reddit, Hacker News, Product Hunt
7. Grow to 10-50 paying customers
8. Decide: Keep as side income or go full-time

**Timeline**: 6-8 months to launch, 12-24 months to $1,000+ MRR

### Path 2: Portfolio Project Only (Fastest)
1. Deploy single-user version to Shuttle (this week)
2. Use it for your job search
3. Get job with live demo on resume
4. Possibly open-source it later
5. Build SaaS features if you want after getting a job

**Timeline**: 1 week to portfolio-ready

---

## Questions Answered

### 1. Frontend hosting on Vercel
**Answer**: You CAN host frontend on Shuttle too, but Vercel is better for static sites (CDN, performance, free tier). Your choice!

### 2. Private data
**Answer**: Implement user authentication (JWT), add user_id to all tables, filter all queries by user_id. Your data stays private.

### 3. Multi-user with Shuttle
**Answer**: Shuttle does NOT provide user auth. You build it yourself (JWT + PostgreSQL users table). Shuttle just hosts your backend.

### 4. Billing users
**Answer**: Integrate Stripe, define pricing tiers, track usage, enforce limits. Profit = (subscription price - costs - payment fees).

### 5. Recouping costs
**Answer**: Break-even at 3 customers ($27/month costs). Full dev cost recoup in 5-15 months at modest growth. White-label licensing is alternative.

---

## Next Steps

**If pursuing SaaS**:
1. Deploy single-user version first (server-deploy-plan.md)
2. Use it yourself for 2-4 weeks
3. Validate people want this (beta users)
4. Implement Phase 1 (Authentication) - 20-30 hours
5. Get 1-2 paying beta customers
6. Continue with Phases 2-6
7. Launch publicly

**If portfolio project only**:
1. Deploy single-user version (1 week)
2. Use for job search
3. Get job
4. Decide later if you want to monetize

---

Ready to build a SaaS empire? 🚀

---

*Document created: October 1, 2025*
*Based on: Modern SaaS architecture patterns, Stripe integration best practices, Rust authentication libraries*
