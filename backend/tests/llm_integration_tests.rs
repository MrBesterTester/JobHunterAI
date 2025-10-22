//! Integration tests for LLM module with real Anthropic API
//!
//! These tests make actual API calls to Anthropic's Claude API.
//! They require ANTHROPIC_API_KEY to be set in .env file.
//!
//! Run with: cargo test --test llm_integration_tests -- --nocapture

use serial_test::serial;

// We need to import the LLM module from the main binary
// Since it's a module in main.rs, we'll need to restructure or use a workaround
// For now, we'll create a simple test client to verify API connectivity

/// Test helper to get API key from environment
fn get_api_key() -> String {
    // Load .env file
    dotenv::from_filename("/Users/sam/Projects/JobHunterAI-Claude/backend/.env")
        .ok();

    std::env::var("ANTHROPIC_API_KEY")
        .expect("ANTHROPIC_API_KEY must be set in .env file")
}

/// Helper struct for API testing
#[derive(serde::Deserialize, Debug)]
struct ApiResponse {
    id: String,
    #[serde(rename = "type")]
    response_type: String,
    role: String,
    content: Vec<ContentBlock>,
    model: String,
    usage: Usage,
}

#[derive(serde::Deserialize, Debug)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: String,
}

#[derive(serde::Deserialize, Debug)]
struct Usage {
    input_tokens: i32,
    output_tokens: i32,
}

#[derive(serde::Serialize)]
struct ApiRequest {
    model: String,
    max_tokens: usize,
    messages: Vec<Message>,
}

#[derive(serde::Serialize)]
struct Message {
    role: String,
    content: String,
}

/// Test that we can successfully connect to Anthropic API
#[tokio::test]
#[serial]
async fn test_anthropic_api_connectivity() {
    println!("\n=== Testing Anthropic API Connectivity ===");

    let api_key = get_api_key();
    assert!(!api_key.is_empty(), "API key should not be empty");
    println!("✓ API key loaded from .env");

    let client = reqwest::Client::new();
    let request = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 50,
        messages: vec![Message {
            role: "user".to_string(),
            content: "Say 'Hello' in one word.".to_string(),
        }],
    };

    println!("→ Sending test request to Anthropic API...");
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .expect("Failed to send request");

    let status = response.status();
    println!("← Response status: {}", status);
    assert!(status.is_success(), "API request should succeed");

    let api_response: ApiResponse = response
        .json()
        .await
        .expect("Failed to parse response");

    println!("✓ Response received:");
    println!("  - ID: {}", api_response.id);
    println!("  - Model: {}", api_response.model);
    println!("  - Input tokens: {}", api_response.usage.input_tokens);
    println!("  - Output tokens: {}", api_response.usage.output_tokens);

    assert!(!api_response.content.is_empty(), "Response should have content");
    let text = &api_response.content[0].text;
    println!("  - Content: {}", text);

    assert!(api_response.usage.input_tokens > 0, "Should have input tokens");
    assert!(api_response.usage.output_tokens > 0, "Should have output tokens");
    println!("✓ All assertions passed");
}

/// Test generating a simple response
#[tokio::test]
#[serial]
async fn test_simple_generation() {
    println!("\n=== Testing Simple Content Generation ===");

    let api_key = get_api_key();
    let client = reqwest::Client::new();

    let request = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 100,
        messages: vec![Message {
            role: "user".to_string(),
            content: "Write a single sentence about why testing is important in software development.".to_string(),
        }],
    };

    println!("→ Requesting Claude to write about testing importance...");
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .expect("Failed to send request");

    assert!(response.status().is_success());

    let api_response: ApiResponse = response
        .json()
        .await
        .expect("Failed to parse response");

    let content = &api_response.content[0].text;
    println!("← Generated content:");
    println!("  {}", content);
    println!("\n  Token usage: {} in, {} out",
        api_response.usage.input_tokens,
        api_response.usage.output_tokens
    );

    // Calculate cost
    let input_cost = (api_response.usage.input_tokens as f64 / 1_000_000.0) * 0.25;
    let output_cost = (api_response.usage.output_tokens as f64 / 1_000_000.0) * 1.25;
    let total_cost = input_cost + output_cost;
    println!("  Cost: ${:.6}", total_cost);

    assert!(!content.is_empty(), "Content should not be empty");
    assert!(content.to_lowercase().contains("test"),
        "Content should mention testing");
    assert!(total_cost < 0.001, "Cost should be less than $0.001 for simple query");

    println!("✓ All assertions passed");
}

/// Test generating resume-like content
#[tokio::test]
#[serial]
async fn test_resume_generation() {
    println!("\n=== Testing Resume Content Generation ===");

    let api_key = get_api_key();
    let client = reqwest::Client::new();

    let prompt = r#"You are a professional resume writer. Given this brief experience:

"Senior Test Engineer at TechCorp (2020-2023)
- Developed automated testing frameworks using Python and Selenium
- Reduced test execution time by 60%
- Led a team of 3 QA engineers"

Write a professional resume bullet point that emphasizes test automation expertise."#;

    let request = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 200,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
    };

    println!("→ Requesting Claude to write resume content...");
    let start = std::time::Instant::now();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .expect("Failed to send request");

    let duration = start.elapsed();

    assert!(response.status().is_success());

    let api_response: ApiResponse = response
        .json()
        .await
        .expect("Failed to parse response");

    let content = &api_response.content[0].text;
    println!("← Generated resume content:");
    println!("  {}", content);
    println!("\n  Performance:");
    println!("    - Response time: {:.2}s", duration.as_secs_f64());
    println!("    - Input tokens: {}", api_response.usage.input_tokens);
    println!("    - Output tokens: {}", api_response.usage.output_tokens);

    // Calculate cost
    let input_cost = (api_response.usage.input_tokens as f64 / 1_000_000.0) * 0.25;
    let output_cost = (api_response.usage.output_tokens as f64 / 1_000_000.0) * 1.25;
    let total_cost = input_cost + output_cost;
    println!("    - Cost: ${:.6}", total_cost);

    assert!(!content.is_empty(), "Content should not be empty");
    assert!(duration.as_secs() < 15, "Should respond in under 15 seconds");
    assert!(total_cost < 0.005, "Cost should be under $0.005");

    // Content quality checks
    let content_lower = content.to_lowercase();
    assert!(
        content_lower.contains("test") || content_lower.contains("qa") || content_lower.contains("quality"),
        "Content should mention testing/QA"
    );

    println!("✓ All assertions passed");
}

/// Test cost estimation for typical resume + cover letter generation
#[tokio::test]
#[serial]
async fn test_cost_estimation_realistic_scenario() {
    println!("\n=== Testing Cost Estimation for Resume + Cover Letter ===");

    let api_key = get_api_key();
    let client = reqwest::Client::new();

    // Simulate a resume customization prompt (larger)
    let resume_prompt = r#"You are a professional resume writer. Customize this resume for a Software QA Engineer position:

# John Doe
Senior Test Automation Engineer

## Experience
- 5 years in test automation
- Python, Selenium, pytest expertise
- CI/CD pipeline integration
- Team leadership experience

## Skills
- Test Automation
- Python, Java, JavaScript
- Selenium, Cypress, Playwright
- Jenkins, GitHub Actions
- API Testing (REST, GraphQL)

Highlight the most relevant aspects for this job:
"Senior QA Engineer at StartupCo - Building test automation frameworks for microservices architecture"

Return the customized resume emphasizing relevant experience."#;

    println!("→ Testing resume generation (larger prompt)...");
    let request1 = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 800,
        messages: vec![Message {
            role: "user".to_string(),
            content: resume_prompt.to_string(),
        }],
    };

    let response1 = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request1)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .expect("Failed to send resume request");

    assert!(response1.status().is_success());
    let resume_response: ApiResponse = response1.json().await.expect("Failed to parse resume response");

    println!("← Resume generation:");
    println!("  - Input tokens: {}", resume_response.usage.input_tokens);
    println!("  - Output tokens: {}", resume_response.usage.output_tokens);

    let resume_cost = (resume_response.usage.input_tokens as f64 / 1_000_000.0) * 0.25
        + (resume_response.usage.output_tokens as f64 / 1_000_000.0) * 1.25;
    println!("  - Cost: ${:.6}", resume_cost);

    // Simulate a cover letter generation
    let cover_letter_prompt = r#"Write a professional cover letter for this job application:

Job: Senior QA Engineer at StartupCo
Company: Fast-growing startup in fintech space

Candidate background:
- 5 years test automation experience
- Led teams of 3-5 engineers
- Strong Python and test framework expertise

Write a 3-paragraph cover letter expressing interest and highlighting relevant experience."#;

    println!("\n→ Testing cover letter generation...");
    let request2 = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 500,
        messages: vec![Message {
            role: "user".to_string(),
            content: cover_letter_prompt.to_string(),
        }],
    };

    let response2 = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request2)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .expect("Failed to send cover letter request");

    assert!(response2.status().is_success());
    let cover_letter_response: ApiResponse = response2.json().await.expect("Failed to parse cover letter response");

    println!("← Cover letter generation:");
    println!("  - Input tokens: {}", cover_letter_response.usage.input_tokens);
    println!("  - Output tokens: {}", cover_letter_response.usage.output_tokens);

    let cover_letter_cost = (cover_letter_response.usage.input_tokens as f64 / 1_000_000.0) * 0.25
        + (cover_letter_response.usage.output_tokens as f64 / 1_000_000.0) * 1.25;
    println!("  - Cost: ${:.6}", cover_letter_cost);

    let total_tokens = resume_response.usage.input_tokens
        + resume_response.usage.output_tokens
        + cover_letter_response.usage.input_tokens
        + cover_letter_response.usage.output_tokens;
    let total_cost = resume_cost + cover_letter_cost;

    println!("\n=== Total Cost Summary ===");
    println!("  - Total tokens: {}", total_tokens);
    println!("  - Total cost: ${:.6}", total_cost);
    println!("  - Target: < $0.005 per generation");

    assert!(total_cost < 0.01, "Total cost should be under $0.01 (currently ${:.6})", total_cost);
    assert!(total_tokens < 6000, "Total tokens should be under 6000 for efficiency");

    println!("✓ All assertions passed");
}

/// Test error handling with invalid API key
#[tokio::test]
#[serial]
async fn test_invalid_api_key_handling() {
    println!("\n=== Testing Invalid API Key Error Handling ===");

    let client = reqwest::Client::new();
    let request = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 50,
        messages: vec![Message {
            role: "user".to_string(),
            content: "Hello".to_string(),
        }],
    };

    println!("→ Sending request with invalid API key...");
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", "invalid-key-12345")
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .expect("Request should complete (even if unauthorized)");

    let status = response.status();
    println!("← Response status: {}", status);

    assert_eq!(status, 401, "Should return 401 Unauthorized");
    println!("✓ Error handling works correctly");
}

/// Test that response times are within acceptable limits
#[tokio::test]
#[serial]
async fn test_response_time_performance() {
    println!("\n=== Testing Response Time Performance ===");

    let api_key = get_api_key();
    let client = reqwest::Client::new();

    let request = ApiRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 500,
        messages: vec![Message {
            role: "user".to_string(),
            content: "Write a brief professional summary (2-3 sentences) for a software test engineer with 5 years of experience in test automation.".to_string(),
        }],
    };

    println!("→ Measuring response time...");
    let start = std::time::Instant::now();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .expect("Failed to send request");

    let duration = start.elapsed();

    assert!(response.status().is_success());

    let api_response: ApiResponse = response
        .json()
        .await
        .expect("Failed to parse response");

    println!("← Performance metrics:");
    println!("  - Response time: {:.2}s", duration.as_secs_f64());
    println!("  - Tokens generated: {}", api_response.usage.output_tokens);
    println!("  - Tokens per second: {:.1}", api_response.usage.output_tokens as f64 / duration.as_secs_f64());

    assert!(duration.as_secs() < 10,
        "Response should be under 10 seconds for typical query (was {:.2}s)",
        duration.as_secs_f64()
    );

    println!("✓ Performance within acceptable limits");
}
