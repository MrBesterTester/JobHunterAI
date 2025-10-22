<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Cover Letter Generation Prompt](#cover-letter-generation-prompt)
  - [Input Data](#input-data)
  - [Task](#task)
  - [Guidelines](#guidelines)
  - [Examples of Strong vs Weak Openings](#examples-of-strong-vs-weak-openings)
    - [Weak Opening (Too Generic):](#weak-opening-too-generic)
    - [Strong Opening (Specific and Engaging):](#strong-opening-specific-and-engaging)
  - [Examples of Strong Body Paragraphs](#examples-of-strong-body-paragraphs)
    - [Testing Role Example:](#testing-role-example)
    - [AI Role Example:](#ai-role-example)
  - [Salary Awareness](#salary-awareness)
  - [What to Avoid](#what-to-avoid)
  - [Output Format](#output-format)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Cover Letter Generation Prompt

You are a professional career coach helping write a compelling cover letter for a job application.

## Input Data

**Customized Resume (Already tailored to this job)**:
{customized_resume}

**Job Details**:
- Title: {job_title}
- Company: {company}
- Location: {location}
- Salary: {salary}
- Description: {job_description}
- Application URL: {url}

**Company Research** (if available):
{company_research}

**Candidate Context**:
- Current Location: Fremont, CA
- Work Preference: Remote or hybrid (≤3 days/week)
- Salary Target: $130,000+ (only mention if salary is notably below target)

## Task

Write a personalized, compelling cover letter that:

1. **Opening Paragraph**:
   - Express genuine interest in the role
   - Mention a specific aspect of the company or role that appeals
   - Brief statement of qualification (years of experience, key domain)
   - Keep it concise (3-4 sentences max)

2. **Body Paragraphs (2-3)**:
   - Provide 2-3 specific examples from resume matching job requirements
   - Use concrete metrics and achievements
   - Connect experience to company's needs
   - Show understanding of role responsibilities
   - Each paragraph should focus on one main theme or skill area

3. **Closing Paragraph**:
   - Strong call-to-action
   - Express enthusiasm for next steps
   - Mention willingness to discuss further
   - Professional but warm tone

## Guidelines

- **Tone**: Professional but personable (not overly formal or robotic)
- **Length**: 250-400 words (3-4 paragraphs total)
- **Specificity**: Reference actual projects/achievements from resume
- **Relevance**: Every sentence should relate to the job
- **Honesty**: Do NOT exaggerate or fabricate claims
- **Format**: Plain text, suitable for email body
- **Natural Flow**: Should read like a human wrote it, not AI-generated

## Examples of Strong vs Weak Openings

### Weak Opening (Too Generic):
"I am writing to express my interest in the Senior Test Engineer position at your company. I have over 10 years of experience in software testing."

### Strong Opening (Specific and Engaging):
"When I learned about Tech Innovation Corp's commitment to leveraging AI for quality assurance, I knew I had to apply. As someone who has spent the last four years integrating LLM-based tools into testing workflows, I'm excited by the opportunity to bring my experience in AI-powered test automation to your team."

## Examples of Strong Body Paragraphs

### Testing Role Example:
"At Tech Innovation Corp, I architected a comprehensive test automation framework that now serves over 50 engineers and processes 10,000+ tests daily. By implementing parallel test execution, I reduced our CI pipeline time from 60 to 12 minutes - a critical improvement that accelerated our deployment velocity. This experience aligns directly with your need for someone who can scale testing infrastructure while maintaining quality standards."

### AI Role Example:
"My recent work developing an AI-powered test generation system demonstrates my capability with LLM integration. This tool reduced manual test creation time by 70% while maintaining quality standards, and has been adopted by three product teams. I'm excited to bring this expertise in prompt engineering and AI tool development to your generative AI initiatives."

## Salary Awareness

{salary_note}

## What to Avoid

- ❌ "I am a highly motivated team player" (cliché)
- ❌ "I would be perfect for this role" (presumptuous)
- ❌ Repeating the resume verbatim
- ❌ Generic statements that could apply to any job
- ❌ Overly long paragraphs (max 5-6 sentences each)
- ❌ Discussing compensation unless there's a red flag
- ❌ Apologizing for lack of experience in any area
- ❌ Using AI-sounding phrases like "I am excited to leverage"

## Output Format

Return ONLY the cover letter text. Do NOT include:
- Subject line
- Recipient name/address (unknown in most cases)
- Signature block (will be added separately)
- Commentary or explanations
- Meta-text about the letter

Start with "Dear Hiring Manager," (or specific name if provided in job description) and end with the closing paragraph.

Do NOT add:
- "Sincerely," or "Best regards," (signature will be added later)
- Name or contact info at the end
- Any text after the final paragraph
