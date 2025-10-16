<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Server Deployment Plan & Analysis for JobHunter](#server-deployment-plan--analysis-for-jobhunter)
  - [Executive Summary](#executive-summary)
  - [Table of Contents](#table-of-contents)
    - [Part I: Analysis & Research](#part-i-analysis--research)
    - [Part II: Implementation Plan](#part-ii-implementation-plan)
    - [Part III: Additional Resources](#part-iii-additional-resources)
- [PART I: ANALYSIS & RESEARCH](#part-i-analysis--research)
  - [Pros & Cons of Server Deployment](#pros--cons-of-server-deployment)
    - [✅ PROS: Why Deploy to a Server](#-pros-why-deploy-to-a-server)
      - [1. **Portfolio & Job Search Value** 🌟 MOST IMPORTANT](#1-portfolio--job-search-value--most-important)
      - [2. **Multi-Device Access**](#2-multi-device-access)
      - [3. **Data Persistence & Backup**](#3-data-persistence--backup)
      - [4. **Continuous Operation**](#4-continuous-operation)
      - [5. **Learning & Experience**](#5-learning--experience)
    - [❌ CONS: Challenges of Server Deployment](#-cons-challenges-of-server-deployment)
      - [1. **Cost** 💰](#1-cost-)
      - [2. **Complexity** (Mild to Moderate)](#2-complexity-mild-to-moderate)
      - [3. **Maintenance**](#3-maintenance)
      - [4. **Privacy Concerns** (Minor for JobHunter)](#4-privacy-concerns-minor-for-jobhunter)
      - [5. **Dependency on Internet**](#5-dependency-on-internet)
  - [Platform Comparison Matrix](#platform-comparison-matrix)
    - [Shuttle.rs (RECOMMENDED for JobHunter)](#shuttlers-recommended-for-jobhunter)
    - [Railway](#railway)
    - [Render](#render)
    - [Fly.io](#flyio)
    - [DigitalOcean App Platform](#digitalocean-app-platform)
    - [Replit ❌ (NOT RECOMMENDED for JobHunter)](#replit--not-recommended-for-jobhunter)
  - [Cost Comparison (12 months)](#cost-comparison-12-months)
  - [Addressing Your AWS Concerns](#addressing-your-aws-concerns)
    - [Why AWS is Overwhelming](#why-aws-is-overwhelming)
    - [How Shuttle/Railway/Render are Different](#how-shuttlerailwayrender-are-different)
  - [Portfolio Impact Analysis](#portfolio-impact-analysis)
    - [Resume Addition](#resume-addition)
  - [Decision Matrix](#decision-matrix)
    - [Choose Server Deployment If:](#choose-server-deployment-if)
    - [Choose Desktop App (Tauri) If:](#choose-desktop-app-tauri-if)
    - [Choose Both If:](#choose-both-if)
- [PART II: DETAILED IMPLEMENTATION PLAN](#part-ii-detailed-implementation-plan)
  - [Implementation Overview](#implementation-overview)
    - [What We'll Build](#what-well-build)
  - [Phase 0: Prerequisites & Setup](#phase-0-prerequisites--setup)
    - [Step 0.1: Verify Local Environment](#step-01-verify-local-environment)
    - [Step 0.2: Commit Current Work](#step-02-commit-current-work)
    - [Step 0.3: Create Backup Branch](#step-03-create-backup-branch)
  - [Phase 1: Shuttle CLI Installation](#phase-1-shuttle-cli-installation)
    - [Step 1.1: Install Shuttle CLI](#step-11-install-shuttle-cli)
    - [Step 1.2: Verify Installation](#step-12-verify-installation)
    - [Step 1.3: Create Shuttle Account](#step-13-create-shuttle-account)
    - [Step 1.4: Verify Authentication](#step-14-verify-authentication)
  - [Phase 2: Backend Code Migration](#phase-2-backend-code-migration)
    - [Step 2.1: Update Cargo.toml Dependencies](#step-21-update-cargotoml-dependencies)
    - [Step 2.2: Create Shuttle Configuration File](#step-22-create-shuttle-configuration-file)
    - [Step 2.3: Backup Current main.rs](#step-23-backup-current-mainrs)
    - [Step 2.4: Modify main.rs for Shuttle](#step-24-modify-mainrs-for-shuttle)
    - [Step 2.5: Keep Dual-Mode Support (Optional but Recommended)](#step-25-keep-dual-mode-support-optional-but-recommended)
    - [Step 2.6: Update CORS for Production](#step-26-update-cors-for-production)
  - [Phase 3: Database Schema Setup](#phase-3-database-schema-setup)
    - [Step 3.1: Create Migrations Directory](#step-31-create-migrations-directory)
    - [Step 3.2: Convert Schema to Migration](#step-32-convert-schema-to-migration)
    - [Step 3.3: Verify SQLx Offline Mode (Optional)](#step-33-verify-sqlx-offline-mode-optional)
  - [Phase 4: Local Testing with Shuttle](#phase-4-local-testing-with-shuttle)
    - [Step 4.1: Build with Shuttle Feature](#step-41-build-with-shuttle-feature)
    - [Step 4.2: Test Local Build Without Shuttle](#step-42-test-local-build-without-shuttle)
    - [Step 4.3: Run with Shuttle Locally (Optional)](#step-43-run-with-shuttle-locally-optional)
  - [Phase 5: Deploy Backend to Shuttle](#phase-5-deploy-backend-to-shuttle)
    - [Step 5.1: Initialize Shuttle Project](#step-51-initialize-shuttle-project)
    - [Step 5.2: Deploy to Shuttle](#step-52-deploy-to-shuttle)
    - [Step 5.3: Check Deployment Status](#step-53-check-deployment-status)
    - [Step 5.4: View Logs](#step-54-view-logs)
    - [Step 5.5: Test Deployed API](#step-55-test-deployed-api)
    - [Step 5.6: Access Shuttle Dashboard](#step-56-access-shuttle-dashboard)
  - [Phase 6: Frontend Deployment to Vercel](#phase-6-frontend-deployment-to-vercel)
    - [Step 6.1: Update Frontend API Configuration](#step-61-update-frontend-api-configuration)
    - [Step 6.2: Test Frontend Locally with Production Backend](#step-62-test-frontend-locally-with-production-backend)
    - [Step 6.3: Install Vercel CLI](#step-63-install-vercel-cli)
    - [Step 6.4: Deploy Frontend to Vercel](#step-64-deploy-frontend-to-vercel)
    - [Step 6.5: Configure Environment Variables in Vercel](#step-65-configure-environment-variables-in-vercel)
    - [Step 6.6: Redeploy with Environment Variables](#step-66-redeploy-with-environment-variables)
    - [Step 6.7: Test Production Frontend](#step-67-test-production-frontend)
    - [Step 6.8: Setup Vercel GitHub Integration (Recommended)](#step-68-setup-vercel-github-integration-recommended)
  - [Phase 7: Production Testing](#phase-7-production-testing)
    - [Step 7.1: Functional Testing Checklist](#step-71-functional-testing-checklist)
    - [Step 7.2: API Testing with curl](#step-72-api-testing-with-curl)
    - [Step 7.3: Performance Testing](#step-73-performance-testing)
    - [Step 7.4: Browser DevTools Inspection](#step-74-browser-devtools-inspection)
    - [Step 7.5: Mobile Testing](#step-75-mobile-testing)
    - [Step 7.6: Cross-Browser Testing](#step-76-cross-browser-testing)
    - [Step 7.7: Seed Production Database (Optional)](#step-77-seed-production-database-optional)
  - [Phase 8: CI/CD Integration (Optional but Recommended)](#phase-8-cicd-integration-optional-but-recommended)
    - [Step 8.1: Use Existing GitHub Actions Workflows](#step-81-use-existing-github-actions-workflows)
    - [Step 8.2: Add Shuttle Deployment to GitHub Actions](#step-82-add-shuttle-deployment-to-github-actions)
    - [Step 8.3: Add Shuttle API Key to GitHub Secrets](#step-83-add-shuttle-api-key-to-github-secrets)
    - [Step 8.4: Vercel GitHub Integration](#step-84-vercel-github-integration)
    - [Step 8.5: Test CI/CD Pipeline](#step-85-test-cicd-pipeline)
  - [Phase 9: Custom Domain Setup (Optional)](#phase-9-custom-domain-setup-optional)
    - [Step 9.1: Add Custom Domain to Shuttle](#step-91-add-custom-domain-to-shuttle)
    - [Step 9.2: Configure DNS Records](#step-92-configure-dns-records)
    - [Step 9.3: Add Custom Domain to Vercel](#step-93-add-custom-domain-to-vercel)
    - [Step 9.4: Wait for DNS Propagation](#step-94-wait-for-dns-propagation)
    - [Step 9.5: Update Frontend API Config](#step-95-update-frontend-api-config)
  - [Phase 10: Monitoring & Maintenance](#phase-10-monitoring--maintenance)
    - [Step 10.1: Shuttle Monitoring](#step-101-shuttle-monitoring)
    - [Step 10.2: Vercel Monitoring](#step-102-vercel-monitoring)
    - [Step 10.3: Setup Uptime Monitoring (Optional)](#step-103-setup-uptime-monitoring-optional)
    - [Step 10.4: Database Backups](#step-104-database-backups)
    - [Step 10.5: Regular Maintenance Checklist](#step-105-regular-maintenance-checklist)
    - [Step 10.6: Cost Monitoring](#step-106-cost-monitoring)
    - [Step 10.7: Error Tracking (Optional)](#step-107-error-tracking-optional)
  - [Common Deployment Questions](#common-deployment-questions)
    - [Q: Is the free tier reliable enough for portfolio?](#q-is-the-free-tier-reliable-enough-for-portfolio)
    - [Q: What if I exceed free tier limits?](#q-what-if-i-exceed-free-tier-limits)
    - [Q: Can I switch platforms later?](#q-can-i-switch-platforms-later)
    - [Q: What about data privacy/security?](#q-what-about-data-privacysecurity)
    - [Q: Do recruiters actually test live demos?](#q-do-recruiters-actually-test-live-demos)
    - [Q: How do I update the deployed app?](#q-how-do-i-update-the-deployed-app)
    - [Q: Can I revert to local-only development?](#q-can-i-revert-to-local-only-development)
    - [Q: What if Shuttle shuts down or changes pricing?](#q-what-if-shuttle-shuts-down-or-changes-pricing)
  - [Troubleshooting Guide](#troubleshooting-guide)
    - [Backend Issues](#backend-issues)
    - [Frontend Issues](#frontend-issues)
    - [Database Issues](#database-issues)
    - [Performance Issues](#performance-issues)
  - [Success Metrics](#success-metrics)
    - [Technical Success](#technical-success)
    - [Portfolio Success](#portfolio-success)
    - [User Experience Success](#user-experience-success)
  - [Post-Deployment Checklist](#post-deployment-checklist)
    - [Immediate (Day 1)](#immediate-day-1)
    - [Short Term (Week 1)](#short-term-week-1)
    - [Medium Term (Month 1)](#medium-term-month-1)
    - [Long Term (Ongoing)](#long-term-ongoing)
  - [Resources & Next Steps](#resources--next-steps)
    - [Documentation](#documentation)
    - [Deployment Guides](#deployment-guides)
    - [Frontend Hosting (Free)](#frontend-hosting-free)
    - [Community & Support](#community--support)
  - [Final Recommendation](#final-recommendation)
    - [🎯 Execute This Plan Now](#-execute-this-plan-now)
  - [Frequently Asked Questions (Q&A)](#frequently-asked-questions-qa)
    - [Q1: Why do I need Vercel for the frontend? Can't Shuttle host everything?](#q1-why-do-i-need-vercel-for-the-frontend-cant-shuttle-host-everything)
    - [Q2: How do I keep my job hunting data private?](#q2-how-do-i-keep-my-job-hunting-data-private)
    - [Q3: How do multiple users with separate logins work? Does Shuttle handle this?](#q3-how-do-multiple-users-with-separate-logins-work-does-shuttle-handle-this)
    - [Q4: How would I bill clients to recoup costs and make profit?](#q4-how-would-i-bill-clients-to-recoup-costs-and-make-profit)
      - [Cost Structure](#cost-structure)
      - [Suggested Pricing Tiers](#suggested-pricing-tiers)
      - [Break-Even Analysis](#break-even-analysis)
      - [Revenue Projections](#revenue-projections)
      - [Recouping Development Costs](#recouping-development-costs)
      - [When to Upgrade Shuttle](#when-to-upgrade-shuttle)
      - [Stripe Integration](#stripe-integration)
      - [Alternative: White-Label Licensing](#alternative-white-label-licensing)
    - [Q5: Should I build the SaaS version or just deploy single-user?](#q5-should-i-build-the-saas-version-or-just-deploy-single-user)
  - [References & Related Documentation](#references--related-documentation)
    - [1. **[README_server-deploy-plan.md](README_server-deploy-plan.md)** (This Document)](#1-readme_server-deploy-planmdreadme_server-deploy-planmd-this-document)
    - [2. **[README_multi-user-saas-plan.md](README_multi-user-saas-plan.md)**](#2-readme_multi-user-saas-planmdreadme_multi-user-saas-planmd)
    - [3. **[README_ci-cd-github-plan.md](README_ci-cd-github-plan.md)**](#3-readme_ci-cd-github-planmdreadme_ci-cd-github-planmd)
    - [4. **[README_dmg-tauri-plan.md](README_dmg-tauri-plan.md)**](#4-readme_dmg-tauri-planmdreadme_dmg-tauri-planmd)
    - [Recommended Reading Order](#recommended-reading-order)
  - [Conclusion](#conclusion)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Server Deployment Plan & Analysis for JobHunter

**Date**: October 1, 2025
**Research**: Based on 2025 hosting platform comparisons and Rust deployment ecosystem
**Platform**: Shuttle.rs (Rust-native cloud platform)

---

## Executive Summary

After comprehensive research of 2025 hosting platforms, here are the key findings:

**Best Option for JobHunter**: **Shuttle.rs** (Rust-native platform)
- ✅ Purpose-built for Rust/Actix applications
- ✅ Free tier perfect for portfolio projects
- ✅ Automatic PostgreSQL provisioning
- ✅ One-line deployment (`cargo shuttle deploy`)
- ✅ No infrastructure files needed

**Replit Assessment**: ❌ **Not recommended** for production Rust apps
- Limited to development/prototyping
- Database sleeps after 5 minutes
- Resource limitations unsuitable for full-stack apps

---

## Table of Contents

### Part I: Analysis & Research
1. [Pros & Cons of Server Deployment](#pros--cons-of-server-deployment)
2. [Platform Comparison Matrix](#platform-comparison-matrix)
3. [Cost Comparison](#cost-comparison-12-months)
4. [Why AWS is Overwhelming](#addressing-your-aws-concerns)
5. [Portfolio Impact Analysis](#portfolio-impact-analysis)
6. [Decision Matrix](#decision-matrix)

### Part II: Implementation Plan
7. [Phase 0: Prerequisites & Setup](#phase-0-prerequisites--setup)
8. [Phase 1: Shuttle CLI Installation](#phase-1-shuttle-cli-installation)
9. [Phase 2: Backend Code Migration](#phase-2-backend-code-migration)
10. [Phase 3: Database Schema Setup](#phase-3-database-schema-setup)
11. [Phase 4: Local Testing with Shuttle](#phase-4-local-testing-with-shuttle)
12. [Phase 5: Deploy Backend to Shuttle](#phase-5-deploy-backend-to-shuttle)
13. [Phase 6: Frontend Deployment](#phase-6-frontend-deployment-to-vercel)
14. [Phase 7: Production Testing](#phase-7-production-testing)
15. [Phase 8: CI/CD Integration](#phase-8-cicd-integration-optional-but-recommended)
16. [Phase 9: Custom Domain Setup](#phase-9-custom-domain-setup-optional)
17. [Phase 10: Monitoring & Maintenance](#phase-10-monitoring--maintenance)

### Part III: Additional Resources
18. [Frequently Asked Questions](#frequently-asked-questions-qa)
19. [References & Related Documentation](#references--related-documentation)

---

# PART I: ANALYSIS & RESEARCH

## Pros & Cons of Server Deployment

### ✅ PROS: Why Deploy to a Server

#### 1. **Portfolio & Job Search Value** 🌟 MOST IMPORTANT
- **Live Demo URL**: Recruiters can click and test instantly
- **GitHub Integration**: Shows CI/CD, DevOps knowledge
- **Professional Presence**: Demonstrates production deployment skills
- **24/7 Availability**: Always accessible for resume links
- **Real-world Proof**: More impressive than "runs locally"

#### 2. **Multi-Device Access**
- Access from any computer/tablet/phone
- No installation required
- Share link with friends/colleagues
- Use from coffee shop, library, etc.

#### 3. **Data Persistence & Backup**
- Professional database hosting with automated backups
- No risk of losing data if local machine fails
- Version history and point-in-time recovery
- Scales as data grows

#### 4. **Continuous Operation**
- Automated job intake runs 24/7 (Phase 4 Gmail/LinkedIn sync)
- Background tasks process jobs while you sleep
- Notifications can reach you anywhere
- No need to keep laptop running

#### 5. **Learning & Experience**
- Gain DevOps/cloud deployment experience
- Learn CI/CD pipelines (valuable skill)
- Understand production environments
- Add to resume: "Deployed full-stack Rust app to production"

### ❌ CONS: Challenges of Server Deployment

#### 1. **Cost** 💰
- **Free tiers exist** but have limitations:
  - Shuttle: Free (512MB RAM, 0.25 vCPU, spot instances)
  - Render: Free (sleeps after inactivity)
  - Railway: $5/month in credits (was free, no longer)
- **Paid tiers**: $20-25/month for basic production workloads
- **Scaling costs**: Can increase quickly with traffic

#### 2. **Complexity** (Mild to Moderate)
- Need to set up deployment configuration
- Learn platform-specific commands
- Manage environment variables
- Handle database migrations remotely
- Debug issues in production environment
- **However**: Modern platforms (Shuttle, Railway, Render) make this MUCH simpler than AWS

#### 3. **Maintenance**
- Monitor uptime and performance
- Apply security updates
- Respond to outages or errors
- Manage database backups
- Update dependencies

#### 4. **Privacy Concerns** (Minor for JobHunter)
- Job data stored on cloud servers
- Need to secure sensitive information (salary expectations, cover letters)
- Consider who can access your server
- **Mitigation**: Use environment variables for secrets, implement authentication

#### 5. **Dependency on Internet**
- Can't use if internet is down
- Latency on slow connections
- Cloud provider outages affect availability

---

## Platform Comparison Matrix

### Shuttle.rs (RECOMMENDED for JobHunter)

**Perfect Match Because**:
- ✅ Rust-native platform built FOR Actix-web/Axum/Rocket
- ✅ You're already using Rust + Actix + PostgreSQL
- ✅ Zero infrastructure configuration
- ✅ Free tier sufficient for portfolio project
- ✅ Fastest deployment path (2 minutes setup to live)

**Pricing**:
```
Community (Free):
- $0/month forever
- 1 project (perfect for JobHunter)
- PostgreSQL database included (starter tier)
- 512 MB RAM, 0.25 vCPU
- 10 requests/second (plenty for portfolio)
- 1 custom domain (jobhunter.shuttle.app or your own)
- 100 build minutes/month
- Spot instance (may restart occasionally)

Pro ($20/month):
- 3 projects
- Reserved instance (no restarts)
- Scalable resources
- 50 requests/second
- 14-day free trial
```

**Time to Deploy**: ~30 minutes first time, ~2 minutes after

**Best For**:
- ✅ Portfolio projects showcasing Rust skills
- ✅ Demonstrating production Rust deployment
- ✅ JobHunter specifically (perfect fit)

**Limitations**:
- ⚠️ Free tier uses spot instances (may restart)
- ⚠️ Smaller resource limits (fine for portfolio use)
- ⚠️ Newer platform (less mature than AWS/GCP)

**Resources**:
- Official Docs: https://docs.shuttle.dev
- Actix Example: https://docs.shuttle.dev/examples/actix-postgres
- Pricing: https://www.shuttle.dev/pricing

---

### Railway

**Overview**: Developer-friendly platform with GitHub integration

**Pricing**:
```
Hobby Plan:
- $5/month in usage credits
- Auto-scaling
- GitHub integration
- PostgreSQL add-on
- Preview environments for PRs
- Pay only for what you use

Pro Plan: Starting ~$20/month + usage
```

**Pros**:
- ✅ Excellent developer experience
- ✅ Automatic Rust detection
- ✅ Built-in CI/CD from GitHub
- ✅ Preview environments (test PRs before merge)
- ✅ Dashboard-first interface

**Cons**:
- ❌ No free tier anymore (was free until Aug 2023)
- ⚠️ Costs can increase with usage
- ⚠️ Need Dockerfile or Railway handles with nixpacks

**Best For**: Production apps with budget, teams needing preview environments

**Deployment**: Connect GitHub → Auto-detects Rust → Deploy

---

### Render

**Overview**: Heroku alternative with free tier

**Pricing**:
```
Free Tier:
- $0/month
- Sleeps after 15 min inactivity
- 512 MB RAM
- PostgreSQL free tier (90 days, then expires)

Starter: $7/month (individual service)
- Always on
- 512 MB RAM

Standard: $25/month
- 2 GB RAM, 1 CPU
```

**Pros**:
- ✅ Has a free tier
- ✅ Native Rust support (no Docker required)
- ✅ Simple deployment
- ✅ Multi-service docker-compose-like setup

**Cons**:
- ❌ Free tier sleeps (first request takes ~30s to wake)
- ❌ Free PostgreSQL expires after 90 days
- ❌ Costs add up quickly ($7/month/service)

**Best For**: Apps that can handle sleep times, prototypes

**Deployment**: Connect GitHub → Select Rust → Deploy

---

### Fly.io

**Overview**: Global edge deployment platform

**Pricing**:
```
Hobby Plan: ~$5-10/month
- 3 shared-cpu-1x VMs with 256MB RAM (free)
- 3GB storage (free)
- Additional resources billed by usage
```

**Pros**:
- ✅ Multi-region deployment (35 global regions)
- ✅ Excellent for low-latency worldwide
- ✅ Good Rust documentation
- ✅ CLI-first workflow

**Cons**:
- ⚠️ Pricing complexity (can be surprising)
- ⚠️ No built-in CI/CD (need GitHub Actions)
- ⚠️ More manual configuration than Railway/Shuttle

**Best For**: Apps needing global distribution, edge computing

**Deployment**: `fly launch` → Configure → `fly deploy`

---

### DigitalOcean App Platform

**Overview**: Simplified cloud infrastructure from DO

**Pricing**:
```
Basic: $5/month
- 512 MB RAM, 1 vCPU

Professional: $12/month+
- 1 GB RAM, 1 vCPU
- Autoscaling

PostgreSQL: Starting $15/month
```

**Pros**:
- ✅ Simpler than AWS
- ✅ Clear pricing
- ✅ Managed PostgreSQL databases
- ✅ Docker support for Rust

**Cons**:
- ⚠️ No free tier
- ⚠️ Requires Docker configuration
- ⚠️ PostgreSQL costs extra

**Best For**: Developers familiar with DigitalOcean, need reliable hosting

**Deployment**: GitHub → Dockerfile → Auto-deploy

---

### Replit ❌ (NOT RECOMMENDED for JobHunter)

**Overview**: Browser-based development environment

**Why Not Suitable**:
- ❌ Database sleeps after 5 minutes of inactivity
- ❌ Limited resources (good for prototypes only)
- ❌ Not designed for production Rust apps
- ❌ Better suited for learning/teaching
- ❌ Would require keeping repl awake constantly

**Use Case**: Educational projects, quick prototypes, coding tutorials

**Verdict**: Skip Replit for JobHunter. Use Shuttle instead.

---

## Cost Comparison (12 months)

| Platform | Year 1 Cost | Notes |
|----------|-------------|-------|
| **Shuttle (Free)** | **$0** | ✅ Best for portfolio |
| Shuttle (Pro) | $240 | Better performance, reserved instances |
| Railway (Hobby) | $60 | $5/month in credits |
| Render (Free) | $0 | But sleeps, DB expires after 90 days |
| Render (Paid) | $264+ | $7/mo starter + $15/mo PostgreSQL |
| Fly.io | $60-120 | Variable based on usage |
| DigitalOcean | $240+ | $5/mo app + $15/mo DB |
| **AWS** | **$???** | Unpredictable, complex, overwhelming |
| **Tauri Desktop** | **$0-99** | Free or $99 for Apple code signing |

**Winner**: Shuttle Free Tier ($0/year) → Perfect for portfolio phase

---

## Addressing Your AWS Concerns

### Why AWS is Overwhelming

**Complexity**:
- 200+ services (EC2, ECS, EKS, Lambda, RDS, S3, etc.)
- IAM roles and permissions labyrinth
- VPCs, subnets, security groups
- Load balancers, auto-scaling groups
- CloudFormation/Terraform for infrastructure

**Cost Surprises**:
- Pay for everything: data transfer, storage, compute, requests
- Easy to accidentally leave resources running
- Billing can be confusing
- Free tier expires after 12 months

**Overkill**:
- Designed for enterprise scale
- JobHunter doesn't need AWS's complexity
- Like using a nuclear reactor to charge your phone

### How Shuttle/Railway/Render are Different

**Simplified Abstractions**:
```
AWS:              Shuttle:
EC2 → ECS →       cargo shuttle deploy
RDS →             ✓ (included)
S3 →              ✓ (included)
IAM →             ✓ (handled)
VPC →             ✓ (handled)
CloudFormation    ✓ (not needed)
```

**One Command vs. 20 Steps**:
- Shuttle: `cargo shuttle deploy` (done)
- AWS: Create VPC → Subnet → Security Group → RDS → EC2 → Load Balancer → IAM Roles → Deploy code → Configure DNS → ...

**Transparent Pricing**:
- Shuttle: $0 or $20/month flat
- AWS: $??? (surprise bills)

**Made for Developers**:
- Shuttle/Railway/Render: Built for app deployment
- AWS: Built for enterprise infrastructure

---

## Portfolio Impact Analysis

### Resume Addition

**Before Server Deployment**:
```
JobHunter - Job Application Management System
• Built full-stack app with Rust (Actix-web) and React/TypeScript
• Implemented PostgreSQL database with 12 normalized tables
• 244 automated tests (100% backend, 92% frontend coverage)
```

**After Server Deployment**:
```
JobHunter - Production Job Application Management System
• Deployed full-stack Rust application to Shuttle cloud platform
  → Live demo: https://jobhunter.shuttle.app
• Implemented CI/CD pipeline with GitHub Actions for automated testing
• Built with Rust (Actix-web), React/TypeScript, PostgreSQL
• 244 automated tests, branch protection, production monitoring
• Managed database migrations, environment configuration, and secrets
```

**Added Value**:
- ✅ "Production" experience
- ✅ "Deployed to cloud"
- ✅ "CI/CD pipeline"
- ✅ Live demo link
- ✅ DevOps knowledge

---

## Decision Matrix

### Choose Server Deployment If:
- ✅ Primary goal is job search / portfolio
- ✅ Want recruiters to test it live
- ✅ Want to learn CI/CD / DevOps
- ✅ Need multi-device access
- ✅ Want 24/7 automated job intake
- ✅ Willing to spend 30 minutes setting up
- ✅ Okay with $0-20/month cost

### Choose Desktop App (Tauri) If:
- ✅ Primary goal is personal daily use
- ✅ Want offline functionality
- ✅ Prefer native macOS experience
- ✅ Don't want any hosting costs
- ✅ Privacy is paramount (local data only)
- ✅ Willing to spend 6-9 hours setting up
- ✅ Okay with no live demo for recruiters

### Choose Both If:
- ✅ Want maximum portfolio impact (live demo)
- ✅ Also want best personal use experience
- ✅ Have time for both implementations
- ✅ Want to showcase multiple deployment methods

---

# PART II: DETAILED IMPLEMENTATION PLAN

## Implementation Overview

**Total Time Estimate**: 2-4 hours (first deployment)
**Cost**: $0 (using Shuttle Community tier)
**Difficulty**: Easy to Medium

### What We'll Build

```
┌─────────────────────────────────────────────────────────────┐
│                  Production Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────┐      ┌─────────────────────────┐│
│  │  Vercel (Frontend)    │      │  Shuttle (Backend)      ││
│  │  jobhunter.vercel.app │◄────►│  jobhunter.shuttle.app  ││
│  │                       │ HTTPS │                         ││
│  │  React/TypeScript     │      │  Rust/Actix-web         ││
│  │  Static Site          │      │  REST API               ││
│  └───────────────────────┘      └──────────┬──────────────┘│
│                                             │                │
│                                             │ SQL            │
│                                  ┌──────────▼──────────────┐│
│                                  │  Shuttle PostgreSQL     ││
│                                  │  (Managed Database)     ││
│                                  │  Auto-provisioned       ││
│                                  └─────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘

Users → https://jobhunter.vercel.app → API calls → https://jobhunter.shuttle.app
```

---

## Phase 0: Prerequisites & Setup

**Time**: 5 minutes
**Difficulty**: Easy

### Step 0.1: Verify Local Environment

Ensure your current setup is working:

```bash
# Verify Rust toolchain
rustc --version
# Should show: rustc 1.7x.x or later

cargo --version
# Should show: cargo 1.7x.x or later

# Verify PostgreSQL is running locally
psql --version
# Should show: psql (PostgreSQL) 14.x or later

# Verify Node.js
node --version
# Should show: v18.x or later

npm --version
# Should show: 9.x or later
```

### Step 0.2: Commit Current Work

Before making deployment changes, commit your current working state:

```bash
cd /Users/sam/Projects/JobHuntAI

# Check status
git status

# Commit any uncommitted changes
git add .
git commit -m "Pre-deployment checkpoint: Working local version"

# Create a deployment branch (optional but recommended)
git checkout -b deploy/shuttle-setup
```

**Why**: This allows easy rollback if needed

### Step 0.3: Create Backup Branch

```bash
# Tag current working version
git tag -a v1.0.0-local -m "Working local version before Shuttle deployment"

# Push tag (if you have remote)
git push origin v1.0.0-local
```

**Success Criteria**:
- ✅ All commands run without errors
- ✅ Current code is committed
- ✅ Backup tag created

---

## Phase 1: Shuttle CLI Installation

**Time**: 5-10 minutes
**Difficulty**: Easy

### Step 1.1: Install Shuttle CLI

```bash
# Install cargo-shuttle CLI
cargo install cargo-shuttle

# This will take 2-5 minutes to compile
# Expected output:
#   Updating crates.io index
#   Installing cargo-shuttle v0.47.x
#   Compiling cargo-shuttle...
#   Finished release [optimized] target(s)
#   Installing ~/.cargo/bin/cargo-shuttle
```

### Step 1.2: Verify Installation

```bash
# Check installation
cargo shuttle --version
# Should show: cargo-shuttle 0.47.x

# View available commands
cargo shuttle --help
```

**Expected output**:
```
cargo-shuttle 0.47.x
CLI for the Shuttle platform

USAGE:
    cargo shuttle [OPTIONS] <SUBCOMMAND>

SUBCOMMANDS:
    init        Initialize a new Shuttle project
    login       Login to Shuttle platform
    logout      Logout from Shuttle
    project     Manage projects
    deploy      Deploy your application
    status      Check deployment status
    logs        View application logs
    run         Run locally with Shuttle runtime
    stop        Stop a running deployment
```

### Step 1.3: Create Shuttle Account

```bash
# Login to Shuttle (opens browser for GitHub OAuth)
cargo shuttle login

# This will:
# 1. Open your browser
# 2. Ask you to authorize with GitHub
# 3. Create a Shuttle account linked to your GitHub
# 4. Save auth token locally
```

**Browser Flow**:
1. Browser opens to https://shuttle.rs/login
2. Click "Sign in with GitHub"
3. Authorize Shuttle to access your GitHub account
4. See "Successfully logged in!" message
5. Return to terminal

**Expected terminal output**:
```
Opening browser for authentication...
✓ Successfully logged in!
Your Shuttle token has been saved to ~/.shuttle/config.toml
```

### Step 1.4: Verify Authentication

```bash
# Check login status
cargo shuttle login --status
# Should show: Logged in as: [your-github-username]

# List your projects (should be empty initially)
cargo shuttle project list
# Should show: No projects found
```

**Troubleshooting**:

**Problem**: `cargo install cargo-shuttle` fails
```bash
# Solution 1: Update Rust toolchain
rustup update stable

# Solution 2: Install OpenSSL dev libraries (if on Linux)
# Ubuntu/Debian:
sudo apt-get install pkg-config libssl-dev

# macOS (usually not needed):
brew install openssl@3
```

**Problem**: Login fails or browser doesn't open
```bash
# Solution: Manual login with token
# 1. Visit https://shuttle.rs/login in browser
# 2. Complete GitHub OAuth
# 3. Copy API key shown
# 4. Run:
cargo shuttle login --api-key YOUR_API_KEY_HERE
```

**Success Criteria**:
- ✅ `cargo shuttle --version` works
- ✅ Successfully logged in with GitHub
- ✅ `cargo shuttle login --status` shows your username

---

## Phase 2: Backend Code Migration

**Time**: 20-30 minutes
**Difficulty**: Medium

### Step 2.1: Update Cargo.toml Dependencies

Edit `backend/Cargo.toml`:

```toml
[package]
name = "jobhunter"
version = "1.0.0"
edition = "2021"

[dependencies]
# Shuttle dependencies (NEW)
shuttle-runtime = "0.47"
shuttle-actix-web = "0.47"
shuttle-shared-db = { version = "0.47", features = ["postgres", "sqlx"] }

# Existing dependencies (keep these)
actix-web = "4.4"
actix-cors = "0.7"
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dotenv = "0.15"

# SQLx with async runtime
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "macros"] }

# Rest of your existing dependencies
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
sha2 = "0.10"
handlebars = "5.1"

# Add these if not present (for OAuth/API integrations)
reqwest = { version = "0.11", features = ["json"] }
base64 = "0.21"
```

**Changes Made**:
- ✅ Added `shuttle-runtime`, `shuttle-actix-web`, `shuttle-shared-db`
- ✅ Kept all existing dependencies
- ✅ SQLx remains the same (Shuttle uses sqlx for database)

### Step 2.2: Create Shuttle Configuration File

Create `backend/Shuttle.toml`:

```toml
# Shuttle.toml - Shuttle platform configuration
name = "jobhunter"

[build]
# Assets to include in deployment (if any)
assets = []
```

**Why**: This tells Shuttle the project name and configuration

### Step 2.3: Backup Current main.rs

```bash
cd backend
cp src/main.rs src/main.rs.local-backup
```

### Step 2.4: Modify main.rs for Shuttle

Now we need to adapt `backend/src/main.rs` for Shuttle. Here's the strategy:

**Key Changes**:
1. Replace `#[actix_web::main]` with `#[shuttle_runtime::main]`
2. Accept database pool from Shuttle via parameters
3. Return `ShuttleActixWeb` instead of starting server directly
4. Remove manual database connection (Shuttle provides it)

**Open** `backend/src/main.rs` and make these changes:

**OLD (Local version)**:
```rust
use actix_web::{web, App, HttpServer};
use sqlx::postgres::PgPoolOptions;
use dotenv::dotenv;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .configure(routes::configure)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

**NEW (Shuttle version)**:
```rust
use actix_web::{web, App, HttpServer};
use shuttle_actix_web::ShuttleActixWeb;
use sqlx::PgPool;

#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: PgPool,
) -> ShuttleActixWeb<impl MessageBody> {

    // Run database migrations if needed
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let pool_data = web::Data::new(pool);

    let config = move |cfg: &mut web::ServiceConfig| {
        cfg.app_data(pool_data.clone())
            .configure(routes::configure);
    };

    let app = HttpServer::new(move || {
        App::new()
            .configure(config)
    });

    Ok(app.into())
}
```

**What Changed**:
- ✅ `#[actix_web::main]` → `#[shuttle_runtime::main]`
- ✅ Function signature now accepts `pool: PgPool` from Shuttle
- ✅ No manual `.connect()` needed (Shuttle provides pool)
- ✅ No `.bind()` or `.run()` (Shuttle handles this)
- ✅ Returns `ShuttleActixWeb<impl MessageBody>`
- ✅ Added migration support

### Step 2.5: Keep Dual-Mode Support (Optional but Recommended)

To keep the ability to run locally AND deploy to Shuttle, use conditional compilation:

```rust
// backend/src/main.rs

use actix_web::{web, App, HttpServer};
use sqlx::PgPool;

// Import conditionally based on target
#[cfg(not(feature = "shuttle"))]
use sqlx::postgres::PgPoolOptions;

#[cfg(not(feature = "shuttle"))]
use dotenv::dotenv;

#[cfg(feature = "shuttle")]
use shuttle_actix_web::ShuttleActixWeb;

#[cfg(feature = "shuttle")]
use shuttle_runtime;

// Routes module (your existing routes)
mod routes;
mod models;
// ... other modules

// Shuttle entry point
#[cfg(feature = "shuttle")]
#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: PgPool,
) -> ShuttleActixWeb<impl MessageBody> {
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Migrations failed");

    let pool_data = web::Data::new(pool);

    let app = HttpServer::new(move || {
        App::new()
            .app_data(pool_data.clone())
            .configure(routes::configure_routes)
            .wrap(actix_cors::Cors::permissive())
    });

    Ok(app.into())
}

// Local entry point
#[cfg(not(feature = "shuttle"))]
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    println!("🚀 Server starting at http://127.0.0.1:8080");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .configure(routes::configure_routes)
            .wrap(actix_cors::Cors::permissive())
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

**Add to Cargo.toml**:
```toml
[features]
default = []
shuttle = ["shuttle-runtime", "shuttle-actix-web", "shuttle-shared-db"]
```

**Why This Approach**:
- ✅ Can still run locally: `cargo run`
- ✅ Deploy to Shuttle: `cargo shuttle deploy`
- ✅ No code duplication
- ✅ Keep local development workflow

### Step 2.6: Update CORS for Production

In your routes configuration, update CORS to allow Vercel frontend:

```rust
// backend/src/routes/mod.rs or wherever you configure routes

use actix_cors::Cors;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    // Configure CORS
    let cors = Cors::default()
        .allowed_origin("http://localhost:3000")  // Local frontend
        .allowed_origin("https://jobhunter.vercel.app")  // Production frontend
        .allowed_origin("https://*.vercel.app")  // Preview deployments
        .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        .allowed_headers(vec![
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
        ])
        .max_age(3600);

    cfg.service(
        web::scope("/api")
            .wrap(cors)
            .configure(job_routes)
            .configure(application_routes)
            // ... other routes
    );
}
```

**Success Criteria**:
- ✅ Cargo.toml updated with Shuttle dependencies
- ✅ Shuttle.toml created
- ✅ main.rs modified for Shuttle (with dual-mode support)
- ✅ CORS configured for production
- ✅ Code compiles: `cargo check --features shuttle`

---

## Phase 3: Database Schema Setup

**Time**: 10-15 minutes
**Difficulty**: Easy

Shuttle automatically provisions a PostgreSQL database, but we need to ensure our schema gets applied.

### Step 3.1: Create Migrations Directory

```bash
cd backend

# Create migrations directory if it doesn't exist
mkdir -p migrations
```

### Step 3.2: Convert Schema to Migration

Copy your existing schema into a migration:

```bash
# Create initial migration
cat > migrations/20251001000000_initial_schema.sql << 'EOF'
-- Initial schema for JobHunter
-- Generated: 2025-10-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary INTEGER,
    commute_time_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'approved', 'rejected', 'applied', 'filtered')),
    source TEXT NOT NULL,
    source_url TEXT,
    description TEXT,
    requirements JSONB,
    benefits JSONB,
    contact_info JSONB,
    notes TEXT,
    filter_reason TEXT,
    content_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Copy the rest of your schema from database/schema.sql
-- Including all tables, indexes, triggers, etc.

EOF
```

**Better Approach**: Copy your entire existing schema:

```bash
# Copy your full schema as migration
cp ../database/schema.sql migrations/20251001000000_initial_schema.sql
```

### Step 3.3: Verify SQLx Offline Mode (Optional)

For faster builds, SQLx can work offline:

```bash
# Install sqlx-cli if not already installed
cargo install sqlx-cli --no-default-features --features postgres

# Create .sqlx directory for offline mode
cargo sqlx prepare --database-url="your-local-db-url"
```

**Note**: This is optional. Shuttle will run migrations at deployment.

**Success Criteria**:
- ✅ `migrations/` directory exists
- ✅ Initial migration file created with your schema
- ✅ Migration file is valid SQL

---

## Phase 4: Local Testing with Shuttle

**Time**: 10 minutes
**Difficulty**: Easy

Before deploying, test locally using Shuttle's runtime.

### Step 4.1: Build with Shuttle Feature

```bash
cd backend

# Build with Shuttle support
cargo build --features shuttle

# Expected output:
#   Compiling jobhunter v1.0.0
#   Finished dev [unoptimized + debuginfo] target(s)
```

**If errors occur**, common issues:

**Error**: "cannot find value `MessageBody` in this scope"
```rust
// Fix: Add import
use actix_web::body::MessageBody;
```

**Error**: Missing route configurations
```rust
// Ensure your routes module is properly imported and configured
```

### Step 4.2: Test Local Build Without Shuttle

Verify your dual-mode approach works:

```bash
# Start local PostgreSQL
brew services start postgresql@14

# Run local version (without Shuttle)
cargo run

# Should start on http://127.0.0.1:8080
# Test: curl http://127.0.0.1:8080/api/jobs
```

### Step 4.3: Run with Shuttle Locally (Optional)

```bash
# Run using Shuttle's local runtime
# This simulates the Shuttle environment locally
cargo shuttle run

# This will:
# 1. Spin up a local Shuttle runtime
# 2. Provision a local database
# 3. Run your app in Shuttle mode
```

**Note**: Local Shuttle runtime may require Docker for database provisioning.

**Success Criteria**:
- ✅ Code compiles with and without `--features shuttle`
- ✅ Local version still runs with `cargo run`
- ✅ No compilation errors

---

## Phase 5: Deploy Backend to Shuttle

**Time**: 10-15 minutes (first deploy)
**Difficulty**: Easy

Now we deploy to Shuttle!

### Step 5.1: Initialize Shuttle Project

```bash
cd backend

# Initialize project with Shuttle
cargo shuttle project start

# You'll be prompted:
# Project name: jobhunter
# Confirm? (y/n): y

# Expected output:
# ✓ Project 'jobhunter' created successfully
# ✓ PostgreSQL database provisioned
# ✓ Ready for deployment
```

**Alternative**: Let Shuttle auto-create on first deploy:

```bash
# Shuttle will create project automatically on first deploy
# if Shuttle.toml exists
```

### Step 5.2: Deploy to Shuttle

```bash
# Deploy your application
cargo shuttle deploy

# This will:
# 1. Build your Rust application (takes 3-5 minutes first time)
# 2. Upload to Shuttle
# 3. Provision PostgreSQL database
# 4. Run migrations
# 5. Start your service

# Expected output:
#   Packaging jobhunter v1.0.0 (/Users/sam/Projects/JobHuntAI/backend)
#   Compiling jobhunter v1.0.0 (/Users/sam/Projects/JobHuntAI/backend)
#   Building [=========================] 100% (158/158)
#   Uploading jobhunter to Shuttle...
#   ✓ Deployment uploaded
#   Provisioning resources...
#   ✓ Database: Postgres instance ready
#   Starting deployment...
#   ✓ Service started
#
#   🎉 Deployment successful!
#
#   URL: https://jobhunter.shuttle.app
#   Status: Running
```

### Step 5.3: Check Deployment Status

```bash
# View deployment status
cargo shuttle status

# Expected output:
# Project: jobhunter
# Status: Running
# URL: https://jobhunter.shuttle.app
# Database: Postgres (running)
# Uptime: 2m 34s
```

### Step 5.4: View Logs

```bash
# Stream live logs
cargo shuttle logs --follow

# Or view recent logs
cargo shuttle logs --latest

# Expected output:
# [INFO] Server starting...
# [INFO] Database connected
# [INFO] Migrations applied successfully
# [INFO] Server listening on https://jobhunter.shuttle.app
```

### Step 5.5: Test Deployed API

```bash
# Test the live API
curl https://jobhunter.shuttle.app/api/jobs

# Should return JSON response (may be empty array initially):
# []

# Test specific endpoint
curl https://jobhunter.shuttle.app/api/criteria

# Should return job filtering criteria
```

### Step 5.6: Access Shuttle Dashboard

Visit Shuttle Console in browser:
```bash
# Open Shuttle console
open https://console.shuttle.rs
```

**In the dashboard you can**:
- View deployments
- Check logs
- Monitor resource usage
- Manage environment variables
- View database connection info
- Restart service
- Delete project

**Troubleshooting Common Deploy Issues**:

**Issue**: Build fails with dependency errors
```bash
# Solution: Clean and rebuild
cargo clean
cargo shuttle deploy --allow-dirty
```

**Issue**: Database migration fails
```bash
# Solution: Check migration files
ls -la migrations/
# Ensure migrations are valid SQL
# Check Shuttle logs:
cargo shuttle logs
```

**Issue**: Service starts but crashes
```bash
# Solution: Check logs for errors
cargo shuttle logs --latest
# Common issues:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
```

**Issue**: 502 Bad Gateway
```bash
# Service is starting up (can take 30-60 seconds)
# Wait and retry
sleep 30
curl https://jobhunter.shuttle.app/api/jobs
```

**Success Criteria**:
- ✅ `cargo shuttle deploy` completes successfully
- ✅ URL is accessible: https://jobhunter.shuttle.app
- ✅ `cargo shuttle status` shows "Running"
- ✅ API endpoints respond: `curl https://jobhunter.shuttle.app/api/jobs`
- ✅ Logs show no errors

**🎉 Backend is now live!**

---

## Phase 6: Frontend Deployment to Vercel

**Time**: 10-15 minutes
**Difficulty**: Easy

Now deploy the React frontend to Vercel (free hosting for React apps).

### Step 6.1: Update Frontend API Configuration

Edit `frontend/src/App.tsx` or create `frontend/src/config.ts`:

```typescript
// frontend/src/config.ts

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';

// API base URL configuration
export const API_BASE_URL = isProduction
  ? 'https://jobhunter.shuttle.app/api'  // Production Shuttle backend
  : 'http://localhost:8080/api';          // Local development

export const config = {
  apiBaseUrl: API_BASE_URL,
  isProduction,
};
```

Update `frontend/src/App.tsx` to use this config:

```typescript
// frontend/src/App.tsx
import { config } from './config';

// Replace all hardcoded 'http://localhost:8080/api' with:
const response = await fetch(`${config.apiBaseUrl}/jobs`);
```

**Find and replace all API calls**:
```bash
cd frontend

# Find all hardcoded localhost URLs
grep -r "localhost:8080" src/

# Replace with config
# OLD: fetch('http://localhost:8080/api/jobs')
# NEW: fetch(`${config.apiBaseUrl}/jobs`)
```

### Step 6.2: Test Frontend Locally with Production Backend

```bash
cd frontend

# Set production API for testing
export REACT_APP_API_URL=https://jobhunter.shuttle.app/api

# Start frontend
npm start

# Visit http://localhost:3000
# Frontend should now load data from Shuttle backend
```

**Verify**:
- Jobs load from Shuttle backend
- No CORS errors in console
- All features work with remote API

### Step 6.3: Install Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# This will:
# 1. Open browser for authentication
# 2. Ask you to log in with GitHub/GitLab/Email
# 3. Save auth token
```

### Step 6.4: Deploy Frontend to Vercel

```bash
cd frontend

# Deploy to Vercel (first time)
vercel

# Vercel will ask:
# ? Set up and deploy "~/Projects/JobHuntAI/frontend"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? jobhunter
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n

# Expected output:
#   🔍 Inspect: https://vercel.com/[username]/jobhunter/[deployment-id]
#   ✅ Production: https://jobhunter.vercel.app [3s]
```

**Automatic Configuration**: Vercel auto-detects Create React App and configures:
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### Step 6.5: Configure Environment Variables in Vercel

Vercel deployment needs the production API URL:

```bash
# Add environment variable via CLI
vercel env add REACT_APP_API_URL

# When prompted:
# ? What's the value of REACT_APP_API_URL? https://jobhunter.shuttle.app/api
# ? Add REACT_APP_API_URL to which Environments? Production, Preview, Development

# Or add via Vercel Dashboard:
# 1. Visit https://vercel.com/[username]/jobhunter/settings/environment-variables
# 2. Add: REACT_APP_API_URL = https://jobhunter.shuttle.app/api
# 3. Apply to: Production, Preview, Development
```

### Step 6.6: Redeploy with Environment Variables

```bash
# Trigger new deployment with env vars
vercel --prod

# Expected output:
#   🔍 Inspect: https://vercel.com/[username]/jobhunter/[deployment-id]
#   ✅ Production: https://jobhunter.vercel.app [3s]
```

### Step 6.7: Test Production Frontend

```bash
# Open production URL
open https://jobhunter.vercel.app

# Or test with curl
curl https://jobhunter.vercel.app
```

**Verify in browser**:
- ✅ Frontend loads
- ✅ Jobs display (if any exist)
- ✅ Can create new job
- ✅ Status updates work
- ✅ Content generation works
- ✅ No CORS errors
- ✅ No console errors

### Step 6.8: Setup Vercel GitHub Integration (Recommended)

**Why**: Automatic deployments on every git push

**Setup**:
1. Visit https://vercel.com/[username]/jobhunter/settings/git
2. Click "Connect Git Repository"
3. Select your GitHub repo: `JobHuntAI`
4. Configure:
   - Production Branch: `main`
   - Preview Branch: All branches
5. Confirm connection

**Result**: Every push to `main` triggers automatic deployment!

**Troubleshooting**:

**Issue**: Vercel build fails
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing dependencies in package.json
# - TypeScript errors
# - Missing environment variables

# Solution: Fix locally first
cd frontend
npm run build  # Must succeed
```

**Issue**: Frontend shows CORS errors
```bash
# Solution: Update backend CORS in Shuttle
# Edit backend/src/routes/mod.rs
# Add: .allowed_origin("https://jobhunter.vercel.app")
# Redeploy backend:
cd backend
cargo shuttle deploy
```

**Issue**: API calls fail (404)
```bash
# Verify API URL in Vercel environment variables
vercel env ls

# Should show:
# REACT_APP_API_URL: https://jobhunter.shuttle.app/api

# If missing, add it:
vercel env add REACT_APP_API_URL
```

**Success Criteria**:
- ✅ Frontend deploys successfully to Vercel
- ✅ Site is accessible: https://jobhunter.vercel.app
- ✅ API calls work (frontend → Shuttle backend)
- ✅ No CORS errors
- ✅ All features functional
- ✅ GitHub auto-deploy configured (optional)

**🎉 Full stack is now live!**
- **Backend**: https://jobhunter.shuttle.app
- **Frontend**: https://jobhunter.vercel.app

---

## Phase 7: Production Testing

**Time**: 15-20 minutes
**Difficulty**: Easy

Comprehensive testing of the deployed application.

### Step 7.1: Functional Testing Checklist

**Test all core features**:

```bash
# Open production app
open https://jobhunter.vercel.app
```

**Manual Test Checklist**:

- [ ] **Page Load**
  - [ ] Frontend loads without errors
  - [ ] No console errors in browser DevTools
  - [ ] Statistics display correctly

- [ ] **Job Management**
  - [ ] View all jobs (Inbox tab)
  - [ ] Create new job manually
  - [ ] Update job status (approve/reject)
  - [ ] View filtered jobs
  - [ ] View approved/applied jobs
  - [ ] Job details modal opens

- [ ] **Content Generation**
  - [ ] Click "Generate Resume & Cover Letter" on approved job
  - [ ] Modal opens with generated content
  - [ ] Resume shows relevant experience
  - [ ] Cover letter is personalized
  - [ ] Close modal

- [ ] **Statistics**
  - [ ] Statistics update after status changes
  - [ ] Counts are accurate

- [ ] **Tab Navigation**
  - [ ] Switch between tabs (Inbox, Approved, Applied, Filtered, All)
  - [ ] Jobs filter correctly per tab
  - [ ] Tab counts are correct

- [ ] **Filtering & Validation**
  - [ ] Create job with salary < $130K (should be filtered)
  - [ ] Check filtered tab shows rejection reason
  - [ ] Create job with salary > $130K (should pass)

### Step 7.2: API Testing with curl

Test backend endpoints directly:

```bash
# Get all jobs
curl https://jobhunter.shuttle.app/api/jobs | jq

# Get job criteria
curl https://jobhunter.shuttle.app/api/criteria | jq

# Get jobs by status
curl https://jobhunter.shuttle.app/api/jobs/status/new | jq

# Get filtered jobs
curl https://jobhunter.shuttle.app/api/jobs/filtered | jq

# Get statistics
curl https://jobhunter.shuttle.app/api/jobs/stats | jq

# Create a test job (POST)
curl -X POST https://jobhunter.shuttle.app/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Test Automation Engineer",
    "company": "TestCorp",
    "location": "Remote",
    "salary": 150000,
    "source": "Manual Entry",
    "description": "Testing the deployed API"
  }' | jq
```

### Step 7.3: Performance Testing

```bash
# Test response times
time curl -s https://jobhunter.shuttle.app/api/jobs > /dev/null
# Should complete in < 2 seconds

# Test concurrent requests (if ab installed)
ab -n 100 -c 10 https://jobhunter.shuttle.app/api/jobs
# Should handle 10 concurrent requests without errors
```

### Step 7.4: Browser DevTools Inspection

**Open browser DevTools** (F12 or Cmd+Opt+I):

**Console Tab**:
- ✅ No red errors
- ⚠️ Yellow warnings are usually okay
- Check for CORS issues (should be none)

**Network Tab**:
- ✅ API calls return 200 OK
- ✅ Response times < 2 seconds
- ✅ No 4xx or 5xx errors
- Check request/response payloads

**Application Tab** → Local Storage:
- Check if frontend caches any data
- Verify no sensitive data in localStorage

### Step 7.5: Mobile Testing

**Test on mobile device or Chrome DevTools mobile emulation**:

```bash
# Open Chrome DevTools
# Click "Toggle device toolbar" (Cmd+Shift+M)
# Select iPhone or Android device
# Test responsive design
```

- [ ] Layout adapts to mobile screen
- [ ] Buttons are clickable
- [ ] Text is readable
- [ ] No horizontal scrolling
- [ ] All features work on mobile

### Step 7.6: Cross-Browser Testing

**Test in multiple browsers** (if available):
- [ ] Chrome/Chromium (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Expected**: Should work in all modern browsers

### Step 7.7: Seed Production Database (Optional)

If you want demo data in production:

```bash
# Option 1: Create jobs via UI
# Visit https://jobhunter.vercel.app
# Manually create 5-10 demo jobs

# Option 2: Use API to seed
# Create a script: scripts/seed-production.sh
```

**Warning**: Don't put sensitive real job data in public demo!

**Success Criteria**:
- ✅ All functional tests pass
- ✅ No console errors
- ✅ API responses are fast (< 2s)
- ✅ Mobile layout works
- ✅ Cross-browser compatibility confirmed
- ✅ Ready to share with recruiters

---

## Phase 8: CI/CD Integration (Optional but Recommended)

**Time**: 1-2 hours
**Difficulty**: Medium

Integrate with your existing CI/CD plan for automated testing before deployment.

### Step 8.1: Use Existing GitHub Actions Workflows

You already have CI/CD plan at `README_ci-cd-github-plan.md`. Implement it now:

```bash
# Create GitHub Actions directory
mkdir -p .github/workflows

# Copy backend test workflow
# (Use the workflows from your CI/CD plan)
```

### Step 8.2: Add Shuttle Deployment to GitHub Actions

Create `.github/workflows/deploy-shuttle.yml`:

```yaml
name: Deploy to Shuttle

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    name: Deploy Backend to Shuttle
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable

    - name: Install Shuttle CLI
      run: cargo install cargo-shuttle

    - name: Deploy to Shuttle
      working-directory: backend
      env:
        SHUTTLE_API_KEY: ${{ secrets.SHUTTLE_API_KEY }}
      run: |
        cargo shuttle deploy --allow-dirty

    - name: Deployment Summary
      run: echo "✅ Backend deployed to https://jobhunter.shuttle.app"
```

### Step 8.3: Add Shuttle API Key to GitHub Secrets

```bash
# Get your Shuttle API key
cat ~/.shuttle/config.toml
# Copy the 'api_key' value

# Add to GitHub repository secrets:
# 1. Go to GitHub repo → Settings → Secrets and variables → Actions
# 2. Click "New repository secret"
# 3. Name: SHUTTLE_API_KEY
# 4. Value: [paste your Shuttle API key]
# 5. Click "Add secret"
```

### Step 8.4: Vercel GitHub Integration

Vercel already auto-deploys from GitHub if connected (Phase 6.8). If not:

```bash
# Vercel automatically deploys on git push if GitHub is connected
# To verify:
vercel link

# Expected output:
# ✅ Linked to [username]/jobhunter
```

### Step 8.5: Test CI/CD Pipeline

```bash
# Make a small change
echo "# Deployment test" >> backend/README.md

# Commit and push
git add .
git commit -m "Test: CI/CD deployment pipeline"
git push origin main

# Check GitHub Actions
# Visit: https://github.com/[username]/JobHuntAI/actions
# Should see workflows running
```

**Expected Flow**:
1. Push to `main`
2. GitHub Actions run tests
3. If tests pass → Deploy to Shuttle (backend)
4. Vercel auto-deploys frontend
5. Both services update automatically

**Success Criteria**:
- ✅ GitHub Actions workflows execute on push
- ✅ Backend auto-deploys to Shuttle
- ✅ Frontend auto-deploys to Vercel
- ✅ Tests must pass before deployment
- ✅ Can view deployment logs in GitHub Actions

---

## Phase 9: Custom Domain Setup (Optional)

**Time**: 15-30 minutes
**Difficulty**: Medium
**Cost**: $0 if you own domain, ~$12/year for new domain

If you want `jobhunter.samkirk.com` instead of `jobhunter.shuttle.app`:

### Step 9.1: Add Custom Domain to Shuttle

```bash
# Via CLI
cargo shuttle project domain add jobhunter.samkirk.com

# Or via Shuttle Console:
# 1. Visit https://console.shuttle.rs/jobhunter
# 2. Click "Domains"
# 3. Add custom domain
# 4. Follow DNS instructions
```

### Step 9.2: Configure DNS Records

**Add DNS records at your domain registrar** (e.g., Namecheap, Google Domains):

```
Type: CNAME
Name: jobhunter
Value: jobhunter.shuttle.app
TTL: 300
```

**Or for root domain**:
```
Type: A
Name: @
Value: [Shuttle provides IP]
TTL: 300
```

### Step 9.3: Add Custom Domain to Vercel

```bash
# Via CLI
vercel domains add www.jobhunter.samkirk.com

# Or via Vercel Dashboard:
# 1. Visit https://vercel.com/[username]/jobhunter/settings/domains
# 2. Add domain
# 3. Follow DNS verification steps
```

**DNS Configuration**:
```
Type: CNAME
Name: www.jobhunter
Value: cname.vercel-dns.com
TTL: 300
```

### Step 9.4: Wait for DNS Propagation

```bash
# Check DNS propagation (takes 5 minutes to 48 hours)
dig jobhunter.samkirk.com

# Or use online tool:
open https://dnschecker.org
```

### Step 9.5: Update Frontend API Config

If backend uses custom domain:

```typescript
// frontend/src/config.ts
export const API_BASE_URL = isProduction
  ? 'https://api.jobhunter.samkirk.com/api'  // Custom domain
  : 'http://localhost:8080/api';
```

**Success Criteria**:
- ✅ Custom domain points to Shuttle backend
- ✅ Custom domain points to Vercel frontend
- ✅ HTTPS works automatically (Shuttle/Vercel provide SSL)
- ✅ Old URLs still work
- ✅ Update resume with custom domain

---

## Phase 10: Monitoring & Maintenance

**Time**: Ongoing
**Difficulty**: Easy

Set up monitoring and maintenance procedures.

### Step 10.1: Shuttle Monitoring

**Check Shuttle Status**:
```bash
# View current status
cargo shuttle status

# View logs
cargo shuttle logs --latest

# View resource usage
cargo shuttle project status
```

**Shuttle Console Dashboard**:
```bash
# Open Shuttle console
open https://console.shuttle.rs

# Monitor:
# - Uptime
# - Request count
# - Error rate
# - Database size
# - Build history
```

### Step 10.2: Vercel Monitoring

**Vercel Analytics** (built-in):
```bash
# Open Vercel dashboard
open https://vercel.com/[username]/jobhunter

# View:
# - Deployment history
# - Performance metrics
# - Usage stats
# - Error tracking
```

### Step 10.3: Setup Uptime Monitoring (Optional)

Use free uptime monitoring service:

**UptimeRobot** (Free tier: 50 monitors):
1. Sign up: https://uptimerobot.com
2. Add monitors:
   - https://jobhunter.shuttle.app/api/jobs
   - https://jobhunter.vercel.app
3. Configure alerts (email when down)

**Or use simple cron job**:
```bash
# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check for JobHunter

BACKEND="https://jobhunter.shuttle.app/api/jobs"
FRONTEND="https://jobhunter.vercel.app"

# Check backend
if curl -sf "$BACKEND" > /dev/null; then
  echo "✅ Backend healthy"
else
  echo "❌ Backend down!"
  # Send alert (email, Slack, etc.)
fi

# Check frontend
if curl -sf "$FRONTEND" > /dev/null; then
  echo "✅ Frontend healthy"
else
  echo "❌ Frontend down!"
fi
EOF

chmod +x scripts/health-check.sh

# Run every 5 minutes via cron
crontab -e
# Add: */5 * * * * /path/to/JobHuntAI/scripts/health-check.sh
```

### Step 10.4: Database Backups

**Shuttle automatic backups**:
- Free tier: Manual backups
- Pro tier: Automatic daily backups

**Manual backup**:
```bash
# Export database via Shuttle CLI
cargo shuttle project database export > backup.sql

# Or via pg_dump if you have connection string
# (Get from Shuttle console → Database → Connection details)
pg_dump $SHUTTLE_DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Step 10.5: Regular Maintenance Checklist

**Weekly**:
- [ ] Check Shuttle logs for errors: `cargo shuttle logs`
- [ ] Verify uptime via monitoring
- [ ] Test critical features still work

**Monthly**:
- [ ] Update dependencies: `cargo update` and `npm update`
- [ ] Review and clean old deployments
- [ ] Check database size and clean test data if needed
- [ ] Verify backups are working

**As Needed**:
- [ ] Deploy updates: `cargo shuttle deploy` (backend), `vercel --prod` (frontend)
- [ ] Respond to uptime alerts
- [ ] Apply security patches

### Step 10.6: Cost Monitoring

**Free Tier Limits**:
```bash
# Shuttle Community (Free):
# - 1 project ✅
# - 512MB RAM ✅
# - 0.25 vCPU ✅
# - 10 req/sec ✅
# - 100 build minutes/month (monitor this)

# Vercel Hobby (Free):
# - 100GB bandwidth/month
# - Unlimited deployments
# - 100 builds/day
```

**Monitor usage**:
- Shuttle: https://console.shuttle.rs/jobhunter
- Vercel: https://vercel.com/[username]/jobhunter/settings/usage

**When to upgrade**:
- Exceeding free tier limits
- Need reserved instances (no restarts)
- Need more projects
- Need professional support

### Step 10.7: Error Tracking (Optional)

**Add Sentry for production error tracking**:

```bash
# Install Sentry
npm install --save @sentry/react @sentry/tracing

# Configure in frontend
# frontend/src/index.tsx
import * as Sentry from "@sentry/react";

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: "your-sentry-dsn",
    integrations: [new Sentry.BrowserTracing()],
    tracesSampleRate: 1.0,
  });
}
```

**Success Criteria**:
- ✅ Monitoring dashboards bookmarked
- ✅ Uptime checks configured
- ✅ Backup strategy in place
- ✅ Maintenance schedule established
- ✅ Error tracking setup (optional)
- ✅ Know when to upgrade to paid tier

---

## Common Deployment Questions

### Q: Is the free tier reliable enough for portfolio?
**A**: Yes! Shuttle's free tier is perfect for portfolio projects. While it uses "spot instances" (may restart occasionally), this is fine for demos. Uptime is sufficient for recruiters to test. If you need guaranteed uptime, upgrade to Pro ($20/month) after getting interviews.

### Q: What if I exceed free tier limits?
**A**: Unlikely for JobHunter. Free tier includes:
- 10 requests/second (plenty for personal use)
- 512 MB RAM (sufficient for your app)
- Starter database (handles your data size)
- 100 build minutes/month (you'll use ~5-10)

If you somehow exceed, Shuttle will notify you before charging.

### Q: Can I switch platforms later?
**A**: Yes! Your app is containerizable. Can move from Shuttle → Railway → Fly → anywhere. Not locked in.

### Q: What about data privacy/security?
**A**:
- Use environment variables for secrets (API keys, etc.)
- Enable HTTPS (Shuttle provides automatically)
- Implement authentication if sharing publicly
- Consider not storing sensitive personal info in demo

### Q: Do recruiters actually test live demos?
**A**: YES! Recruiters/hiring managers appreciate clickable links. Many will test briefly. Having a live demo significantly increases interview chances vs "run this locally" projects.

### Q: How do I update the deployed app?
**A**:
```bash
# Make changes locally
git commit -am "Updated feature X"

# Push to GitHub (triggers CI/CD tests)
git push origin main

# If no CI/CD, manually deploy:
# Backend:
cd backend && cargo shuttle deploy

# Frontend:
cd frontend && vercel --prod

# Done! Live in 1-2 minutes
```

### Q: Can I revert to local-only development?
**A**: Yes! Your dual-mode setup allows both:
```bash
# Local development
cargo run  # backend
npm start  # frontend

# Production deployment
cargo shuttle deploy  # backend
vercel --prod         # frontend
```

### Q: What if Shuttle shuts down or changes pricing?
**A**:
- Your code is platform-agnostic (Docker-ready)
- Can migrate to Railway, Render, Fly.io in < 1 hour
- Database can be exported and imported elsewhere
- Frontend can move to Netlify, Cloudflare Pages, etc.
- Not locked into Shuttle

---

## Troubleshooting Guide

### Backend Issues

**Problem**: Deployment fails with "database migration error"
```bash
# Solution: Check migration files
ls -la backend/migrations/
# Verify syntax:
psql -f backend/migrations/*.sql -v ON_ERROR_STOP=1

# View detailed logs:
cargo shuttle logs --latest
```

**Problem**: Service crashes after deployment
```bash
# Check logs
cargo shuttle logs --follow

# Common causes:
# - Environment variable missing
# - Database connection failed
# - Panic in code

# Solution: Add error handling, check logs
```

**Problem**: CORS errors from frontend
```bash
# Solution: Update CORS config in backend
# backend/src/routes/mod.rs
.allowed_origin("https://jobhunter.vercel.app")
.allowed_origin("https://*.vercel.app")  # For preview deployments

# Redeploy
cargo shuttle deploy
```

### Frontend Issues

**Problem**: Vercel build fails
```bash
# Check build locally first
cd frontend
npm run build

# If fails locally, fix TypeScript/lint errors
npm run lint

# If succeeds locally but fails on Vercel:
# - Check Node.js version matches (package.json: engines)
# - Check environment variables in Vercel dashboard
```

**Problem**: Frontend shows blank page in production
```bash
# Open browser console (F12)
# Common issues:
# - API_BASE_URL incorrect
# - CORS blocking requests
# - JavaScript error

# Solution: Check Vercel logs
vercel logs https://jobhunter.vercel.app
```

**Problem**: API calls return 404
```bash
# Verify API endpoint:
curl https://jobhunter.shuttle.app/api/jobs

# If 404:
# - Check backend routes are configured correctly
# - Verify URL path matches (trailing slash?)
# - Check CORS is allowing request

# If 200 but frontend shows 404:
# - Check frontend API_BASE_URL is correct
# - Check Vercel environment variables
```

### Database Issues

**Problem**: Database connection fails
```bash
# Check Shuttle database status
cargo shuttle project status

# Verify database is provisioned
# Check Shuttle console: https://console.shuttle.rs/jobhunter

# Solution: Restart service
cargo shuttle project restart
```

**Problem**: Lost data after service restart
```bash
# Free tier spot instances may restart
# Data SHOULD persist (database is separate)

# If data truly lost:
# - Check if migrations ran
# - Verify database connection string didn't change
# - Contact Shuttle support
```

### Performance Issues

**Problem**: Slow response times (> 5 seconds)
```bash
# Test backend directly
time curl https://jobhunter.shuttle.app/api/jobs

# If slow:
# - Check database queries (add indexes)
# - Optimize code (profiling)
# - Upgrade to Pro tier (better CPU)

# If fast, frontend issue:
# - Check Vercel deployment logs
# - Optimize bundle size
# - Use React DevTools profiler
```

**Problem**: Free tier quota exceeded
```bash
# Check usage
# Shuttle: https://console.shuttle.rs/jobhunter
# Vercel: https://vercel.com/[username]/settings/usage

# Solutions:
# - Optimize API calls (reduce frequency)
# - Add caching
# - Upgrade to paid tier if needed
```

---

## Success Metrics

### Technical Success
- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ Database provisioned and migrations applied
- ✅ All API endpoints functional
- ✅ No CORS errors
- ✅ < 2 second response times
- ✅ Mobile responsive
- ✅ HTTPS enabled
- ✅ CI/CD pipeline operational (optional)

### Portfolio Success
- ✅ Live demo URL in resume
- ✅ GitHub README updated with deployment links
- ✅ Recruiters can test without installation
- ✅ Professional appearance
- ✅ DevOps experience demonstrated

### User Experience Success
- ✅ Application loads quickly (< 3s)
- ✅ All features work as expected
- ✅ Error handling is graceful
- ✅ Mobile experience is good
- ✅ Uptime > 99% (for paid tier, > 95% for free)

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Verify deployment successful
- [ ] Test all features in production
- [ ] Update README with live URLs
- [ ] Update resume with live demo link
- [ ] Share with 1-2 friends for feedback

### Short Term (Week 1)
- [ ] Setup uptime monitoring
- [ ] Configure CI/CD (if not done)
- [ ] Monitor logs for errors
- [ ] Test from multiple devices/browsers
- [ ] Create 5-10 demo jobs for recruiters

### Medium Term (Month 1)
- [ ] Review analytics (Vercel/Shuttle dashboards)
- [ ] Update dependencies
- [ ] Add any requested features
- [ ] Consider custom domain
- [ ] Share on LinkedIn/portfolio site

### Long Term (Ongoing)
- [ ] Monthly dependency updates
- [ ] Monitor usage vs free tier limits
- [ ] Backup database monthly
- [ ] Respond to uptime alerts
- [ ] Upgrade to paid tier when job hunting succeeds! 🎉

---

## Resources & Next Steps

### Documentation
- **Shuttle**: https://docs.shuttle.dev
- **Shuttle Actix Example**: https://docs.shuttle.dev/examples/actix-postgres
- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.com
- **Render**: https://render.com/docs
- **Fly.io**: https://fly.io/docs/rust

### Deployment Guides
- Shuttle Actix Deployment: https://www.shuttle.dev/blog/2023/12/15/using-actix-rust
- Railway Rust Guide: https://docs.railway.com/guides/axum
- Render Rust Guide: https://render.com/docs/deploy-rocket-rust

### Frontend Hosting (Free)
- **Vercel**: https://vercel.com (React-optimized, free tier)
- **Netlify**: https://netlify.com (alternative to Vercel)
- **Cloudflare Pages**: https://pages.cloudflare.com

### Community & Support
- Shuttle Discord: https://discord.gg/shuttle
- Vercel Community: https://github.com/vercel/vercel/discussions
- Rust Community: https://users.rust-lang.org

---

## Final Recommendation

### 🎯 Execute This Plan Now

**Estimated Timeline**:
- **Phase 0-2**: 30 minutes (setup & code changes)
- **Phase 3-5**: 30 minutes (deploy backend)
- **Phase 6**: 15 minutes (deploy frontend)
- **Phase 7**: 15 minutes (testing)
- **Phase 8** (optional): 1-2 hours (CI/CD)
- **Total**: 1.5 - 3 hours

**Cost**: $0/month (free tiers)

**Portfolio Value**: Immense
- Live demo for recruiters
- Production deployment experience
- DevOps/CI/CD knowledge
- Cloud platform expertise

**Next Actions**:
1. Start with Phase 0 (Prerequisites)
2. Work through phases sequentially
3. Don't skip testing phases
4. Update resume immediately after Phase 7
5. Share with recruiters

**After Deployment**:
- Add live URLs to resume
- Update README with badges and links
- Share on LinkedIn
- Apply to jobs with live demo
- Consider CI/CD (Phase 8) for extra polish

---

## Frequently Asked Questions (Q&A)

### Q1: Why do I need Vercel for the frontend? Can't Shuttle host everything?

**A**: Great question! You **CAN** host both frontend and backend on Shuttle using `shuttle-static-folder`:

```toml
# Cargo.toml
[dependencies]
shuttle-static-folder = "0.47"
```

```rust
// Serve React from Shuttle
#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: PgPool,
    #[shuttle_static_folder::StaticFolder] static_folder: PathBuf,
) -> ShuttleActixWeb<impl MessageBody> {
    // Serve API at /api/*
    // Serve React build from static_folder at /*
}
```

**Why I recommended Vercel**:
- **Global CDN**: Faster load times worldwide (Vercel has 100+ edge locations)
- **Free tier**: Unlimited bandwidth for static sites
- **Auto-optimizations**: Image optimization, compression, caching
- **Separate deployments**: Backend changes don't require frontend rebuild
- **Better for static sites**: Vercel is optimized specifically for React/Next.js

**But if you prefer all-in-one on Shuttle**: Totally valid choice! Just serve the `frontend/build` directory as static files. It's simpler but slightly less optimized.

---

### Q2: How do I keep my job hunting data private?

**A**: For **single-user deployment** (portfolio version):
- Your data is in YOUR PostgreSQL database on Shuttle
- Only you have API access (no authentication = no other users)
- Database is not publicly accessible (Shuttle secures it)
- Use HTTPS (Shuttle provides automatically)
- Don't share your Shuttle API URL publicly (or add authentication)

**For demo purposes**:
- Use dummy/sample job data (not real applications)
- Don't include sensitive info (salary negotiations, personal notes)
- Consider adding basic auth if sharing publicly

**For production multi-user SaaS** (see [Multi-User SaaS Plan](README_multi-user-saas-plan.md)):
- Implement proper authentication (JWT tokens)
- Add `user_id` to all database tables
- Filter all queries by authenticated user: `WHERE user_id = $1`
- Each user sees ONLY their own data
- Use encryption for sensitive fields (optional)

---

### Q3: How do multiple users with separate logins work? Does Shuttle handle this?

**A**: **Critical clarification**: Shuttle does NOT provide user authentication for your application.

**What Shuttle provides**:
- ✅ Your backend hosting (the Rust/Actix server)
- ✅ ONE PostgreSQL database (shared by all your users)
- ✅ Infrastructure and deployment

**What YOU must implement**:
- ❌ User signup/login system
- ❌ Password hashing (argon2)
- ❌ JWT token generation/validation
- ❌ Authorization (who can see what)
- ❌ Data isolation per user

**Multi-user architecture**:
```
User A (Frontend) ──┐
User B (Frontend) ──┼──► Shuttle Backend ──► PostgreSQL
User C (Frontend) ──┘         │                   ├─ User A's jobs
                               │                   ├─ User B's jobs
                               ↓                   └─ User C's jobs
                      Auth Middleware
                   (validates JWT, extracts user_id)
```

**Implementation approach**:
```sql
-- Add users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,  -- argon2 hashed
    subscription_tier TEXT
);

-- Add user_id to all data tables
ALTER TABLE jobs ADD COLUMN user_id UUID REFERENCES users(user_id);
```

**Every query filters by user_id**:
```rust
// User A only sees their own jobs
let jobs = sqlx::query_as!(
    Job,
    "SELECT * FROM jobs WHERE user_id = $1",
    user_id
)
.fetch_all(pool)
.await?;
```

**Shuttle users don't create accounts on Shuttle.rs** - they create accounts in YOUR application, stored in YOUR database. Shuttle just hosts the infrastructure.

**For detailed implementation**: See [Multi-User SaaS Conversion Plan](README_multi-user-saas-plan.md) (110-150 hours of work).

---

### Q4: How would I bill clients to recoup costs and make profit?

**A**: Integrate **Stripe** for subscription billing. Here's the complete model:

#### Cost Structure

**Free Tier Users**:
```
Compute (Shuttle): $0.00 (free tier covers ~100 users)
Database storage: ~$0.01/user/month
Email: $0.00 (SendGrid free tier)
TOTAL: ~$0.01/user/month
```

**Paid Tier Users** (Starter $9/month):
```
Compute: ~$0.10/user/month
Database: ~$0.05/user/month
Email: ~$0.01/user/month
Stripe fees: $0.30 + 2.9% = $0.56
TOTAL COST: ~$0.72/user/month
PROFIT: $9.00 - $0.72 = $8.28/user/month (92% margin!)
```

#### Suggested Pricing Tiers

```
Free:     $0/mo    → 10 jobs, 5 content generations/month (acquisition)
Starter:  $9/mo    → 100 jobs, 50 gens/month, Gmail integration
Pro:      $29/mo   → 1,000 jobs, 500 gens/month, all features
Enterprise: $99+/mo → Unlimited, white-label, SLA, priority support
```

#### Break-Even Analysis

**Monthly fixed costs**:
- Shuttle Pro: $20/month (needed at ~50 active users)
- Domain: $1/month
- Email service: $0 (free tier)
- **Total: $21/month**

**Break-even**: 3 Starter customers or 1 Pro customer

#### Revenue Projections

**Month 6 (Modest Success)**:
```
10 Starter ($9) = $90/month
2 Pro ($29) = $58/month
MRR: $148/month
Costs: $20/month
Profit: $128/month
```

**Month 12 (Good Traction)**:
```
50 Starter = $450/month
10 Pro = $290/month
2 Enterprise = $200/month
MRR: $940/month
Costs: $100/month
Profit: $840/month ($10,080/year)
```

**Year 2 (Breakout)**:
```
500 Starter = $4,500/month
100 Pro = $2,900/month
10 Enterprise = $1,000/month
MRR: $8,400/month
Costs: $1,000/month
Profit: $7,400/month ($88,800/year)
```

#### Recouping Development Costs

**Your time investment**:
- Single-user deployment: 2-4 hours
- Multi-user SaaS conversion: 110-150 hours
- Total: ~150 hours
- Value @ $50-150/hour: $7,500-$22,500

**Payback timeline**:
- At $128/month profit: 5-15 months
- At $840/month profit: 9-27 months
- At $7,400/month profit: 1-3 months

**Plus**: You own a business asset generating passive income!

#### When to Upgrade Shuttle

- **Free tier ($0)**: 0-50 active users
- **Pro tier ($20/mo)**: 50-500 active users → Upgrade at ~10 paying customers
- **Beyond Shuttle**: 500+ users → Railway ($50-200/mo) or Fly.io ($100-500/mo)

#### Stripe Integration

```rust
// backend/src/billing/stripe.rs
use stripe::{Client, Customer, Subscription};

pub async fn create_subscription(
    stripe_client: &Client,
    customer_email: &str,
    price_id: &str,  // "price_starter_monthly"
) -> Result<Subscription, Error> {
    // 1. Create Stripe customer
    let customer = Customer::create(
        stripe_client,
        CreateCustomer {
            email: Some(customer_email),
            ..Default::default()
        }
    ).await?;

    // 2. Create subscription
    let subscription = Subscription::create(
        stripe_client,
        CreateSubscription {
            customer: customer.id,
            items: vec![CreateSubscriptionItems {
                price: price_id.to_string(),
            }],
            ..Default::default()
        }
    ).await?;

    // 3. Store in your database
    sqlx::query!(
        "UPDATE users SET stripe_customer_id = $1, subscription_tier = 'starter' WHERE email = $2",
        customer.id.as_str(),
        customer_email
    )
    .execute(pool)
    .await?;

    Ok(subscription)
}
```

**Stripe webhooks** handle subscription lifecycle automatically (renewals, cancellations, failed payments).

#### Alternative: White-Label Licensing

Instead of SaaS, **license JobHunter to companies**:
- Career coaching firms: $2,000-5,000/year each
- Recruiting agencies: $5,000-10,000/year each
- Universities: $1,000-3,000/year each

**Pros**: Higher per-customer revenue, they host it themselves
**Cons**: Harder to find customers, no recurring visibility

**For complete implementation details**: See [Multi-User SaaS Conversion Plan](README_multi-user-saas-plan.md).

---

### Q5: Should I build the SaaS version or just deploy single-user?

**Recommendation**: Deploy single-user FIRST, then decide.

**Path 1: Portfolio Project (This Week)**
```
Week 1: Deploy to Shuttle (2-4 hours) ← START HERE
Week 2-8: Use for YOUR job search
Month 3+: Get hired with live demo on resume
Decision: Build SaaS after getting job? (optional)
```

**Path 2: Build SaaS (3-6 Months)**
```
Month 1: Deploy single-user + use it yourself
Month 2: Implement authentication (20-30 hours)
Month 3: Add data isolation (15-20 hours)
Month 4: Subscription tiers (20-25 hours)
Month 5: Stripe billing (25-35 hours)
Month 6: Launch publicly (30-40 hours)
Total: 110-150 hours
```

**Why single-user first**:
1. **Immediate portfolio value** (live demo for recruiters NOW)
2. **Validate the concept** (do people actually want this?)
3. **Job search is priority** (getting hired is goal #1)
4. **SaaS takes 6+ months** (to build + grow customer base)
5. **Can monetize later** (after you're employed and have time)

**When to build SaaS**:
- After you get a job (stable income)
- After 2-3 people ask "Can I use this?"
- When you have 20-40 hours/month free time
- When you want a side income stream

---

## References & Related Documentation

This deployment plan is part of a comprehensive documentation suite for JobHunter. Here are all available guides:

### 1. **[README_server-deploy-plan.md](README_server-deploy-plan.md)** (This Document)
**Detailed step-by-step guide to deploy JobHunter to production on Shuttle.rs + Vercel**
- Single-user deployment (free hosting)
- 10 implementation phases with copy-paste commands
- Time: 2-4 hours | Cost: $0/month
- Portfolio-ready with live demo URL

### 2. **[README_multi-user-saas-plan.md](README_multi-user-saas-plan.md)**
**Complete guide to convert JobHunter into a multi-tenant SaaS business**
- User authentication (JWT, OAuth, or Clerk.dev)
- Database schema changes for multi-user support
- Stripe subscription billing integration
- Pricing strategy and profit projections
- Time: 110-150 hours | Revenue: $1,000-10,000+/month potential

### 3. **[README_ci-cd-github-plan.md](README_ci-cd-github-plan.md)**
**Professional CI/CD pipeline with GitHub Actions and branch protection**
- Automated testing on every pull request
- Backend tests (Rust) + Frontend E2E tests (Playwright)
- Branch protection (main branch stays green)
- Status badges for README
- Time: 1-2 hours | Cost: $0 (free on public repos)

### 4. **[README_dmg-tauri-plan.md](README_dmg-tauri-plan.md)**
**Build native macOS desktop application using Tauri**
- Self-contained .app/.dmg installer
- SQLite embedded database (offline functionality)
- No server costs, runs locally
- Optional: Code signing with Apple Developer account
- Time: 6-9 hours | Cost: $0 (or $99/year for Apple code signing)

### Recommended Reading Order

**For Job Search** (immediate):
1. ✅ Read: README_server-deploy-plan.md (this document)
2. ✅ Execute: Deploy single-user version to Shuttle
3. ✅ Optional: Add CI/CD (README_ci-cd-github-plan.md)
4. ✅ Update resume with live demo URL
5. 🎯 Use JobHunter for your job search!

**For Monetization** (later, after getting hired):
1. ✅ Read: README_multi-user-saas-plan.md
2. ✅ Validate: Get 3-5 beta users interested
3. ✅ Execute: Implement authentication + billing (3-6 months)
4. ✅ Launch: Build customer base to $1,000+ MRR

**For Desktop Experience** (optional):
1. ✅ Read: README_dmg-tauri-plan.md
2. ✅ Execute: Build native macOS app (6-9 hours)
3. ✅ Use: Offline personal tool for daily job hunting

---

## Conclusion

You now have a complete, actionable plan to deploy JobHunter to production using Shuttle.rs and Vercel.

**Why This Plan Works**:
- ✅ Leverages Shuttle's Rust-native platform (perfect fit)
- ✅ Free hosting for both frontend and backend
- ✅ Simple deployment (no AWS complexity)
- ✅ Portfolio-ready with live demo
- ✅ Can upgrade to paid tiers later if needed
- ✅ Not locked in (can migrate to other platforms)

**Avoid**:
- ❌ Replit (not suitable for production Rust apps)
- ❌ AWS (overwhelming, overkill for this project)

**What Makes This Different from AWS**:
- One command deployment vs 20-step AWS process
- Transparent $0/month vs unpredictable AWS bills
- Built for developers vs built for enterprises
- 2 hours to deploy vs 2 days to configure AWS

---

Ready to deploy? Start with **Phase 0: Prerequisites & Setup** and work through sequentially. Good luck! 🚀

---

*Plan created: October 1, 2025*
*Platform: Shuttle.rs + Vercel*
*Based on: 2025 Rust deployment best practices and Shuttle.rs documentation*
