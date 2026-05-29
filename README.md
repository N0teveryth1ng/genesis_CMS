# Genesis CMS

> **The open-source headless CMS that gives you Directus-grade power with a Wix-grade experience — built on Next.js 15, Prisma, and PostgreSQL.**

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
10. [Authentication & Permissions](#10-authentication--permissions)
11. [Tech Stack](#11-tech-stack)
12. [Directory Structure](#12-directory-structure)
13. [Getting Started](#13-getting-started)
14. [Environment Variables](#14-environment-variables)
15. [Roadmap](#15-roadmap)

---

## 1. Overview

Genesis CMS is designed around one principle: **your data, your schema, your rules — without writing migrations by hand.**

When you create a collection called `Blog Posts`, Genesis:
- Runs `CREATE TABLE genesis_col_blog_posts (...)` in your Postgres database
- Auto-generates a REST endpoint at `/api/v1/blog_posts`
- Auto-generates GraphQL queries and mutations
- Provides a full CRUD data browser in the dashboard
- Fires your Flows automation on every record event

No YAML. No custom DSLs. Just a UI and real SQL.

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
| Extensions plugin system | ✅ | Data transforms before save (slug, wordcount, etc.) |
| Role-based permissions | ✅ | Per-collection read/create/update/delete |
| API Key management | ✅ | SHA-256 hashed, read or read_write |
| Webhooks | ✅ | Per-collection, per-event, with secret signing |
| Audit Log | ✅ | Full trail of all mutations |
| File uploads | ✅ | Local disk + auto-thumbnail generation |
| Page builder | ✅ | Block-based visual page editor |
| Live Preview | ✅ | Real-time site preview inside dashboard |
| Git Integration | ✅ | Sync config with GitHub repo |
| Migration Kit | ✅ | Import/export data between environments |
| Multi-tenant | 🔜 | Phase 15 — schema-per-tenant |
| Media transforms | 🔜 | Phase 16 — on-the-fly resize/crop |
| Analytics | 🔜 | Phase 17 — real usage metrics |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Genesis CMS                              │
│                    (Next.js 15 App Router)                       │
├────────────────────────┬────────────────────────────────────────┤
│      Dashboard UI      │           API Layer                     │
│   (React Server +      │                                         │
│    Client Components)  │  ┌─────────────────────────────────┐   │
│                        │  │  REST  /api/v1/[collection]      │   │
│  /collections          │  │  REST  /api/v1/[collection]/[id] │   │
│  /collections/[id]     │  │  GraphQL  /api/graphql           │   │
│  /collections/[id]/data│  │  Upload   /api/upload            │   │
│  /flows                │  │  Auth     /api/auth/[...]        │   │
│  /flows/[id]           │  └─────────────────────────────────┘   │
│  /extensions           │                                         │
│  /graphql              │           Server Actions                │
│  /api-keys             │  ┌─────────────────────────────────┐   │
│  /webhooks             │  │  collections.ts  records CRUD   │   │
│  /audit                │  │  flows.ts        flow mgmt      │   │
│  /files                │  │  extensions.ts   plugin mgmt    │   │
│  /pages                │  │  webhooks.ts     webhook fire   │   │
│  /settings             │  │  audit.ts        event logging  │   │
│  /migrate              │  │  relations.ts    FK mgmt        │   │
│  /roles                │  └─────────────────────────────────┘   │
└────────────────────────┴────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │         Prisma ORM             │
                    │   (schema-managed models)      │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      PostgreSQL (Neon)          │
                    │                                │
                    │  Prisma tables (fixed schema)  │
                    │  Dynamic tables (raw DDL)       │
                    └────────────────────────────────┘
```

### Request Lifecycle

```
Client Request
      │
      ▼
Next.js Edge / Node Runtime
      │
      ├── API Route Handler
      │         │
      │         ├── authenticate()      ← SHA-256 API key lookup
      │         │
      │         ├── applyExtensions()   ← transform data (before save)
      │         │
      │         ├── insertDynamicRow() / updateDynamicRow()
      │         │         │
      │         │         └── $queryRawUnsafe → PostgreSQL
      │         │
      │         ├── fireWebhooks()      ← async, fire-and-forget
      │         ├── triggerFlows()      ← async, fire-and-forget
      │         └── logAudit()          ← async, fire-and-forget
      │
      └── JSON Response
```

---

## 4. Database Architecture

**One PostgreSQL database. Two logical layers.**

```
PostgreSQL Database (Neon)
│
├─── LAYER 1: Prisma-Managed Tables (Fixed Schema)
│    │
│    ├── "User"           — CMS users, roles, auth
│    ├── "Collection"     — collection metadata (name, label, icon, tableName)
│    ├── "Field"          — field definitions per collection
│    ├── "Record"         — legacy JSON blob store (pre-v1 compat only)
│    ├── "Relation"       — M2O / O2M / M2M relationship registry
│    ├── "Flow"           — automation flow definitions
│    ├── "FlowRun"        — execution history with logs
│    ├── "Extension"      — installed plugin instances
│    ├── "Webhook"        — outbound webhook configs
│    ├── "ApiKey"         — hashed API keys
│    ├── "Permission"     — role-based per-collection permissions
│    ├── "AuditLog"       — immutable event trail
│    ├── "File"           — uploaded file metadata
│    ├── "Page"           — visual page builder pages
│    ├── "Settings"       — singleton site config
│    └── "GitIntegration" — GitHub sync config
│
└─── LAYER 2: Dynamic Collection Tables (Raw DDL)
     │
     ├── "genesis_col_posts"
     │    ├── id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()
     │    ├── created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     │    ├── updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     │    ├── title       TEXT
     │    ├── body        TEXT
     │    ├── slug        TEXT
     │    └── status      TEXT
     │
     ├── "genesis_col_products"
     │    ├── id, created_at, updated_at
     │    ├── name        TEXT
     │    ├── price       NUMERIC
     │    └── in_stock    BOOLEAN
     │
     └── "genesis_jxn_posts_tags"   ← M2M junction table
          ├── id          TEXT PRIMARY KEY
          ├── post_id     TEXT NOT NULL
          └── tag_id      TEXT NOT NULL
```

### CMS Type → PostgreSQL Column Type

| CMS Field Type | PostgreSQL Type |
|---|---|
| `text`, `textarea`, `email`, `url`, `password`, `select` | `TEXT` |
| `number` | `NUMERIC` |
| `boolean` | `BOOLEAN` |
| `date` | `DATE` |
| `datetime` | `TIMESTAMPTZ` |
| `json` | `JSONB` |
| `uuid` | `TEXT` |
| `relation` | `TEXT` (FK value stored as TEXT) |

### Why Two Layers?

The Prisma layer handles **system data** — it needs a known schema for Prisma Client to generate types. The dynamic layer handles **user content** — schemas change at runtime when you add/remove fields. Using `$executeRawUnsafe` and `$queryRawUnsafe` for dynamic tables means zero-downtime schema changes with no migration files.

---

## 5. API Layer

### REST API — `/api/v1/[collection]`

All endpoints require an `Authorization: Bearer <key>` header.

#### `GET /api/v1/{collection}`

List records with full filtering, sorting, search, pagination, field selection, and relation population.

```
GET /api/v1/posts
  ?page=1
  &limit=20
  &sort=-createdAt                   # prefix - for DESC
  &search=nextjs                     # full-text across text fields
  &fields=id,title,slug              # field selection
  &populate=true                     # inline M2O relations
  &filter[status][_eq]=published
  &filter[price][_gte]=100
  &filter[tags][_in]=tech,design
```

**Filter Operators**

| Operator | SQL equivalent |
|---|---|
| `_eq` | `= value` |
| `_neq` | `!= value` |
| `_lt` | `< value` |
| `_lte` | `<= value` |
| `_gt` | `> value` |
| `_gte` | `>= value` |
| `_contains` | `ILIKE '%value%'` |
| `_null` | `IS NULL` / `IS NOT NULL` |
| `_in` | `= ANY(array)` |

**Response**
```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Hello World",
      "slug": "hello-world",
      "status": "published",
      "createdAt": "2026-05-29T10:00:00Z",
      "updatedAt": "2026-05-29T10:00:00Z"
    }
  ],
  "meta": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

#### `GET /api/v1/{collection}/{id}`

Fetch a single record by ID.

#### `POST /api/v1/{collection}`

Create a record. Requires `read_write` API key. Validates required fields server-side.

```json
{ "title": "My Post", "status": "draft" }
```

#### `PATCH /api/v1/{collection}/{id}`

Partial update. Only provided fields are updated — existing fields are preserved.

#### `DELETE /api/v1/{collection}/{id}`

Delete a record. Returns `204 No Content`.

#### CORS

All endpoints respond to `OPTIONS` preflight with `Access-Control-Allow-Origin: *` — suitable for frontend apps on any domain.

---

## 6. GraphQL Engine

**Endpoint:** `POST /api/graphql`  
**Auth:** `Authorization: Bearer <key>`  
**Schema:** Dynamically generated from live DB collections on every request.

### Auto-generated Schema

For every collection, Genesis generates:

```graphql
# Object type
type Post {
  id:        ID!
  createdAt: String
  updatedAt: String
  title:     String
  slug:      String
  status:    String
}

# Paginated list wrapper
type PostList {
  data: [Post!]!
  meta: PageMeta!
}

type PageMeta {
  total: Int!
  page:  Int!
  limit: Int!
  pages: Int!
}

# Input type for mutations
input PostInput {
  title:  String
  slug:   String
  status: String
}

type Query {
  post(id: ID!): Post
  posts(page: Int, limit: Int, sort: String, search: String): PostList!
}

type Mutation {
  create_post(input: PostInput!): Post
  update_post(id: ID!, input: PostInput!): Post
  delete_post(id: ID!): Boolean
}
```

### Example Queries

```graphql
# List with pagination
query {
  posts(page: 1, limit: 10, sort: "-createdAt") {
    data { id title slug status }
    meta { total pages }
  }
}

# Single record
query {
  post(id: "abc123") {
    id title body createdAt
  }
}

# Create
mutation {
  create_post(input: { title: "Hello", status: "draft" }) {
    id slug
  }
}

# Delete
mutation {
  delete_post(id: "abc123")
}
```

### GraphQL Explorer

Built-in in-dashboard playground at `/graphql`:
- Split-pane editor (query left, response right)
- API key bar — persisted to `localStorage`
- Example query library
- Tab indent + `Ctrl+Enter` to run
- Copy response button

---

## 7. Flows — Automation Engine

Flows are visual automation pipelines triggered by data events.

### Architecture

```
Event (record.create / record.update / record.delete / manual)
      │
      ▼
  triggerFlows()              ← fires from collections.ts, async
      │
      ├── query DB for matching active flows
      │
      └── for each matching flow:
              │
              ▼
          runFlow()            ← lib/flows/runner.ts
              │
              ▼
          ┌─────────────────────────────────────────┐
          │         Sequential Step Execution         │
          │                                           │
          │  Step 1: condition                        │
          │    field "status" eq "published"          │
          │    → PASS → continue                      │
          │    → FAIL → stop (short-circuit)          │
          │                                           │
          │  Step 2: webhook                          │
          │    POST https://api.example.com/notify    │
          │    body: {"id":"{{id}}","title":"{{title}}"}│
          │    → 200 OK → continue                    │
          │    → error  → stop, status=error          │
          │                                           │
          │  Step 3: create_record                    │
          │    collection: "notifications"            │
          │    data: {"message":"New: {{title}}"}     │
          │                                           │
          │  Step 4: log                              │
          │    "Processed record {{id}}"              │
          └─────────────────────────────────────────┘
                  │
                  ▼
              FlowRun saved to DB
              (status, log lines, duration)
```

### Trigger Types

| Trigger | When it fires |
|---|---|
| `record.create` | After a record is created in a collection |
| `record.update` | After a record is updated |
| `record.delete` | After a record is deleted |
| `manual` | Only when "Run" is clicked in the dashboard |

Flows can be scoped to a specific collection or fire on any collection.

### Step Types

| Step | What it does |
|---|---|
| **Condition** | Checks a field value — stops the flow if the check fails |
| **Webhook** | HTTP request (GET/POST/PUT/PATCH) to any URL |
| **Create Record** | Inserts a new record into any collection |
| **Log** | Records a message in the run history |

### Template Variables

All text fields in steps support `{{fieldName}}` interpolation resolved from the triggering record's payload:

```
"New post created: {{title}} by {{author}}"
→  "New post created: Hello World by Jane"
```

---

## 8. Extensions — Plugin System

Extensions are synchronous data-transform plugins that run **before** a record is saved to the database. They are composable and chainable.

### Execution Flow

```
createRecord(collectionId, rawData)
      │
      ▼
applyExtensions(collectionId, rawData, "create")
      │
      ├── load all active extensions from DB
      ├── filter by collectionId + event
      │
      └── chain execute():
            ext[0].execute(data, config, "create")  → data'
            ext[1].execute(data', config, "create")  → data''
            ext[2].execute(data'', config, "create") → data'''
      │
      ▼
insertDynamicRow(tableName, collectionId, data''')
```

### Built-in Plugins

| Plugin | Category | What it does |
|---|---|---|
| 🔗 **Auto Slug** | compute | Generates `slug` from `title` on create. Configurable source/target fields. |
| 📝 **Word Count** | compute | Counts words in a text field → stores integer in target field |
| 🔠 **Auto Capitalize** | transform | Capitalizes first letter of a configured field |
| ⚙️ **Set Defaults** | transform | Fills default values on create if fields are empty |
| ✂️ **Trim Whitespace** | transform | Strips leading/trailing whitespace from all string fields |
| 📧 **Lowercase Email** | transform | Forces a configured email field to lowercase |

### Configuration

Each plugin is installed with:
- **Config** — plugin-specific key/value pairs (e.g. `{ sourceField: "title", targetField: "slug" }`)
- **Collection scope** — all collections or a specific one
- **Events** — `create`, `update`, or `create,update`

Multiple instances of the same plugin can be installed with different configs for different collections.

---

## 9. Relationships

Genesis supports three relationship types between collections, backed by real Postgres constraints.

```
M2O (Many-to-One)
─────────────────
posts.author_id ──FK──► authors.id

O2M (One-to-Many)
──────────────────
authors.id ◄──── posts[]   (virtual — inverse of an M2O)

M2M (Many-to-Many)
──────────────────
posts ◄──── genesis_jxn_posts_tags ────► tags
```

| Type | DDL Created | Use Case |
|---|---|---|
| `m2o` | `ALTER TABLE posts ADD COLUMN author_id TEXT` | Post belongs to one Author |
| `o2m` | Virtual — inverse of an M2O | Author has many Posts |
| `m2m` | `CREATE TABLE genesis_jxn_{a}_{b} (...)` | Posts have many Tags |

Relations are stored in the `Relation` Prisma table and visible in the Collection detail view.

---

## 10. Authentication & Permissions

### Dashboard Auth

NextAuth.js with credential (email/password) and GitHub OAuth providers. Sessions are JWT-based.

### API Auth

```
Authorization: Bearer sk-live-xxxxxxxxxxxxxxxxxxxxxxxx
                              │
                              ▼
                    SHA-256 hash → lookup in ApiKey table
                              │
                    key.active === true?
                              │
                    key.permissions: "read" | "read_write"
                              │
                    GET → read key OK
                    POST/PATCH/DELETE → read_write key required
```

### Role-Based Permissions

Two built-in roles: `editor` and `viewer`. Permissions are defined per-collection:

| Permission | `viewer` default | `editor` default |
|---|---|---|
| `canRead` | ✅ | ✅ |
| `canCreate` | ❌ | ✅ |
| `canUpdate` | ❌ | ✅ |
| `canDelete` | ❌ | ❌ |

Permissions are checked in the data browser UI and enforced at the action layer.

---

## 11. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions, Turbopack) |
| **Language** | TypeScript 5 (strict) |
| **ORM** | Prisma v6 |
| **Database** | PostgreSQL via Neon (serverless) |
| **Auth** | NextAuth.js v5 |
| **GraphQL** | graphql-yoga v5 + graphql v16 |
| **Styling** | Tailwind CSS v4 + CSS custom properties (design tokens) |
| **State** | Zustand (UI store) |
| **Icons** | Lucide React |
| **File upload** | Native Next.js API route + sharp (thumbnails) |
| **Deployment** | Vercel / any Node.js host |

---

## 12. Directory Structure

```
genesis-cms/
├── app/
│   ├── (dashboard)/              # All authenticated dashboard pages
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Overview / home
│   │   ├── collections/          # Collection list + detail + data browser
│   │   ├── flows/                # Flow list + visual editor
│   │   ├── extensions/           # Plugin gallery + installed list
│   │   ├── graphql/              # In-dashboard GraphQL playground
│   │   ├── api-keys/             # API key management
│   │   ├── webhooks/             # Webhook management
│   │   ├── audit/                # Audit log viewer
│   │   ├── files/                # File upload + browser
│   │   ├── pages/                # Visual page builder
│   │   ├── roles/                # Permission matrix
│   │   ├── users/                # User management
│   │   ├── settings/             # Site settings
│   │   ├── migrate/              # Migration kit
│   │   └── preview/              # Live site preview
│   │
│   └── api/
│       ├── v1/
│       │   ├── [collection]/
│       │   │   ├── route.ts      # GET (list) + POST (create)
│       │   │   └── [id]/route.ts # GET + PATCH + DELETE
│       ├── graphql/
│       │   └── route.ts          # graphql-yoga endpoint
│       ├── upload/route.ts
│       └── auth/[...nextauth]/route.ts
│
├── components/
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── DashboardLayout.tsx
│
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── db-dynamic.ts             # Raw SQL DDL + DML for dynamic tables
│   ├── db-introspect.ts          # information_schema reader
│   ├── utils.ts                  # slugify, cn, etc.
│   ├── graphql/
│   │   └── schema.ts             # Dynamic schema builder (SDL + resolvers)
│   ├── flows/
│   │   └── runner.ts             # Flow execution engine
│   ├── extensions/
│   │   ├── registry.ts           # Built-in plugin definitions + execute()
│   │   └── runner.ts             # applyExtensions() chain
│   └── actions/                  # Next.js Server Actions ("use server")
│       ├── collections.ts        # Collection + field + record CRUD
│       ├── flows.ts              # Flow CRUD + triggerFlows()
│       ├── extensions.ts         # Extension install/update/remove
│       ├── webhooks.ts           # fireWebhooks()
│       ├── audit.ts              # logAudit()
│       ├── relations.ts          # Relation CRUD
│       └── introspect.ts         # DB introspection + import
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260513015339_init/
│       ├── 20260521000001_collection_table_name/
│       ├── 20260521000002_relations/
│       ├── 20260529000001_flows/
│       └── 20260529000002_extensions/
│
└── public/
    └── uploads/                  # Uploaded files + thumbnails
```

---

## 13. Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon free tier works)
- (Optional) GitHub OAuth app for SSO

### Installation

```bash
git clone https://github.com/your-org/genesis-cms
cd genesis-cms
npm install
```

### Database Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local — set DATABASE_URL to your Postgres connection string

# Push schema and generate Prisma client
npx prisma db push
npx prisma generate
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

On first run, create your admin account at `/signup` — subsequent registrations require existing admin approval.

### Create your first API key

1. Go to `/api-keys` in the dashboard
2. Click **New API Key**
3. Copy the key — it is shown only once
4. Use it in requests: `Authorization: Bearer sk-live-...`

---

## 14. Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-32-chars-minimum"

# Optional — GitHub OAuth
GITHUB_ID="your-github-app-id"
GITHUB_SECRET="your-github-app-secret"

# Optional — file upload path (default: public/uploads)
UPLOAD_DIR="public/uploads"
```

---

## 15. Roadmap

| Phase | Feature | Status |
|---|---|---|
| 1 | Dynamic real DB tables per collection | ✅ Done |
| 2 | DB introspection — import existing tables | ✅ Done |
| 3 | Relationships — M2O, O2M, M2M | ✅ Done |
| 4 | Advanced REST API | ✅ Done |
| 5 | GraphQL endpoint | ✅ Done |
| 6 | Flows — visual automation builder | ✅ Done |
| 7 | Extensions — plugin system | ✅ Done |
| 8 | Drag & drop block reordering | 🔜 |
| 9 | Style editor — colors, fonts, spacing per block | 🔜 |
| 10 | Template library — pre-built page templates | 🔜 |
| 11 | Domain + publish — one-click deploy | 🔜 |
| 12 | Form builder → submissions into collections | 🔜 |
| 13 | Multi-page navigation — menus, page links | 🔜 |
| 14 | Real-time — live updates via WebSockets | 🔜 |
| 15 | Multi-tenant — schema-per-tenant isolation | 🔜 |
| 16 | Media transforms — resize/crop on the fly | 🔜 |
| 17 | Insights & Analytics — real usage metrics | 🔜 |

---

## License

MIT © Genesis CMS Contributors

---

*Built with Next.js · Powered by PostgreSQL · Hosted on Neon*
