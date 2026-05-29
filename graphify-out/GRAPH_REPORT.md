# Graph Report - genesis-cms  (2026-05-29)

## Corpus Check
- 185 files · ~283,020 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1099 nodes · 1666 edges · 86 communities (52 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10cd0acf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `ensureAllTables()` - 69 edges
2. `sql` - 51 edges
3. `getTenantId()` - 34 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 16 edges
6. `logAudit()` - 14 edges
7. `useUIStore` - 13 edges
8. `ident()` - 12 edges
9. `getGitCollection()` - 12 edges
10. `isDemoId()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `ApiKeysPage()` --calls--> `getApiKeys()`  [EXTRACTED]
  app/(dashboard)/api-keys/page.tsx → lib/actions/apikeys.ts
- `AuditPage()` --calls--> `getAuditLogs()`  [EXTRACTED]
  app/(dashboard)/audit/page.tsx → lib/actions/audit.ts
- `CollectionsPage()` --calls--> `getCollections()`  [EXTRACTED]
  app/(dashboard)/collections/page.tsx → lib/actions/collections.ts
- `CollectionDetailPage()` --calls--> `getCollections()`  [EXTRACTED]
  app/(dashboard)/collections/[id]/page.tsx → lib/actions/collections.ts
- `CollectionDetailPage()` --calls--> `getRelations()`  [EXTRACTED]
  app/(dashboard)/collections/[id]/page.tsx → lib/actions/relations.ts

## Communities (86 total, 34 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (106): activeMilestone, [activeTab, setActiveTab], [aiInput, setAiInput], [aiLoading, setAiLoading], all, [allClients, setAllClients], [allDevelopers, setAllDevelopers], amountPaid (+98 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (68): POST(), GET(), GET(), GET(), GET(), POST(), GET(), GET() (+60 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (37): getCollection(), getRecords(), autoConnectAndDeployRepo(), createGitRecord(), deleteGitRecord(), getActiveIntegration(), getGitCollection(), getGitCollections() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (18): createPage(), deletePage(), getPage(), getPageBySlug(), getPages(), updatePageBlocks(), updatePageMeta(), updatePageStatus() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (30): ActionType, DEFAULTS, getAllPermissions(), resetPermissions(), upsertPermission(), createUser(), deleteUser(), getUsers() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (30): AuditAction, AuditLogEntry, AuditMeta, AuditResource, getAuditLogs(), getCollectionStats(), deleteFile(), getFileCount() (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (20): AppearanceTab(), CommandPalette(), ITEMS, DashboardLayout(), ACTION_COLOR, ACTION_ICON, Header(), LABEL_MAP (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (36): dependencies, bcryptjs, clsx, lucide-react, next, next-auth, prisma, @prisma/client (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (23): ProjectData, amountPaid, extraCharges, extraChargesTotal, feesAmount, InvoiceRendererProps, methods, paidMilestones (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (32): dependencies, dotenv, groq-sdk, html2canvas, html2pdf.js, jspdf, @neondatabase/serverless, next (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): fetchUserRepos(), ensureGitIntegration(), ensureSettings(), getGitHubOAuthUrl(), getGitIntegration(), getSettings(), testGitConnection(), updateAccount() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (13): createApiKey(), getApiKeys(), hashKey(), revokeApiKey(), validateApiKey(), getMigrationKit(), ApiKeysPage(), metadata (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (21): bufToHex(), createSessionToken(), getSecret(), signHmac(), verifySessionToken(), deleteKey(), Entry, now (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (11): NAV, AutoFreelancer, AutoPlatformFee, CATEGORIES, currencySymbol(), Expense, FinancialsPage(), fmtCur() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (16): clearSandboxLogs(), cloneRepo(), deploySandboxRepository(), detectStartCommand(), execAsync, getSandboxStatus(), killPort(), log() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (12): deleteField(), RelationWithCollections, CollectionOption, CollectionWithFields, ICON_MAP, TYPE_COLORS, CollectionOption, RelType (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (18): 🏘️ Browse by Property Type, code:block1 (FindUrProperty/), code:bash (# Clone the repo), code:block3 (Landing Page), 📝 Demo Credentials, 🔥 Featured Properties (Homepage), ✨ Features, 🏠 FindUrProperty (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (11): createCollection(), createField(), deleteCollection(), CreateCollectionModal(), ICONS, Props, CollectionWithCount, ICON_MAP (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (18): 🏘️ Browse by Property Type, code:block1 (FindUrProperty/), code:bash (# Clone the repo), code:block3 (Landing Page), 📝 Demo Credentials, 🔥 Featured Properties (Homepage), ✨ Features, 🏠 FindUrProperty (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (10): getIntrospectionData(), importTablesAsCollections(), tableNameToLabel(), TYPE_COLORS, getTableColumns(), IntrospectedColumn, IntrospectedTable, listIntrospectableTables() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (12): logAudit(), getCollections(), createWebhook(), deleteWebhook(), getWebhooks(), toggleWebhook(), WebhookEvent, ALL_EVENTS (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.30
Nodes (13): createRelation(), deleteRelation(), addDynamicColumn(), createJunctionTable(), dropDynamicColumn(), dropDynamicTable(), dropJunctionTable(), DynRecord (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.32
Nodes (11): createRecord(), deleteRecord(), updateRecord(), fireWebhooks(), DELETE(), GET(), PATCH(), authenticate() (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.31
Nodes (9): getRecordLabels(), getRelations(), authenticate(), CORS, forbidden(), GET(), notAuth(), POST() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (8): config, getIP(), proxy(), PUBLIC, now, rateLimit(), store, Window

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (6): updateField(), FIELD_TYPES, FieldTypeValue, Props, RelationMeta, SelectOption

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (9): handleSOWChange(), handleSowPreviewBlur(), stripCurrency(), update(), update10(), update7(), update9(), updateMS() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (4): geistMono, geistSans, metadata, viewport

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (3): globalForPrisma, ALLOWED_MIME, IMAGE_MIME

### Community 31 - "Community 31"
Cohesion: 0.32
Nodes (8): downloadingPDF(), generatePdfBase64(), getFees(), getOrGenerateInvoiceNumber(), refreshDocuments(), sendEmailWithPDF(), sendReceipt(), sendScopeOfWorkWithPDF()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): MTgtMTc3NTI4ODk2Mzk5MA, clientEmail, clientName, createdAt, projectTitle, scopeOfWork

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): description, published, publishedAt, slug, title

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): description, published, publishedAt, slug, title

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (5): description, published, publishedAt, slug, title

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (4): btnGhostStyle, btnPinkStyle, inputStyle, Tenant

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, viewport

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): description, published, publishedAt, slug, title

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (3): permissions, additionalDirectories, allow

## Knowledge Gaps
- **454 isolated node(s):** `eslintConfig`, `securityHeaders`, `nextConfig`, `name`, `version` (+449 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureAllTables()` connect `Community 1` to `Community 12`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `logAudit()` connect `Community 22` to `Community 24`, `Community 19`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `sql` connect `Community 1` to `Community 12`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `securityHeaders`, `nextConfig` to the rest of the system?**
  _454 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.015625 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05657206870799104 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07908163265306123 - nodes in this community are weakly interconnected._