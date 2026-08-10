# InsureMithra — Insurance Workflow Automation System

[![CI/CD](https://github.com/pestechnology/PESU_RR_CSE_D_P04_Insurance_workflow_automation_software_InsureMithra/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/pestechnology/PESU_RR_CSE_D_P04_Insurance_workflow_automation_software_InsureMithra/actions/workflows/ci-cd.yml)
![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/mongodb-7.x-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

A full-stack MERN application that automates the end-to-end insurance lifecycle — policy discovery, comparison, purchase, renewal, and claims — with role-based administration, observability, and an automated CI/CD quality pipeline.

Built as the semester project for **UE23CS341A — Software Engineering**, PES University (RR Campus), by team **InsureMithra**.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Operations](#operations)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development Workflow](#development-workflow)
- [Team](#team)
- [License](#license)

---

## Overview

Buying and maintaining an insurance policy usually means paperwork, phone calls, and waiting. InsureMithra replaces that with a self-service web application where a customer can:

1. **Search and filter** two-wheeler, four-wheeler, health, life, and travel policies
2. **Compare** up to several policies side by side on premium, coverage, benefits, and exclusions
3. **Purchase** a policy through a sandboxed payment flow and receive a generated PDF receipt
4. **Renew** an expiring policy, with eligibility checks and an automatic confirmation email
5. **File a claim** with supporting documents and track its status through review to settlement

Administrators get a separate surface for user management, claim adjudication, uptime history, and backup control. The whole system is backed by a six-stage CI pipeline that gates every push on tests, a 70% coverage floor, lint cleanliness, and security scanning.

---

## Features

### Authentication & Identity
- JWT-based registration and login with `bcryptjs` password hashing (12 rounds)
- Password reset over email with expiring, single-use tokens
- Token format validation and a server-side token blacklist for logout/revocation
- Failed-login tracking and account activation state
- Rate limiting on all `/api/auth` routes (strict in production, lenient in development)

### Policy Discovery
- Full-text policy search with filtering by type, insurer, and premium range
- Side-by-side policy comparison endpoint
- Detailed policy view with benefits, exclusions, tenure, and coverage breakdown
- Responses cached with tuned per-route TTLs (60s search, 300s detail)

### Purchase & Renewal
- Sandboxed payment flow with generated transaction IDs and `initiated → processing → success/failed` state machine
- Automatic policy-document PDF generation via `pdfkit`, downloadable from the dashboard
- Renewal eligibility checks against expiry date and renewal status
- Post-renewal confirmation email with the new expiry date, plus an audit entry in `logs/renewals.log`

### Claims
- Claim submission with multipart document upload (PDF/JPEG/PNG, ≤ 5 MB, up to 5 files)
- Human-readable claim IDs in `CLM-YYYYMMDD-XXXX` format
- Status lifecycle: `Submitted → Under Review → Approved / Rejected → Closed`
- Full status-change history with the acting admin recorded on every transition
- Email notification to the claimant on each status change

### Role-Based Access Control
- `authorizeRoles(...roles)` and `requireAdmin` middleware layered on top of JWT authentication
- Admin-only surfaces for user management, claim review, downtime history, and backups
- Self-protection: admins cannot change their own role or deactivate their own account
- Every granted and denied access attempt is written to `logs/audit.log`

### Performance & Caching
- Redis-backed cache service with an automatic in-memory LRU fallback when Redis is unavailable
- Gzip compression for responses over 1 KB
- Per-request timing middleware exposing p50/p95/p99 latency and a slow-request log
- `Cache-Control` strategy for static assets: one year for content-hashed files, one hour otherwise
- `autocannon` load-test harness for the search and details endpoints

### Reliability & Operations
- Health probe every 10 minutes; downtime alert fires when a service is unreachable for over 5 minutes
- Downtime events persisted to MongoDB and `logs/downtime.log`, with email/webhook alerting
- Nightly MongoDB + uploads backup at 00:00 with a 3-day retention window
- Restore workflow with a verification pass over the most recent backups
- Admin API and UI to browse downtime history, list backups, and trigger a backup or restore on demand

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Material UI 7, React Router 6, Axios |
| Backend | Node.js 20, Express 4 |
| Database | MongoDB 6/7 with Mongoose 7 |
| Cache | Redis (`ioredis`) with `lru-cache` fallback |
| Auth | JSON Web Tokens, `bcryptjs` |
| Files & Docs | Multer (uploads), PDFKit (policy documents) |
| Email | Nodemailer over SMTP |
| Scheduling | `node-cron` |
| Logging | Winston (application, audit, downtime, renewal, backup channels) |
| Testing | Jest, Supertest, `mongodb-memory-server`, React Testing Library |
| Quality | ESLint 9, Pylint, npm audit, TruffleHog, Bandit |
| Load testing | autocannon, Lighthouse |
| CI/CD | GitHub Actions |

---

## Architecture

```
┌──────────────────────────────┐
│  React 19 SPA (TypeScript)   │
│  MUI · React Router · Axios  │
└──────────────┬───────────────┘
               │ REST / JSON  (Bearer JWT)
┌──────────────▼───────────────────────────────────────┐
│                  Express API                          │
│                                                       │
│  helmet · cors · compression · rate-limit · morgan    │
│  ─────────────────────────────────────────────────    │
│  authenticate → authorizeRoles → cache → controller   │
│  ─────────────────────────────────────────────────    │
│  auth · profile · policies · purchases · renewals ·   │
│  claims · admin                                       │
└───┬────────────┬─────────────┬────────────┬───────────┘
    │            │             │            │
┌───▼────┐  ┌────▼────┐  ┌─────▼─────┐  ┌───▼────────┐
│MongoDB │  │  Redis  │  │ Local FS  │  │  SMTP      │
│(Mongoose)│ │ (LRU    │  │ uploads/  │  │ (Nodemailer│
│        │  │ fallback)│ │ receipts/ │  │  alerts &  │
│        │  │         │  │ backups/  │  │  receipts) │
└────────┘  └─────────┘  └───────────┘  └────────────┘

        node-cron schedulers
        ├── downtimeMonitor  — health probe every 10 min
        └── backupScheduler  — nightly dump at 00:00, 3-day retention
```

**Request pipeline.** Every protected request passes through `authenticate` (JWT verification and blacklist check), then optional `authorizeRoles` for admin surfaces, then a route-specific cache middleware that serves a hit directly, and finally the controller. `timingMiddleware` wraps the whole chain and records latency for `/api/health/perf`.

**Cache strategy.** `services/cache.service.js` prefers Redis when `REDIS_URL` is set and reachable, and transparently degrades to an in-process LRU cache otherwise — so the application runs identically with or without a Redis instance.

### Data Model

| Collection | Purpose | Key fields |
| --- | --- | --- |
| `users` | Accounts and roles | `email`, `password` (hashed), `role`, `isActive`, `isEmailVerified`, `failedLoginAttempts` |
| `policies` | Policy catalogue | `type` (2W/4W/Health/Life/Travel), `insurer`, `premium`, `coverage`, `benefits`, `exclusions` |
| `purchases` | Issued policies | `transactionId`, `status`, `policyNumber`, `pdfPath`, `expiryDate`, `renewalStatus` |
| `renewals` | Renewal transactions | `transactionId`, `status`, `oldExpiryDate`, `newExpiryDate`, `gatewayReceipt` |
| `claims` | Claims and documents | `claimId`, `status`, `documents[]`, `statusHistory[]`, `reviewedBy` |
| `downtimes` | Outage records | `service`, `startAt`, `endAt`, `durationMs`, `alertSent` |

---

## Getting Started

### Prerequisites

| Requirement | Version |
| --- | --- |
| Node.js | 20.x (18+ works) |
| MongoDB | 6.0+ running locally or a connection URI |
| npm | 9+ |
| Redis | *Optional* — the cache falls back to in-memory LRU |

### Installation

```bash
git clone https://github.com/pestechnology/PESU_RR_CSE_D_P04_Insurance_workflow_automation_software_InsureMithra.git
cd PESU_RR_CSE_D_P04_Insurance_workflow_automation_software_InsureMithra

# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### Configuration

```bash
cp .env.example .env
```

Fill in `.env` — nothing in it is optional except the Redis and benchmarking blocks:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API port (the frontend dev server proxies here) | `5001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/insuremithra` |
| `JWT_SECRET` | Signing secret for access tokens | *(required)* |
| `JWT_EXPIRES_IN` | Token lifetime | `24h` |
| `SMTP_HOST` / `SMTP_PORT` | Mail server for resets, receipts, and alerts | `smtp.gmail.com` / `587` |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (use an app-specific password) | *(required)* |
| `REDIS_URL` | Redis endpoint; leave empty to use the LRU fallback | — |
| `CACHE_*_TTL` | Per-route cache lifetimes in seconds | 300 / 60 / 300 / 30 / 30 |
| `ENABLE_COMPRESSION` | Gzip toggle | `true` |
| `UPLOAD_DIR` / `MAX_FILE_SIZE` | Claim document storage | `uploads` / `5242880` |
| `MONITOR_INTERVAL_MINUTES` | Health-probe frequency | `10` |
| `DOWN_ALERT_THRESHOLD_MS` | Downtime before an alert fires | `300000` |
| `FRONTEND_URL` | Origin used in emailed links | `http://localhost:3000` |
| `BCRYPT_ROUNDS` | Password hashing cost | `12` |

Verify the environment before starting:

```bash
npm run env-check
```

> **Never commit a populated `.env`.** It is git-ignored; `.env.example` holds placeholders only.

### Running

Start MongoDB, then run the API and the SPA in two terminals:

```bash
# Terminal 1 — API on http://localhost:5001
npm run dev          # nodemon, hot reload
# or: npm start      # plain node

# Terminal 2 — SPA on http://localhost:3000
cd frontend && npm start
```

`npm run server` boots the alternative `server.js` entry point, which mounts the full `app.js` middleware stack and starts the backup scheduler — use it when exercising scheduled jobs.

Seed the policy catalogue for a usable first run:

```bash
node utils/seed_policies.js
```

Health check: <http://localhost:5001/api/health> · Performance metrics: <http://localhost:5001/api/health/perf>

---

## API Reference

All protected routes expect `Authorization: Bearer <token>`. Base URL: `http://localhost:5001`.

### Authentication — `/api/auth`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/register` | Public | Create an account |
| `POST` | `/login` | Public | Authenticate and receive a JWT |
| `POST` | `/logout` | User | Blacklist the current token |
| `GET` | `/me` | User | Current user profile |
| `POST` | `/forgot-password` | Public | Send a reset link |
| `POST` | `/reset-password` | Public | Redeem a reset token |
| `GET` | `/verify-email/:token` | Public | Confirm an email address |

### Profile & Admin Users — `/api/profile`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | User | Fetch own profile |
| `PUT` | `/` | User | Update own profile |
| `POST` | `/change-password` | User | Change password |
| `POST` | `/deactivate` | User | Deactivate own account |
| `GET` | `/activity-log` | User | Recent account activity |
| `GET` | `/admin/users` | Admin | List all users |
| `GET` | `/admin/users/:userId` | Admin | User detail |
| `PUT` | `/admin/users/:userId/role` | Admin | Change a user's role |
| `PUT` | `/admin/users/:userId/status` | Admin | Activate/deactivate a user |
| `GET` | `/admin/stats` | Admin | System-wide statistics |

### Policies — `/api/policies`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/search` | User | Search and filter the catalogue *(cached 60s)* |
| `GET` | `/:id` | User | Policy detail *(cached 300s)* |
| `POST` | `/compare` | User | Compare policies side by side |

### Purchases — `/api/purchases`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/initiate` | User | Begin a sandbox purchase |
| `POST` | `/complete` | User | Settle payment and issue the policy |
| `GET` | `/my` | User | Own purchases *(cached 30s)* |
| `GET` | `/:id` | User | Purchase detail |
| `GET` | `/:id/download` | User | Download the generated policy PDF |

### Renewals — `/api/renewals`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/eligibility/:purchaseId` | User | Check renewal eligibility |
| `POST` | `/initiate` | User | Start a renewal transaction |
| `GET` | `/my` | User | Own renewal history |
| `GET` | `/:renewalId` | User | Renewal status |

### Claims — `/api/claims`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/` | User | Submit a claim with up to 5 documents |
| `GET` | `/my` | User | Own claims *(cached 30s)* |
| `GET` | `/:claimId` | User | Claim detail and status history |
| `GET` | `/:claimId/documents/:filename` | User | Download a claim document |
| `GET` | `/admin` | Admin | All claims across users |
| `PUT` | `/:id/status` | Admin | Advance the claim status |

### Administration — `/api/admin`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/downtimes` | Admin | Outage history |
| `GET` | `/downtimes/stats` | Admin | Uptime statistics |
| `GET` | `/downtimes/monitor/config` | Admin | Monitor configuration |
| `POST` | `/downtimes/test` | Admin | Trigger a synthetic downtime event |
| `GET` | `/backups` | Admin | List available backups |
| `POST` | `/backups/run` | Admin | Trigger a backup immediately |
| `POST` | `/backups/restore` | Admin | Restore from a chosen backup |
| `GET` | `/backups/download/:name` | Admin | Download a backup archive |

### System

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe |
| `GET` | `/api/health/perf` | Latency percentiles, slow requests, cache hit rate |

Full request and response payloads are in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## Testing

The suite spans unit tests for utilities and services, integration tests over the Express app via Supertest, and performance assertions — running against an ephemeral `mongodb-memory-server` instance, so no local database is required.

```bash
npm test                    # full backend suite
npm run test:watch          # watch mode
npm run coverage:backend    # coverage report in coverage/
npm run test:renewal        # renewal module, scoped coverage
npm run test:downtime       # downtime monitoring, scoped coverage

cd frontend && npm test     # React Testing Library suite
```

**Coverage areas**

| Suite | Focus |
| --- | --- |
| `tests/auth.test.js` | Registration, login, token issuance, reset flow |
| `tests/rbac.test.js`, `tests/roleAuth.test.js` | Role enforcement, 401/403 boundaries, audit logging |
| `tests/passwordHash.test.js`, `tests/jwtValidation.test.js` | Hashing correctness, token tampering |
| `tests/renewal.test.js`, `tests/renewalNotification.test.js` | Eligibility, payment states, confirmation email |
| `tests/claimStatus.test.js` | Claim status transitions and history |
| `tests/perf.cache.test.js`, `tests/perf.latency.test.js` | Cache hit/miss behaviour, latency budgets |
| `tests/backup.test.js` | Backup creation, retention, restore validation |
| `tests/downtime.test.js` | Probe logic, alert thresholds, log persistence |
| `tests/unit/**` | Controllers, services, ID generators, PDF generation, upload filters |

Load testing:

```bash
npm run bench:search     # autocannon against /api/policies/search
npm run bench:details    # autocannon against /api/policies/:id
```

Results land in `benchmarks/` as timestamped JSON. See [PERFORMANCE.md](PERFORMANCE.md).

---

## CI/CD Pipeline

Every push and pull request on any branch runs [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml). The stages run in sequence — a failure anywhere stops the pipeline.

```
build ──▶ test ──▶ coverage ──▶ lint ──▶ security
```

| Stage | What it does | Gate |
| --- | --- | --- |
| **Build** | Installs backend and frontend dependencies on Node 20 | Clean `npm ci` |
| **Test** | Runs backend Jest suites against a live MongoDB 6.0 service plus the frontend suite | All tests pass; JUnit XML uploaded |
| **Coverage** | Generates backend and frontend coverage and combines them | **≥ 70%** combined, enforced by `scripts/check-coverage-threshold.mjs` |
| **Lint** | ESLint across the backend, CRA production build for the frontend, Pylint where Python exists | 0 ESLint errors, < 10 warnings; Pylint ≥ 7.5 |
| **Security** | `npm audit` (high+ backend, moderate+ frontend), TruffleHog secret scan, Bandit and Safety for Python | No high-severity advisories; no committed secrets |

Reports for every stage are uploaded as workflow artifacts. The deployment job that packages a versioned `.zip` is present but commented out — the project is CI-gated rather than continuously deployed.

Run the same gates locally before pushing:

```bash
npm run lint
npm run security:audit
npm run coverage:backend
```

---

## Operations

### Backup & Restore

A `node-cron` job dumps MongoDB and the `uploads/` tree to `backups/` nightly at 00:00, keeping the last three days. Set `DISABLE_BACKUP_SCHEDULER=true` to turn it off.

```bash
npm run verify:backups     # validate the most recent archives
```

Admins can list, trigger, download, and restore backups from `/admin/backups` in the UI or the `/api/admin/backups/*` endpoints. Details in [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

### Downtime Monitoring

A scheduled probe checks service health every `MONITOR_INTERVAL_MINUTES` (default 10). Once a service has been unreachable for longer than `DOWN_ALERT_THRESHOLD_MS` (default 5 minutes), a downtime record opens, an email — and an optional webhook — alert fires, and the event is appended to `logs/downtime.log`. Recovery closes the record and sends a follow-up.

```bash
npm run monitor:test       # run one health check immediately
```

History and uptime statistics are available at `/admin` in the UI. Details in [DOWNTIME_MONITORING.md](DOWNTIME_MONITORING.md).

### Logs

| File | Contents |
| --- | --- |
| `logs/audit.log` | Every granted and denied access attempt on protected routes |
| `logs/claims.log` | Claim submissions and status transitions |
| `logs/renewals.log` | Renewal confirmations |
| `logs/downtime.log` | Outage and recovery events |
| `logs/backup.log` | Backup and restore operations |
| `logs/perf.log` | Request timing samples |

---

## Project Structure

```
.
├── app.js                    # Express app: middleware chain, route mounting
├── server.js                 # Entry point — app.js + schedulers
├── start-server.js           # Development entry point (npm start / npm run dev)
├── config/
│   ├── logger.js             # Winston channels + auditLog helpers
│   └── mailer.js             # Nodemailer transport
├── controllers/              # auth · policy · purchase · renewal · claim · profile
├── middleware/
│   ├── auth.js               # JWT verification + blacklist check
│   ├── roleAuth.js           # authorizeRoles / requireAdmin + audit
│   ├── cache.middleware.js   # Per-route response caching
│   ├── timing.middleware.js  # Latency instrumentation
│   └── upload.js             # Multer config, type and size filters
├── models/                   # user · policy · purchase · renewal · claim · downtime
├── routes/                   # One router per domain, mounted under /api
├── services/
│   ├── cache.service.js      # Redis with LRU fallback
│   ├── payment.service.js    # Sandbox payment gateway
│   ├── storage.service.js    # Claim document persistence
│   ├── health.service.js     # Probe execution
│   ├── downtime.service.js   # Outage record lifecycle
│   ├── alert.service.js      # Email / webhook alerting
│   ├── backup.service.js     # Dump + retention
│   ├── restore.service.js    # Restore + verification
│   └── tokenBlacklist.service.js
├── scheduler/                # downtimeMonitor · backupScheduler (node-cron)
├── utils/                    # PDF generation, ID generators, renewal maths, seeds
├── scripts/                  # CI gates, Jest setup, env check, mail helpers
├── tools/                    # autocannon load tests, ZAP scan, backup verification
├── tests/                    # Integration suites + tests/unit/**
├── frontend/
│   └── src/
│       ├── pages/            # 20 screens — auth, policies, purchase, claims, admin
│       ├── components/       # ProtectedRoute
│       ├── contexts/         # Auth context
│       └── services/         # Axios API layer
└── .github/workflows/        # ci-cd.yml
```

---

## Documentation

| Document | Contents |
| --- | --- |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Full endpoint reference with payloads |
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Administrator workflows |
| [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) | Wiring the SPA to the API |
| [PERFORMANCE.md](PERFORMANCE.md) · [PERFORMANCE_QUICKREF.md](PERFORMANCE_QUICKREF.md) | Caching design, benchmarks, tuning |
| [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) | Hardening measures and verification steps |
| [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Backup schedule, retention, restore runbook |
| [DOWNTIME_MONITORING.md](DOWNTIME_MONITORING.md) | Probe configuration and alerting |
| [POLICY_RENEWAL_GUIDE.md](POLICY_RENEWAL_GUIDE.md) · [HOW_TO_TEST_RENEWAL.md](HOW_TO_TEST_RENEWAL.md) | Renewal flow and manual test plan |
| [BRANCH_WORKFLOW.md](BRANCH_WORKFLOW.md) | Branching and review conventions |

---

## Development Workflow

The project follows an Agile process across four epics, with one branch per user story.

**Branches**

| Branch | Role |
| --- | --- |
| `main` | Production-ready, release-tagged code |
| `develop` | Integration branch — all stories merge here first |
| `feature/*` | One branch per user story |
| `bugfixes-*` | Fixes against an integrated story |

**Commit convention** — `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:`, `chore:`, with the Jira story ID where applicable (e.g. `IN35: Performance Improvements & Caching`).

**Review process** — branch from `develop`, open a PR using the [template](.github/pull_request_template.md), pass all five CI stages, obtain a review from a [CODEOWNER](.github/CODEOWNERS), then squash into `develop`. `develop` is promoted to `main` at the end of each release.

---

## Team

**InsureMithra** — PES University, RR Campus · CSE Section D · Project P04

| Member | Role |
| --- | --- |
| [@suman184](https://github.com/suman184) | Scrum Master |
| [@dishan-d](https://github.com/dishan-d) | Developer |
| [@DhruvJ12421](https://github.com/DhruvJ12421) | Developer |
| [@HarshaaVardhanaKV](https://github.com/HarshaaVardhanaKV) | Developer |

**Faculty Supervisor** — [@sapnavm](https://github.com/sapnavm)

**Teaching Assistants** — [@Crashbadger24](https://github.com/Crashbadger24) · [@Srujkul](https://github.com/Srujkul) · [@srishmath](https://github.com/srishmath)

---

## License

Released under the [MIT License](LICENSE). Developed for educational purposes as part of the UE23CS341A curriculum at PES University.
