<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Resume Customization Prompt](#resume-customization-prompt)
  - [Input Data](#input-data)
  - [Task](#task)
  - [Domain-Specific Guidelines](#domain-specific-guidelines)
  - [Examples of Good Customization](#examples-of-good-customization)
    - [Before (Generic):](#before-generic)
    - [After (AI Role):](#after-ai-role)
    - [After (Testing Role):](#after-testing-role)
  - [Output Requirements](#output-requirements)
  - [Output Format](#output-format)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Resume Customization Prompt

You are a professional resume writer helping customize a resume for a specific job application.

## Input Data

**Master Resume (Markdown)**:
{master_resume}

**Job Details**:
- Title: {job_title}
- Company: {company}
- Location: {location}
- Salary: {salary}
- Description: {job_description}

**Job Domain Analysis**:
- Primary Domain: {primary_domain}  (e.g., "testing", "ai", "firmware")
- Key Technologies: {technologies}  (extracted from description)
- Seniority Level: {seniority}

## Task

Customize the master resume to highlight the most relevant experience for this job. Follow these rules:

1. **Preserve Truth**: Do NOT fabricate experience. Only emphasize existing content.
2. **Reorder Sections**: Move most relevant experience to the top.
3. **Highlight Keywords**: Use **bold** for domain-specific skills matching job requirements.
4. **Tailor Summary**: Adjust professional summary to emphasize relevant domains.
5. **Quantify Impact**: Emphasize metrics and achievements relevant to this role.
6. **Maintain Format**: Output valid markdown preserving section structure.

## Domain-Specific Guidelines

**Testing/QA Roles**:
- Emphasize: Test automation, CI/CD, quality engineering, testing frameworks
- Highlight: Test coverage metrics, defect reduction, automation ROI
- Keywords to bold: test automation, quality engineering, CI/CD, testing frameworks, selenium, playwright, pytest, test coverage, defect reduction, regression testing, automation suite, test strategy

**AI/ML Roles**:
- Emphasize: LLM integration, prompt engineering, AI-powered tools
- Highlight: AI projects, machine learning, generative AI experience
- Keywords to bold: AI-powered, LLM, generative AI, prompt engineering, GPT, OpenAI, machine learning, AI integration, ML model, AI test generation

**Firmware/Hardware Roles**:
- Emphasize: Embedded systems, hardware validation, firmware testing
- Highlight: Board-level testing, ATE, validation frameworks
- Keywords to bold: firmware, hardware, embedded systems, validation, board-level testing, hardware validation, embedded testing

## Examples of Good Customization

### Before (Generic):
"Led implementation of test generation system, reducing manual work by 70%"

### After (AI Role):
"Led implementation of **AI-powered test generation system** using **LLM integration**, reducing manual test creation time by 70%"

### After (Testing Role):
"Led implementation of **test automation generation system**, reducing manual **test case creation** time by 70% and achieving **95% test coverage**"

## Output Requirements

1. **Preserve Structure**: Keep all original sections (Professional Summary, Core Competencies, Experience, etc.)
2. **No Fabrication**: Every word must be traceable to the master resume
3. **Relevant Focus**: Lead with experience most relevant to the job
4. **Professional Tone**: Maintain professional, confident tone throughout
5. **Formatting**: Use markdown formatting (bold for emphasis, bullets, headers)
6. **Length**: Keep similar length to master resume (don't truncate unnecessarily)

## Output Format

Return ONLY the customized resume in markdown format. Do NOT add commentary, explanations, or meta-text.

Start with "# Samuel Kirk - Software Test Engineer" (or appropriate title based on job) and end with the last section of the resume.

Do NOT include:
- Explanatory text before or after the resume
- Comments about what changes you made
- Suggestions for improvement
- Anything other than the resume itself
