# Genesis CMS

> **The open-source headless CMS that gives you Directus-grade power with a Wix-grade experience — built on Next.js 16, Prisma, and PostgreSQL.**

Genesis CMS is a full-stack, self-hosted content management system engineered for developers who need a production-grade backend without the infrastructure overhead. Every collection you define becomes a real typed PostgreSQL table. Every API is auto-generated. Every workflow is visual.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature Matrix](#2-feature-matrix)
3. [System Architecture](#3-system-architecture)
4. [Database Architecture](#4-database-architecture)
5. [API Layer](#5-api-layer)
6. [GraphQL Engine](#6-graphql-engine)
7. [Flows — Automation Engine](#7-flows--automation-engine)
8. [Extensions — Plugin System](#8-extensions--plugin-system)
9. [Relationships](#9-relationships)
10. [Page Builder](#10-page-builder)
11. [Real-time & SSE](#11-real-time--sse)
12. [Workspaces](#12-workspaces)
13. [Media Transforms](#13-media-transforms)
14. [Analytics](#14-analytics)
15. [Security](#15-security)
16. [Authentication & Permissions](#16-authentication--permissions)
17. [Tech Stack](#17-tech-stack)
18. [Directory Structure](#18-directory-structure)
19. [Getting Started](#19-getting-started)
20. [Environment Variables](#20-environment-variables)
21. [Roadmap](#21-roadmap)

---

## 1. Overview

Genesis CMS is designed around one principle: **your data, your schema, your rules — without writing migrations by hand.**

When you create a collection called `Blog Posts`, Genesis:
- Runs `CREATE TABLE genesis_col_blog_posts (...)` in your Postgres database
- Auto-generates a REST endpoint at `/api/v1/blog_posts`
- Auto-generates GraphQL queries and mutations
- Provides a full CRUD data browser in the dashboard
- Fires your Flows automation on every record event

On top of the data layer sits a full page-building suite, multi-tenant workspace isolation, real-time SSE broadcasting, S3-compatible file storage, a job queue, and production-ready security hardening — all in one repo.

---

## 2. Feature Matrix

| Feature | Status | Notes |
|---|---|---|
| Dynamic collections → real Postgres tables | ✅ | DDL via raw SQL, not migrations |
| REST API (filter, sort, search, paginate) | ✅ | Directus-compatible query syntax |
| GraphQL API | ✅ | Auto-generated from live DB schema |
| DB Introspection | ✅ | Import existing Postgres tables as collections |
| Relationships (M2O, O2M, M2M) | ✅ | Junction tables auto-created |
| Flows automation | ✅ | Trigger → Condition → Action visual builder |
| Extensions plugin system | ✅ | Data transforms before save |
| Role-based permissions | ✅ | Per-collection read/create/update/delete |
| API Key management | ✅ | SHA-256 hashed, read or read_write |
| Webhooks | ✅ | Per-collection, per-event, with secret signing |
| Audit Log | ✅ | Full trail of all mutations |
| File uploads | ✅ | Local disk or S3/R2 + auto-thumbnail |
| Page builder | ✅ | Block-based visual editor, 12 block types |
| Style editor | ✅ | Per-block colors, fonts, padding, radius |
| Template library | ✅ | 5 pre-built page layouts |
| Form builder | ✅ | Contact forms → DB submissions |
| Navigation menus | ✅ | Drag-and-drop nav menus linked to Navbar blocks |
| SEO & publishing | ✅ | `seoTitle`, `seoDesc`, OpenGraph, Twitter card |
| Live Preview | ✅ | Real-time site preview inside dashboard |
| Real-time SSE | ✅ | Live notifications on save/publish/form submit |
| Multi-tenant workspaces | ✅ | Workspace isolation, members, plan tiers |
| Media transforms | ✅ | Sharp-powered resize/crop/format via API |
| Analytics & Insights | ✅ | Page views, form submissions, activity charts |
| Security hardening | ✅ | Proxy middleware, rate limiting, CORS, 401/407 gates |
| Cloud storage | ✅ | S3 / Cloudflare R2 abstraction layer |
| Redis pub/sub | ✅ | Multi-process SSE; falls back to in-process |
| Job queue | ✅ | BullMQ for webhooks, flows, email (requires Redis) |
| Structured logging | ✅ | Pino JSON logger, secrets redacted |
| Email notifications | ✅ | Resend integration for workspace invites |
| Sentry integration | ✅ | Error tracking (opt-in via DSN env var) |
| CI/CD pipeline | ✅ | GitHub Actions: lint → typecheck → build → deploy |
| Health check endpoint | ✅ | `/api/health` — DB + Redis + storage status |
| Migration Kit | ✅ | Import/export data between environments |
| Git Integration | ✅ | Sync config with GitHub repo |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Genesis CMS                                  │
│                     (Next.js 16 App Router)                          │
├──────────────────────────┬──────────────────────────────────────────┤
│       Dashboard UI       │            API Layer                       │
│   (React Server +        │                                            │
│    Client Components)    │  ┌──────────────────────────────────┐     │
│                          │  │  REST    /api/v1/[collection]     │     │
│  /collections            │  │  GraphQL /api/graphql             │     │
│  /pages                  │  │  Upload  /api/upload              │     │
│  /navigation             │  │  Forms   /api/forms               │     │
│  /forms                  │  │  SSE     /api/sse                 │     │
│  /workspaces             │  │  Media   /api/media/transform     │     │
│  /insights               │  │  Health  /api/health              │     │
│  /flows                  │  └──────────────────────────────────┘     │
│  /extensions             │                                            │
│  /files                  │       Proxy Middleware (proxy.ts)          │
│  /graphql                │  ┌──────────────────────────────────┐     │
│  /api-keys               │  │  Auth guard → 307/401            │     │
│  /webhooks               │  │  Rate limiting (per IP+route)    │     │
│  /audit                  │  │  CORS headers + OPTIONS          │     │
│  /settings               │  └──────────────────────────────────┘     │
│  /migrate                │                                            │
└──────────────────────────┴──────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
  ┌───────────▼──────┐   ┌────────────▼──────┐   ┌───────────▼──────┐
  │   Prisma ORM     │   │  Redis (optional)  │   │  Storage          │
  │  (fixed schema)  │   │                    │   │  local / S3 / R2  │
  └───────────┬──────┘   │  pub/sub for SSE   │   └──────────────────┘
              │           │  BullMQ job queue  │
  ┌───────────▼──────┐   └────────────────────┘
  │  PostgreSQL      │
  │  (Neon)          │
  │  Prisma tables   │
  │  Dynamic tables  │
  └──────────────────┘
```

### Request Lifecycle

```
Client Request
      │
      ▼
proxy.ts  ← rate limit | auth guard | CORS
      │
      ▼
Next.js Route Handler / Server Action
      │
      ├── authenticate()       ← session or API key
      ├── applyExtensions()    ← transform data before save
      ├── insertDynamicRow()   ← $queryRawUnsafe → PostgreSQL
      ├── fireWebhooks()       ← enqueue(BullMQ) or async fire
      ├── triggerFlows()       ← enqueue(BullMQ) or async run
      ├── broadcast()          ← Redis pub/sub or local SSE Set
      └── logAudit()           ← fire-and-forget
      │
      ▼
JSON / HTML / Stream Response
```

---

## 4. Database Architecture

**One PostgreSQL database. Two logical layers.**

```
PostgreSQL Database (Neon)
│
├─── LAYER 1: Prisma-Managed Tables (Fixed Schema)
│    ├── User               — CMS users, roles, auth
│    ├── Collection         — collection metadata
│    ├── Field              — field definitions
│    ├── Record             — legacy JSON blob store
│    ├── Relation           — M2O / O2M / M2M registry
│    ├── Flow + FlowRun     — automation definitions + history
│    ├── Extension          — installed plugin instances
│    ├── Webhook            — outbound webhook configs
│    ├── ApiKey             — hashed API keys
│    ├── Permission         — role-based per-collection ACL
│    ├── AuditLog           — immutable event trail
│    ├── File               — uploaded file metadata
│    ├── Page               — visual page builder pages + views
│    ├── NavMenu            — navigation menus
│    ├── FormSubmission     — contact form submissions
│    ├── Workspace          — multi-tenant workspaces
│    ├── WorkspaceMember    — workspace membership + roles
│    ├── Settings           — singleton site config
│    └── GitIntegration     — GitHub sync config
│
└─── LAYER 2: Dynamic Collection Tables (Raw DDL)
     ├── genesis_col_posts          — user-defined collection
     ├── genesis_col_products       — user-defined collection
     └── genesis_jxn_posts_tags     — M2M junction table
```

### CMS Field Type → PostgreSQL Column Type

| CMS Type | PostgreSQL |
|---|---|
| `text`, `textarea`, `email`, `url`, `password`, `select` | `TEXT` |
| `number` | `NUMERIC` |
| `boolean` | `BOOLEAN` |
| `date` | `DATE` |
| `datetime` | `TIMESTAMPTZ` |
| `json` | `JSONB` |
| `uuid` | `TEXT` |
| `relation` | `TEXT` (FK value stored as TEXT) |

---

## 5. API Layer

### REST API — `/api/v1/[collection]`

Requires `Authorization: Bearer <key>`.

```
GET    /api/v1/{collection}       → list (filter, sort, search, paginate, populate)
GET    /api/v1/{collection}/{id}  → single record
POST   /api/v1/{collection}       → create (read_write key)
PATCH  /api/v1/{collection}/{id}  → partial update (read_write key)
DELETE /api/v1/{collection}/{id}  → delete (read_write key)
```

**Query parameters**
```
?page=1 &limit=20 &sort=-createdAt &search=nextjs
&fields=id,title,slug &populate=true
&filter[status][_eq]=published
&filter[price][_gte]=100
```

**Filter operators:** `_eq`, `_neq`, `_lt`, `_lte`, `_gt`, `_gte`, `_contains`, `_null`, `_in`

**Rate limit:** 300 requests/min per IP.

---

## 6. GraphQL Engine

**Endpoint:** `POST /api/graphql` · **Auth:** `Authorization: Bearer <key>`

Schema is dynamically generated from live DB collections on every request. For each collection Genesis generates object types, list wrappers, input types, and CRUD queries/mutations. An in-dashboard GraphQL playground is available at `/graphql`.

---

## 7. Flows — Automation Engine

Visual automation pipelines triggered by data events.

**Triggers:** `record.create`, `record.update`, `record.delete`, `manual`

**Step types:** Condition (field check), Webhook (HTTP), Create Record, Log

**Template variables:** `{{fieldName}}` interpolation from the triggering record.

When Redis is configured, flow execution is offloaded to BullMQ with automatic retries (exponential backoff, 3 attempts). Without Redis, flows run synchronously in the request thread.

---

## 8. Extensions — Plugin System

Synchronous data-transform plugins that run **before** a record is saved. Chainable and composable.

| Plugin | What it does |
|---|---|
| 🔗 Auto Slug | `title` → `slug` on create |
| 📝 Word Count | Count words in a text field |
| 🔠 Auto Capitalize | Capitalize first letter |
| ⚙️ Set Defaults | Fill empty fields on create |
| ✂️ Trim Whitespace | Strip leading/trailing spaces |
| 📧 Lowercase Email | Force email field to lowercase |

---

## 9. Relationships

| Type | DDL | Use case |
|---|---|---|
| `m2o` | `ALTER TABLE posts ADD COLUMN author_id TEXT` | Post → Author |
| `o2m` | Virtual (inverse of M2O) | Author has many Posts |
| `m2m` | `CREATE TABLE genesis_jxn_{a}_{b}` | Posts ↔ Tags |

---

## 10. Page Builder

A visual, block-based page editor at `/pages/[id]`.

### Block types

| Block | Description |
|---|---|
| **Navbar** | Sticky nav with logo, links, CTA. Supports Navigation Menu dropdown |
| **Hero** | Full-width heading + subheading + CTA |
| **Features** | 1–3 column feature grid |
| **Testimonial** | Quote + author + role |
| **Text** | Rich freeform text |
| **Image** | Image with caption + alt |
| **Button** | Primary / outline / link variants |
| **Columns** | Two-column text layout |
| **Divider** | Horizontal rule |
| **Contact** | Email + phone + address |
| **Form** | Dynamic form builder → submissions stored in DB |
| **Footer** | Logo + links + copyright |

### Style editor

Every block has a **Style tab**: background color, text color, padding, font size, font weight, border radius. Changes apply per-block without touching code.

### Templates

5 pre-built page layouts: SaaS Landing, About Page, Contact Page, Blog Post, Portfolio.

### Navigation menus

Create drag-and-drop nav menus at `/navigation`. Menus can be linked to any Navbar block via a dropdown in the editor. Menu items support custom labels and URLs, including links to other published pages.

### Publishing & SEO

Each page has a status (`draft` / `published`). Published pages are served at `/site/[slug]` with full SSR, `seoTitle`, `seoDesc`, OpenGraph, and Twitter card meta. The site renderer tracks `pageViews` on each visit (fire-and-forget).

---

## 11. Real-time & SSE

Genesis broadcasts server-sent events to all connected dashboard clients.

**Endpoint:** `GET /api/sse` — streams `text/event-stream`

**Events:**

| Event | Trigger | Client action |
|---|---|---|
| `connected` | On SSE connect | Show green live dot |
| `page_saved` | `updatePageBlocks` | Toast + `router.refresh()` |
| `page_published` | `updatePageStatus` | Toast + `router.refresh()` |
| `form_submitted` | Form API route | Toast notification |

**Transport:**
- **Without Redis:** module-level `Set<Controller>` (single-process only)
- **With Redis (`REDIS_URL`):** Redis pub/sub — all server instances receive broadcasts

The `RealtimeProvider` component wraps the dashboard layout, auto-reconnects on disconnect (5s backoff), and shows slide-up toast notifications. A live status dot (green/amber/red) in the header shows connection state.

---

## 12. Workspaces

Multi-tenant workspace isolation at `/workspaces`.

- Create named workspaces with plan tiers (Free / Pro / Enterprise)
- Invite members by email with role (Owner / Admin / Member)
- Invitation sends a real HTML email via Resend (when `RESEND_API_KEY` is set)
- Active workspace stored in an `httpOnly` cookie (`genesis-ws`) — server actions filter `Page` and `NavMenu` queries by workspace
- Workspace switcher in the sidebar with inline create

---

## 13. Media Transforms

Sharp-powered image transformation via API.

```
GET /api/media/transform?src=/uploads/photo.jpg&w=800&h=600&q=85&f=webp
```

**Parameters:**

| Param | Type | Description |
|---|---|---|
| `src` | string | Must start with `/uploads/` |
| `w` | number | Target width (px) |
| `h` | number | Target height (px) |
| `q` | 1–100 | Quality (default: 85) |
| `f` | `webp`\|`jpeg`\|`png` | Output format (default: `webp`) |

Responses are streamed with `Cache-Control: public, max-age=31536000, immutable`.

A **Transform panel** in the Files manager lets you interactively set parameters, live-preview the result, and copy the generated URL.

Requires authentication. Only `/uploads/` paths are allowed (path traversal is blocked at the route handler).

---

## 14. Analytics

Real data at `/insights` — no mocking, no placeholders.

- **Page views** — incremented on every published page visit (fire-and-forget `pageViews` field on `Page`)
- **Top pages by views** — horizontal SVG bar chart
- **Form submissions by page** — bar chart
- **Content overview** — page counts, file count, storage used, audit event count
- **Recent activity feed** — last 8 audit log entries with icons, user, and relative time

---

## 15. Security

### Proxy middleware (`proxy.ts`)

Every request passes through `proxy.ts` before reaching route handlers:

| Check | Details |
|---|---|
| **Auth guard** | Dashboard pages → `307 /login`. Private API routes → `401 Unauthorized` |
| **Rate limiting** | In-memory sliding window per IP per route |
| **CORS** | `Access-Control-Allow-Origin` reflected on all `/api/*` responses |
| **OPTIONS preflight** | `204` with CORS headers |

**Rate limits:**

| Route | Limit |
|---|---|
| `/api/forms` | 10 req/min |
| `/api/upload` | 20 req/min |
| `/api/media/transform` | 60 req/min |
| `/api/v1/*` | 300 req/min |
| `/api/auth/*` | 20 req/min |

### Additional hardening

- Security response headers (HSTS, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy) via `next.config.ts`
- Upload: MIME type allowlist + 20 MB size cap
- Transform: path restricted to `/uploads/` only
- `lib/validate.ts`: `requireString`, `requireSlug`, `requireEmail`, `stripHtml` helpers
- Structured logging with automatic secret redaction (`password`, `token`, `secret` fields)

---

## 16. Authentication & Permissions

### Dashboard auth

NextAuth.js with credentials (email/password) and GitHub OAuth. Sessions are JWT-based.

### API auth

```
Authorization: Bearer sk-live-xxxxxxxxxxxxxxxxxxxxxxxx
                            │
                            ▼
                  SHA-256 hash → ApiKey table lookup
                            │
                  key.active === true?
                            │
                  read → GET only
                  read_write → POST / PATCH / DELETE
```

### Role-based permissions

| Permission | `viewer` | `editor` |
|---|---|---|
| `canRead` | ✅ | ✅ |
| `canCreate` | ❌ | ✅ |
| `canUpdate` | ❌ | ✅ |
| `canDelete` | ❌ | ❌ |

---

## 17. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Actions, Turbopack) |
| **Language** | TypeScript 5 (strict) |
| **ORM** | Prisma v6 |
| **Database** | PostgreSQL via Neon (serverless) |
| **Auth** | NextAuth.js v4 |
| **GraphQL** | graphql-yoga v5 + graphql v16 |
| **Styling** | Tailwind CSS v4 + CSS custom properties |
| **State** | Zustand v5 |
| **Real-time** | Server-Sent Events (SSE) + Redis pub/sub (ioredis) |
| **Job queue** | BullMQ (requires Redis) |
| **File storage** | Local disk or AWS S3 / Cloudflare R2 |
| **Image processing** | Sharp |
| **Email** | Resend |
| **Logging** | Pino (structured JSON) |
| **Error tracking** | Sentry (opt-in) |
| **Icons** | Lucide React |
| **CI/CD** | GitHub Actions |

---

## 18. Directory Structure

```
genesis-cms/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Fetches workspaces, wraps DashboardLayout
│   │   ├── error.tsx               # Dashboard-scoped error boundary
│   │   ├── collections/            # Collection list + detail + data browser
│   │   ├── pages/                  # Visual page builder
│   │   │   └── [id]/               # Block editor
│   │   ├── navigation/             # Navigation menu manager
│   │   ├── forms/                  # Form submissions viewer
│   │   ├── workspaces/             # Workspace management
│   │   ├── insights/               # Analytics dashboard
│   │   ├── files/                  # Media library + transform panel
│   │   ├── flows/                  # Automation builder
│   │   ├── extensions/             # Plugin gallery
│   │   ├── graphql/                # In-dashboard GraphQL playground
│   │   ├── api-keys/               # API key management
│   │   ├── webhooks/               # Webhook management
│   │   ├── audit/                  # Audit log viewer
│   │   ├── roles/                  # Permission matrix
│   │   ├── users/                  # User management
│   │   ├── settings/               # Site settings
│   │   ├── migrate/                # Migration kit
│   │   └── preview/                # Live site preview
│   │
│   ├── site/
│   │   ├── [slug]/page.tsx         # Published page renderer (SSR + page views)
│   │   └── _components/FormBlock.tsx
│   │
│   └── api/
│       ├── v1/[collection]/        # REST CRUD
│       ├── graphql/                # GraphQL endpoint
│       ├── upload/                 # File upload (auth required)
│       ├── forms/                  # Form submission (public)
│       ├── sse/                    # Server-sent events stream
│       ├── media/transform/        # Sharp image transform (auth required)
│       ├── health/                 # Health check
│       └── auth/[...nextauth]/
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx              # Live dot + notifications
│   │   ├── DashboardLayout.tsx
│   │   ├── WorkspaceSwitcher.tsx
│   │   └── CommandPalette.tsx
│   └── realtime/
│       └── RealtimeProvider.tsx    # SSE subscription + toast stack
│
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── db-dynamic.ts               # Raw SQL DDL/DML for dynamic tables
│   ├── db-introspect.ts            # information_schema reader
│   ├── sse.ts                      # broadcast() → publish()
│   ├── pubsub.ts                   # Redis pub/sub + local fallback
│   ├── redis.ts                    # ioredis singletons (pub, sub, client)
│   ├── queue.ts                    # BullMQ queue + worker factory
│   ├── storage.ts                  # uploadFile() / deleteStoredFile() abstraction
│   ├── email.ts                    # Resend integration
│   ├── logger.ts                   # Pino structured logger
│   ├── validate.ts                 # Input validation helpers
│   ├── ratelimit.ts                # In-memory sliding window rate limiter
│   ├── workspace-context.ts        # Cookie-based active workspace
│   ├── templates.ts                # Page builder template library
│   ├── auth.ts                     # NextAuth config
│   ├── utils.ts                    # cn, slugify, etc.
│   └── actions/
│       ├── collections.ts
│       ├── pages.ts                # + workspace filtering + broadcast
│       ├── navigation.ts           # + workspace filtering
│       ├── workspaces.ts           # + invite email
│       ├── insights.ts             # Real analytics queries
│       ├── files.ts                # + storage abstraction
│       ├── forms.ts
│       ├── flows.ts
│       ├── webhooks.ts
│       ├── audit.ts
│       └── ...
│
├── prisma/
│   └── schema.prisma
│
├── proxy.ts                        # Next.js 16 proxy middleware
├── sentry.client.config.ts
├── sentry.server.config.ts
├── next.config.ts
├── .env.example
├── .github/
│   └── workflows/ci.yml            # lint → typecheck → build → deploy
└── public/
    └── uploads/                    # Local file storage (dev / single-server)
```

---

## 19. Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon free tier works)
- (Optional) Redis for SSE multi-process mode and job queue
- (Optional) AWS S3 / Cloudflare R2 for cloud file storage

### Installation

```bash
git clone https://github.com/your-org/genesis-cms
cd genesis-cms
npm install
```

### Database Setup

```bash
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL

npx prisma db push
npx prisma generate
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

On first run, create your admin account at `/signup`. Subsequent registrations require admin approval.

### Health check

```bash
curl http://localhost:3000/api/health
# {"status":"healthy","checks":{"database":"ok","storage":"ok"},"ts":"..."}
```

---

## 20. Environment Variables

```env
# ── Database ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# ── Auth ──────────────────────────────────────────────────────────────
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate with: openssl rand -base64 32"

# Optional — GitHub OAuth
GITHUB_ID=""
GITHUB_SECRET=""

# ── Storage (default: local disk) ─────────────────────────────────────
STORAGE_PROVIDER="local"          # "local" | "s3"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_BUCKET=""
AWS_ENDPOINT=""                   # Cloudflare R2 or MinIO endpoint
CDN_URL=""                        # e.g. https://cdn.yourdomain.com

# ── Redis (enables multi-process SSE + BullMQ job queue) ──────────────
REDIS_URL=""                      # e.g. redis://localhost:6379

# ── Email ─────────────────────────────────────────────────────────────
RESEND_API_KEY=""
EMAIL_FROM="Genesis CMS <noreply@yourdomain.com>"

# ── Monitoring ────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_DSN=""
SENTRY_ORG=""
SENTRY_PROJECT=""

# ── CORS ──────────────────────────────────────────────────────────────
CORS_ORIGIN="*"                   # Restrict in prod: "https://your-app.com"

# ── Logging ───────────────────────────────────────────────────────────
LOG_LEVEL="info"                  # "debug" | "info" | "warn" | "error"
```

---

## 21. Roadmap

All 23 phases complete.

| Phase | Feature | Status |
|---|---|---|
| 1 | Dynamic real DB tables per collection | ✅ |
| 2 | DB introspection — import existing tables | ✅ |
| 3 | Relationships — M2O, O2M, M2M | ✅ |
| 4 | Advanced REST API — filter, sort, search, paginate | ✅ |
| 5 | GraphQL endpoint — auto-generated schema | ✅ |
| 6 | Flows — visual automation builder | ✅ |
| 7 | Extensions — plugin system | ✅ |
| 8 | Drag & drop block reordering in page editor | ✅ |
| 9 | Style editor — colors, fonts, spacing per block | ✅ |
| 10 | Template library — 5 pre-built page layouts | ✅ |
| 11 | SEO & publishing — seoTitle, seoDesc, OpenGraph | ✅ |
| 12 | Form builder — contact forms → DB submissions | ✅ |
| 13 | Multi-page navigation — menus, page links | ✅ |
| 14 | Real-time — SSE live updates across dashboard | ✅ |
| 15 | Multi-tenant workspaces — members, plans, isolation | ✅ |
| 16 | Media transforms — Sharp resize/crop/format API | ✅ |
| 17 | Insights & Analytics — real page views + charts | ✅ |
| 18 | Security hardening — proxy, rate limiting, CORS | ✅ |
| 19 | Cloud storage — S3 / Cloudflare R2 abstraction | ✅ |
| 20 | Redis layer — pub/sub SSE + BullMQ job queue | ✅ |
| 21 | Reliability — Pino logging, error boundaries, health check | ✅ |
| 22 | Workspace data isolation — workspaceId on content tables | ✅ |
| 23 | Notifications & ops — Resend email, Sentry, GitHub Actions CI | ✅ |

---

## License

MIT © Genesis CMS Contributors

---

*Built with Next.js · Powered by PostgreSQL · Hosted on Neon*
