# Build a Multi-Tenant Real Estate CRM for Bangladesh

## What you are building

A multi-tenant SaaS CRM for real estate companies in Bangladesh. Each company is an isolated tenant — identified by the logged-in user's session, not by URL. The platform manages leads, properties, payments (booking/installments), site visits, and Meta Ads performance — all in one place.

You are a solo developer. Build clean, simple code. No over-engineering.

---

## Tech stack — use exactly these, no substitutions

- **Next.js 16** with App Router and TypeScript (scaffolded via `create-next-app@latest`, which installed 16.2.10; kept as-is since it builds and typechecks cleanly — note the `middleware.ts` convention is deprecated in favor of `proxy.ts` in this version, but still works)
- **Tailwind CSS** for styling
- **shadcn/ui** for all UI components — use this exclusively, never build raw HTML components from scratch
- **Neon** for serverless Postgres (connection string provided via env)
- **Prisma** as ORM
- **Better Auth** for authentication (email/password, Prisma adapter, custom bcrypt hashing)
- **Cloudflare R2** for file/image storage (S3-compatible)
- **Resend** for transactional email
- **Recharts** for charts (via shadcn/ui chart wrapper)
- **Claude API** (`claude-haiku-4-5-20251001`) for AI features — only activate if `ANTHROPIC_API_KEY` is set in env, otherwise skip silently
- **Meta Marketing API** for ad campaign data

---

## Multi-tenancy — session-based, NO slug in URL

There is no tenant slug in any URL. URLs are clean: `/leads`, `/properties`, `/ads`, `/settings`.

How tenant isolation works:
1. User logs in → Better Auth manages the session cookie/token; `tenantId` and `roleId` are stored as additional fields directly on the `User` row (set at sign-up time, never user-editable)
2. `lib/session.ts` exposes `getSession()`, which calls `auth.api.getSession()` and joins the `User`/`Role` tables to return `{ user: { id, name, email, tenantId, roleId, roleName } }` — this is the single source of truth for session data everywhere (API routes and Server Components)
3. Every API route and Server Component reads `session.user.tenantId` from `getSession()`
4. Every Prisma query filters by that `tenantId` — no exceptions
5. When loading any record by ID (lead, property), always verify it belongs to the session tenant:

```ts
const lead = await prisma.lead.findFirst({
  where: { id: params.id, tenantId: session.user.tenantId }
})
if (!lead) return new Response('Not found', { status: 404 })
```

Never use `findUnique({ where: { id } })` alone for tenant-owned records — always pair the ID with tenantId.

The `middleware.ts` file only handles auth redirect: if no session and route is not /login or /register, redirect to /login.

---

## Environment variables — read from `.env.local`

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_WEBHOOK_VERIFY_TOKEN=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

---

## Color theme — apply this globally, no deviations

The app uses a deep teal + slate theme. Professional, trustworthy, modern — suited for a B2B real estate tool.

### Set up in `globals.css` (CSS variables for shadcn/ui)

```css
@layer base {
  :root {
    --background: 210 20% 98%;
    --foreground: 215 25% 12%;
    --card: 0 0% 100%;
    --card-foreground: 215 25% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 215 25% 12%;

    --primary: 173 80% 28%;        /* Deep teal — main brand color */
    --primary-foreground: 0 0% 100%;

    --secondary: 215 20% 93%;
    --secondary-foreground: 215 25% 20%;

    --muted: 215 15% 94%;
    --muted-foreground: 215 15% 45%;

    --accent: 173 60% 94%;         /* Teal tint — hover states */
    --accent-foreground: 173 80% 20%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;

    --border: 215 15% 88%;
    --input: 215 15% 88%;
    --ring: 173 80% 28%;

    --radius: 0.5rem;

    --success: 142 72% 29%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 40%;
    --warning-foreground: 0 0% 100%;
    --info: 221 83% 44%;
    --info-foreground: 0 0% 100%;
  }

  .dark {
    --background: 215 30% 8%;
    --foreground: 210 20% 92%;
    --card: 215 28% 11%;
    --card-foreground: 210 20% 92%;
    --popover: 215 28% 11%;
    --popover-foreground: 210 20% 92%;
    --primary: 173 70% 40%;
    --primary-foreground: 215 30% 8%;
    --secondary: 215 25% 16%;
    --secondary-foreground: 210 20% 80%;
    --muted: 215 25% 16%;
    --muted-foreground: 215 15% 55%;
    --accent: 173 40% 16%;
    --accent-foreground: 173 70% 70%;
    --destructive: 0 63% 45%;
    --destructive-foreground: 0 0% 100%;
    --border: 215 25% 18%;
    --input: 215 25% 18%;
    --ring: 173 70% 40%;
  }
}
```

### Badge color map — use these consistently

```ts
const stageBadge = {
  NEW:         'bg-slate-100 text-slate-700 border-slate-200',
  CONTACTED:   'bg-blue-50 text-blue-700 border-blue-200',
  INTERESTED:  'bg-violet-50 text-violet-700 border-violet-200',
  SITE_VISIT:  'bg-amber-50 text-amber-700 border-amber-200',
  NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-200',
  BOOKED:      'bg-teal-50 text-teal-700 border-teal-200',
  LOST:        'bg-red-50 text-red-600 border-red-200',
}

const scoreBadge = {
  HOT:  'bg-red-50 text-red-600 border-red-200',
  WARM: 'bg-amber-50 text-amber-600 border-amber-200',
  COLD: 'bg-sky-50 text-sky-600 border-sky-200',
}

const sourceBadge = {
  MANUAL:    'bg-slate-100 text-slate-600 border-slate-200',
  WEBSITE:   'bg-blue-50 text-blue-600 border-blue-200',
  FACEBOOK:  'bg-indigo-50 text-indigo-600 border-indigo-200',
  INSTAGRAM: 'bg-pink-50 text-pink-600 border-pink-200',
}

const paymentBadge = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  PAID:     'bg-teal-50 text-teal-700 border-teal-200',
  OVERDUE:  'bg-red-50 text-red-600 border-red-200',
}
```

### Sidebar design
- Background: `hsl(215, 28%, 10%)` — near-black slate
- Active item: teal highlight strip on left + teal text `hsl(173, 70%, 80%)`
- Hover: `hsl(215, 25%, 16%)`
- Text: `hsl(210, 20%, 70%)`

### Cards, Kanban, forms
- Stat cards: white bg, `border border-border rounded-xl p-5`, teal icon top-right
- Kanban columns: `bg-background rounded-xl border border-border`, board bg `bg-muted/40`
- Lead cards: `shadow-sm hover:shadow-md transition-shadow`, dragging: `shadow-xl ring-2 ring-primary/30`
- All modals: shadcn `Dialog`; slide-in forms: shadcn `Sheet` from right
- Submit buttons: `variant="default"` (teal), cancel: `variant="outline"`

---

## Folder structure — follow this exactly

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← Sidebar + top bar + session guard
│   │   ├── page.tsx                 ← Dashboard home
│   │   ├── leads/
│   │   │   ├── page.tsx             ← Kanban + list toggle
│   │   │   └── [id]/page.tsx        ← Lead detail
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── payments/page.tsx        ← All payment schedules & overdue list
│   │   ├── visits/page.tsx          ← Site visit calendar
│   │   ├── ads/page.tsx             ← Meta Ads dashboard
│   │   ├── reports/page.tsx         ← Simple reports
│   │   └── settings/
│   │       ├── roles/page.tsx       ← Role & permission manager
│   │       ├── team/page.tsx        ← Invite & manage team
│   │       └── workspace/page.tsx   ← Company name, logo
│   └── api/
│       ├── auth/[...all]/route.ts   ← Better Auth handler (toNextJsHandler)
│       ├── auth/register/route.ts
│       ├── leads/route.ts
│       ├── leads/[id]/route.ts
│       ├── leads/[id]/activity/route.ts
│       ├── leads/check-duplicate/route.ts
│       ├── properties/route.ts
│       ├── properties/[id]/route.ts
│       ├── payments/route.ts
│       ├── payments/[id]/route.ts
│       ├── visits/route.ts
│       ├── visits/[id]/route.ts
│       ├── roles/route.ts
│       ├── roles/[id]/route.ts
│       ├── roles/[id]/permissions/route.ts
│       ├── team/route.ts
│       ├── team/[id]/route.ts
│       ├── reports/summary/route.ts
│       ├── meta-ads/sync/route.ts
│       ├── ai/score-lead/route.ts
│       ├── ai/chat/route.ts
│       ├── ai/ad-insight/route.ts
│       ├── uploads/presign/route.ts
│       └── webhooks/lead-form/route.ts
├── middleware.ts                    ← Auth redirect only (no slug logic)
├── lib/
│   ├── db.ts
│   ├── auth.ts                      ← betterAuth() server instance (Prisma adapter)
│   ├── auth-client.ts               ← createAuthClient() for client components
│   ├── session.ts                   ← getSession() — joins Better Auth session with User/Role
│   ├── permissions.ts               ← PERMISSIONS constants + hasPermission()
│   ├── require-permission.ts        ← requirePermission() API guard
│   ├── format-bdt.ts
│   ├── bd-phone.ts                  ← BD phone normalization & validation
│   ├── dhaka-locations.ts
│   └── meta-api.ts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── leads/
│   │   ├── LeadKanban.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadForm.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── FollowUpBadge.tsx
│   ├── properties/
│   │   ├── PropertyCard.tsx
│   │   └── PropertyForm.tsx
│   ├── payments/
│   │   ├── PaymentSchedule.tsx
│   │   └── PaymentForm.tsx
│   ├── visits/
│   │   └── VisitCalendar.tsx
│   ├── ads/
│   │   └── CampaignTable.tsx
│   ├── dashboard/
│   │   └── StatCard.tsx
│   └── ui/                          ← shadcn/ui generated components
├── prisma/schema.prisma
└── vercel.json
```

---

## Database schema — implement this exactly in `prisma/schema.prisma`

```prisma
model Tenant {
  id              String           @id @default(cuid())
  companyName     String
  logoUrl         String?
  createdAt       DateTime         @default(now())
  users           User[]
  leads           Lead[]
  properties      Property[]
  payments        Payment[]
  siteVisits      SiteVisit[]
  metaAdCampaigns MetaAdCampaign[]
  roles           Role[]
}

// ── Dynamic RBAC ──
model Role {
  id          String           @id @default(cuid())
  tenantId    String
  tenant      Tenant           @relation(fields: [tenantId], references: [id])
  name        String
  description String?
  isDefault   Boolean          @default(false)
  isSystem    Boolean          @default(false)
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime         @default(now())
  @@unique([tenantId, name])
}

model RolePermission {
  id         String @id @default(cuid())
  roleId     String
  role       Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission String
  @@unique([roleId, permission])
}

// Better Auth owns User's auth fields (emailVerified, image, updatedAt) and
// stores password hashes on Account, not User — tenantId/roleId are registered
// as additionalFields in lib/auth.ts (input: true, set by our own server code,
// never client-supplied).
model User {
  id            String         @id @default(cuid())
  tenantId      String
  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  roleId        String
  role          Role           @relation(fields: [roleId], references: [id])
  name          String
  email         String         @unique
  emailVerified Boolean        @default(false)
  image         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  assignedLeads Lead[]         @relation("AssignedAgent")
  activities    LeadActivity[]
  siteVisits    SiteVisit[]
  sessions      Session[]
  accounts      Account[]
}

// ── Better Auth ──
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String
  providerId            String    // "credential" for email/password
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // bcrypt hash lives here, not on User
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  @@index([userId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([identifier])
}

// ── Leads ──
model Lead {
  id             String         @id @default(cuid())
  tenantId       String
  tenant         Tenant         @relation(fields: [tenantId], references: [id])
  agentId        String?
  agent          User?          @relation("AssignedAgent", fields: [agentId], references: [id])
  name           String
  phone          String         // normalized: 8801XXXXXXXXX
  email          String?
  source         LeadSource     @default(MANUAL)
  propertyType   PropertyType?
  budgetMin      Float?
  budgetMax      Float?
  locationArea   String?
  pipelineStage  PipelineStage  @default(NEW)
  nextFollowUpAt DateTime?      // ← follow-up reminder
  aiScore        AiScore?
  aiScoreReason  String?
  aiScoredAt     DateTime?
  metaAdId       String?
  activities     LeadActivity[]
  interestedIn   LeadProperty[]
  payments       Payment[]
  siteVisits     SiteVisit[]
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  @@index([tenantId, phone])   // ← duplicate detection lookup
  @@index([tenantId, nextFollowUpAt])
}

enum LeadSource    { MANUAL WEBSITE FACEBOOK INSTAGRAM REFERRAL }
enum PropertyType  { APARTMENT LAND COMMERCIAL }
enum PipelineStage { NEW CONTACTED INTERESTED SITE_VISIT NEGOTIATION BOOKED LOST }
enum AiScore       { HOT WARM COLD }

model LeadActivity {
  id          String   @id @default(cuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  type        String   // "call" | "note" | "visit" | "stage_change" | "payment"
  description String
  createdAt   DateTime @default(now())
}

// ── Properties ──
model Property {
  id           String         @id @default(cuid())
  tenantId     String
  tenant       Tenant         @relation(fields: [tenantId], references: [id])
  title        String
  type         PropertyType
  price        Float
  sizeSqft     Float?
  floor        Int?
  bedrooms     Int?
  locationArea String
  status       PropertyStatus @default(AVAILABLE)
  projectName  String?
  description  String?
  photoUrls    String[]
  leads        LeadProperty[]
  payments     Payment[]
  createdAt    DateTime       @default(now())
}

enum PropertyStatus { AVAILABLE BOOKED SOLD }

model LeadProperty {
  leadId     String
  propertyId String
  lead       Lead     @relation(fields: [leadId], references: [id])
  property   Property @relation(fields: [propertyId], references: [id])
  @@id([leadId, propertyId])
}

// ── Payments: booking money + installments (কিস্তি) ──
model Payment {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  leadId      String
  lead        Lead          @relation(fields: [leadId], references: [id])
  propertyId  String?
  property    Property?     @relation(fields: [propertyId], references: [id])
  type        PaymentType
  amount      Float         // BDT
  dueDate     DateTime
  paidDate    DateTime?
  status      PaymentStatus @default(PENDING)
  method      String?       // "cash" | "bank" | "bkash" | "nagad" | "cheque"
  reference   String?       // cheque no / transaction ID
  note        String?
  createdAt   DateTime      @default(now())
  @@index([tenantId, status, dueDate])
}

enum PaymentType   { BOOKING_MONEY DOWN_PAYMENT INSTALLMENT FINAL_PAYMENT OTHER }
enum PaymentStatus { PENDING PAID OVERDUE }

// ── Site visits ──
model SiteVisit {
  id          String          @id @default(cuid())
  tenantId    String
  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  leadId      String
  lead        Lead            @relation(fields: [leadId], references: [id])
  agentId     String
  agent       User            @relation(fields: [agentId], references: [id])
  scheduledAt DateTime
  location    String          // property/project address
  status      SiteVisitStatus @default(SCHEDULED)
  note        String?
  createdAt   DateTime        @default(now())
  @@index([tenantId, scheduledAt])
}

enum SiteVisitStatus { SCHEDULED COMPLETED CANCELLED NO_SHOW }

// ── Meta Ads ──
model MetaAdCampaign {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  campaignId  String
  name        String
  spendBdt    Float    @default(0)
  impressions Int      @default(0)
  clicks      Int      @default(0)
  leadsCount  Int      @default(0)
  syncedAt    DateTime @default(now())
  @@unique([tenantId, campaignId])
}
```

---

## Dynamic RBAC — implement in `lib/permissions.ts`

### Permission keys — define as constants, never raw strings

```ts
export const PERMISSIONS = {
  // Leads
  LEADS_VIEW:       'leads:view',
  LEADS_CREATE:     'leads:create',
  LEADS_EDIT_OWN:   'leads:edit_own',
  LEADS_EDIT_ANY:   'leads:edit_any',
  LEADS_DELETE:     'leads:delete',
  LEADS_ASSIGN:     'leads:assign',
  LEADS_EXPORT:     'leads:export',

  // Properties
  PROPERTIES_VIEW:   'properties:view',
  PROPERTIES_CREATE: 'properties:create',
  PROPERTIES_EDIT:   'properties:edit',
  PROPERTIES_DELETE: 'properties:delete',

  // Payments
  PAYMENTS_VIEW:     'payments:view',
  PAYMENTS_CREATE:   'payments:create',
  PAYMENTS_MARK_PAID:'payments:mark_paid',
  PAYMENTS_DELETE:   'payments:delete',

  // Site visits
  VISITS_VIEW:       'visits:view',
  VISITS_MANAGE:     'visits:manage',

  // Meta Ads
  ADS_VIEW:          'ads:view',
  ADS_SYNC:          'ads:sync',

  // Team & roles
  TEAM_VIEW:         'team:view',
  TEAM_INVITE:       'team:invite',
  TEAM_REMOVE:       'team:remove',
  ROLES_VIEW:        'roles:view',
  ROLES_MANAGE:      'roles:manage',

  // AI & reports
  AI_SCORE_LEADS:    'ai:score_leads',
  AI_CHAT:           'ai:chat',
  REPORTS_VIEW:      'reports:view',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Company Admin': Object.values(PERMISSIONS),
  'Manager': [
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_OWN, PERMISSIONS.LEADS_EDIT_ANY,
    PERMISSIONS.LEADS_ASSIGN, PERMISSIONS.LEADS_EXPORT,
    PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.PROPERTIES_CREATE, PERMISSIONS.PROPERTIES_EDIT,
    PERMISSIONS.PAYMENTS_VIEW, PERMISSIONS.PAYMENTS_CREATE, PERMISSIONS.PAYMENTS_MARK_PAID,
    PERMISSIONS.VISITS_VIEW, PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.ADS_VIEW, PERMISSIONS.ADS_SYNC,
    PERMISSIONS.TEAM_VIEW, PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.AI_SCORE_LEADS, PERMISSIONS.AI_CHAT,
    PERMISSIONS.REPORTS_VIEW,
  ],
  'Agent': [
    PERMISSIONS.LEADS_VIEW, PERMISSIONS.LEADS_CREATE, PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.VISITS_VIEW, PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.AI_CHAT,
  ],
  'Viewer': [
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
}
```

### Permission check helper + caching

```ts
import { prisma } from '@/lib/db'

const permissionCache = new Map<string, Set<string>>()

export async function getUserPermissions(roleId: string): Promise<Set<string>> {
  if (permissionCache.has(roleId)) return permissionCache.get(roleId)!
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: true },
  })
  const perms = new Set(rolePerms.map(p => p.permission))
  permissionCache.set(roleId, perms)
  return perms
}

export function invalidatePermissionCache(roleId: string) {
  permissionCache.delete(roleId)
}

export async function hasPermission(roleId: string, permission: Permission): Promise<boolean> {
  const perms = await getUserPermissions(roleId)
  return perms.has(permission)
}
```

### `lib/session.ts` — wraps Better Auth's session with tenant/role data

Better Auth's own session object only knows about its own User/Session tables. Since
`roleName` is dynamic per tenant (custom roles are allowed) rather than a fixed enum,
it's not stored as a Better Auth additional field — instead `getSession()` does one
extra join to fetch it live from the `Role` table:

```ts
// lib/session.ts
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, roleId: true, role: { select: { name: true } } },
  })
  if (!dbUser) return null

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      tenantId: dbUser.tenantId,
      roleId: dbUser.roleId,
      roleName: dbUser.role.name,
    },
  }
}
```

### `requirePermission()` guard — call at top of every mutating API route

```ts
// lib/require-permission.ts
import { getSession } from '@/lib/session'
import { hasPermission, type Permission } from '@/lib/permissions'

export async function requirePermission(permission: Permission) {
  const session = await getSession()
  if (!session) return { error: new Response('Unauthorized', { status: 401 }) }
  const allowed = await hasPermission(session.user.roleId, permission)
  if (!allowed) return { error: new Response('Forbidden', { status: 403 }) }
  return { session } // caller gets session with tenantId
}

// Usage:
// const { error, session } = await requirePermission(PERMISSIONS.LEADS_DELETE)
// if (error) return error
// ← now use session.user.tenantId for all queries
```

### Seed default roles on tenant registration

When a new tenant registers (`POST /api/auth/register`): create the Tenant, then create the 4 default roles from `DEFAULT_ROLE_PERMISSIONS` (Company Admin with `isSystem: true`, Agent with `isDefault: true`) in a Prisma transaction, then call `auth.api.signUpEmail({ body: { name, email, password, tenantId, roleId: companyAdminRoleId } })` — `tenantId`/`roleId` are Better Auth additional fields (`input: true`), so passing them here is how the newly created `User` row gets attached to its tenant and role at creation time. If `signUpEmail` throws (e.g. duplicate email), roll back the tenant/roles created in the transaction.

Inviting an existing team member (`POST /api/team`) follows the same pattern: generate a temporary password, call `auth.api.signUpEmail` with the target tenant's `tenantId` and the selected `roleId`, then email the temp password via Resend (or return it in the response if `RESEND_API_KEY` is unset).

### Roles management UI — `/settings/roles`

- Permission matrix table: rows = permissions grouped by module, columns = roles
- Each cell: shadcn `Switch` — toggling calls `PATCH /api/roles/[id]/permissions` then `invalidatePermissionCache(roleId)`
- Create custom role button (name + description, starts empty)
- Delete non-system roles only; "Company Admin" (`isSystem`) is untouchable
- Change a user's role from `/settings/team`

---

## Bangladesh-specific utilities — build these in `lib/`

### `lib/format-bdt.ts`
```ts
export function formatBDT(amount: number): string {
  if (amount >= 10_000_000) return `৳${(amount / 10_000_000).toFixed(2)} Crore`
  if (amount >= 100_000) return `৳${(amount / 100_000).toFixed(2)} Lakh`
  return `৳${amount.toLocaleString('en-BD')}`
}
```

### `lib/bd-phone.ts` — phone normalization & validation
```ts
// Accepts: 01712345678, +8801712345678, 8801712345678, 017-1234-5678
// Normalizes to: 8801712345678
export function normalizeBDPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  let normalized: string
  if (digits.startsWith('880') && digits.length === 13) normalized = digits
  else if (digits.startsWith('0') && digits.length === 11) normalized = '88' + digits
  else if (digits.length === 10 && digits.startsWith('1')) normalized = '880' + digits
  else return null

  // Valid BD mobile operator prefixes: 013-019
  const operatorDigit = normalized[4]
  if (!'3456789'.includes(operatorDigit)) return null
  return normalized
}

export function displayBDPhone(normalized: string): string {
  // 8801712345678 → 01712-345678
  const local = '0' + normalized.slice(3)
  return `${local.slice(0, 5)}-${local.slice(5)}`
}

export function whatsappLink(normalized: string): string {
  return `https://wa.me/${normalized}`
}
```

### `lib/dhaka-locations.ts`
Build a full nested object of Dhaka's real estate areas: Gulshan (1, 2, Avenue), Banani (+ DOHS), Baridhara (+ DOHS, Diplomatic Zone), Bashundhara R/A (Block A–G), Dhanmondi, Mirpur (1, 2, 6, 10, 11, 12, 13, 14, DOHS), Uttara (Sector 1–14, DOHS), Mohakhali (+ DOHS), Tejgaon, Farmgate, Rampura, Banasree, Aftabnagar, Badda, Mohammadpur, Lalmatia, Shyamoli, Adabar, Khilgaon, Pallabi, Old Dhaka (Lalbagh, Sutrapur, Kotwali). Also include a second tier for other divisions: Chattogram (GEC, Khulshi, Agrabad, Halishahar), Sylhet, Khulna, Rajshahi — as expandable optgroups. Export as `BD_AREAS`.

---

## Features to build — in this order

### Phase 1 — Auth & workspace setup
- Register: company name + admin name + email + password → creates Tenant → seeds 4 default roles → creates user with Company Admin role via Better Auth's `signUpEmail`
- Login with Better Auth email/password (`authClient.signIn.email` client-side, `auth.api.signInEmail` server-side)
- Session: Better Auth session + `User.tenantId`/`User.roleId` (additional fields), joined into `{ id, name, email, tenantId, roleId, roleName }` by `getSession()` in `lib/session.ts`
- `middleware.ts`: uses `getSessionCookie()` from `better-auth/cookies` for an optimistic redirect to /login if no session (except /login, /register, /api/webhooks/*, /api/auth/*)
- `requirePermission()` guard used on every mutating API route
- Settings pages: workspace (company name, logo upload), team (invite via Resend email), roles (permission matrix)

### Phase 2 — Lead management (MVP core)
- Kanban board (columns = pipeline stages) with drag-and-drop (`@dnd-kit/core`) + list view toggle
- Lead card: name, phone (formatted `01712-345678`), budget (formatted BDT), location, source badge, AI score badge, follow-up indicator (red dot if overdue)
- Add lead (shadcn Sheet form):
  - Phone input → normalize with `normalizeBDPhone()`, reject invalid with clear message
  - **Duplicate check**: on phone blur, call `GET /api/leads/check-duplicate?phone=X` — if a lead with the same phone exists in this tenant, show inline warning with a link to the existing lead
  - Location dropdown from `BD_AREAS`, budget input accepts lakh/crore units
  - Next follow-up date picker (shadcn Calendar + Popover)
- Lead detail page:
  - Editable info panel
  - Activity timeline (calls, notes, visits, stage changes, payments) — newest first
  - Quick actions: Log call, Add note, Schedule visit, WhatsApp button (`whatsappLink()`), direct call link (`tel:`)
  - Next follow-up date — editable, prominent at top
  - Linked properties + payment schedule sections
- **Follow-up system**:
  - Dashboard widget: "Overdue follow-ups" — leads where `nextFollowUpAt < now`, sorted oldest first
  - "Today's follow-ups" list
  - When an agent logs a call/note, prompt to set the next follow-up date
- Webhook `POST /api/webhooks/lead-form`: receives Meta Lead Form submissions → normalize phone → duplicate check (if duplicate, append an activity to existing lead instead of creating new) → create lead with source=FACEBOOK

### Phase 3 — Properties & payments
- Property list: card grid, filters (type / status / location / price range)
- Add property: multi-image upload via R2 presigned URLs, all fields
- Property detail: image gallery, info, linked leads
- **Payment tracking (কিস্তি system)**:
  - From a lead in BOOKED stage: "Create payment schedule" button
  - Schedule generator: booking money + down payment + N monthly installments (auto-calculates dates and equal amounts, editable per row)
  - Payment list per lead: type, amount (BDT), due date, status badge (Pending/Paid/Overdue)
  - Mark as paid: records paid date, method (cash/bank/bKash/Nagad/cheque), reference no
  - `/payments` page: all payments across tenant, tabs: Overdue / Due this month / Paid
  - Auto-mark OVERDUE: any PENDING payment past due date (computed at query time, no cron needed)
  - Dashboard widget: "৳ collected this month" + "overdue amount"
- Every payment action logs a LeadActivity

### Phase 4 — Site visits & Meta Ads
- **Site visits**:
  - Schedule visit from lead detail: date/time, location, assigned agent
  - `/visits` page: upcoming visits list grouped by day (today, tomorrow, this week)
  - Mark completed / cancelled / no-show — completion prompts a note + next follow-up date
  - Dashboard widget: "Today's site visits"
- **Meta Ads**:
  - `GET /api/meta-ads/sync`: fetch campaigns from Meta Marketing API, upsert into `MetaAdCampaign`
  - `vercel.json` cron: hourly sync
  - Ads page: campaign table (name, spend ৳, impressions, clicks, CTR, CPL, leads), date filter, Recharts bar chart (spend vs leads)
  - Webhook verification (GET) + lead creation (POST) on `/api/webhooks/lead-form`

### Phase 5 — AI features (only if ANTHROPIC_API_KEY is set)
- `POST /api/ai/score-lead`: fetch lead data → Claude API → save score + reason
- Auto-score on lead creation and significant updates (budget/stage change)
- Bangla/English toggle in top bar — stored in session, passed to all AI calls:
```ts
const systemPrompt = language === 'bn'
  ? 'আপনি একটি রিয়েল এস্টেট CRM সহকারী। সহজ বাংলায় উত্তর দিন।'
  : 'You are a real estate CRM assistant. Reply in simple English.'
```
- `POST /api/ai/chat`: sidebar assistant — plain-language questions about leads/properties/payments ("এই মাসে কয়টা লিড আসছে?" / "show overdue payments")
- `POST /api/ai/ad-insight`: weekly plain-language campaign summary + budget suggestions

### Phase 6 — Reports & polish
- `/reports` page:
  - Leads per month (bar chart), conversion rate (leads → booked), leads by source (pie)
  - Agent performance table: leads assigned, booked count, conversion %
  - Payment collection: monthly collected vs due
  - Export leads to CSV (`LEADS_EXPORT` permission)
- Mobile audit, empty states, loading skeletons, error boundaries
- Deploy to Vercel

---

## Dashboard home — build these widgets

| Widget | Content |
|---|---|
| Total leads | Count + new this week trend |
| Overdue follow-ups | Red-flagged list, top 5, links to leads |
| Today's site visits | Time + lead name + agent |
| Overdue payments | Count + total ৳ amount |
| Collected this month | ৳ total with progress vs last month |
| Ad spend today | BDT from Meta sync |
| Hot leads | Top 3 by AI score |
| Pipeline snapshot | Mini horizontal bar of leads per stage |

---

## UI rules — follow these throughout

### shadcn/ui component usage — mandatory
| Need | Use |
|---|---|
| Buttons | `<Button variant="default/outline/ghost/destructive">` |
| Inputs | `<Input>` + `<Label>` |
| Dropdowns | `<Select>` + `<SelectItem>` |
| Modals | `<Dialog>` |
| Slide panels | `<Sheet side="right">` |
| Tables | `<Table>` |
| Status pills | `<Badge variant="outline">` + custom className |
| Toasts | `<Sonner>` |
| Loading | `<Skeleton>` |
| Tabs | `<Tabs>` |
| Date picker | `<Calendar>` + `<Popover>` |
| Toggles | `<Switch>` |
| Charts | `<ChartContainer>` wrapping Recharts |

### Layout
- Sidebar: fixed left, `w-60` / `w-16` collapsed, dark slate bg. Nav: Dashboard, Leads, Properties, Payments, Visits, Ads, Reports, Settings
- Main: `p-6`, top bar `h-14 border-b` with page title + primary action right
- Compact density: `p-3` list items, `p-5` stat cards
- All prices via `formatBDT()`, all phones via `displayBDPhone()` — never raw
- Empty states: muted icon (48px), heading, subtext, CTA button
- Skeletons match the shape of real content
- Font: `'Inter', 'SolaimanLipi', system-ui, sans-serif` — Bangla text must render properly everywhere

### Mobile
- Sidebar becomes Sheet from left (hamburger)
- Kanban: horizontal scroll, columns `min-w-[260px]`
- Forms single-column on `sm:`, tables get scroll wrappers
- Lead detail quick actions (call, WhatsApp) as a sticky bottom bar on mobile — agents use this in the field

---

## Hard rules — never break these

1. Every Prisma query must include `tenantId` from `session.user.tenantId` — no exceptions
2. Loading any record by ID: always `findFirst({ where: { id, tenantId } })` — never `findUnique` by id alone
3. Every mutating API route starts with `requirePermission()` — never skip
4. Never hardcode role-name checks (`if roleName === 'Manager'`) — always check permission keys from `PERMISSIONS`
5. "Company Admin" role (`isSystem: true`) cannot be deleted or reduced
6. Call `invalidatePermissionCache(roleId)` after any permission change
7. Every phone number is normalized via `normalizeBDPhone()` before saving; reject invalid numbers
8. Duplicate leads: same normalized phone within a tenant triggers the duplicate flow — never silently create a second lead from webhooks
9. If `ANTHROPIC_API_KEY` is missing, AI routes return `{ skipped: true }` — no crash
10. R2 uploads via presigned URLs only — never stream files through the Next.js server
11. Meta Ads sync is async (cron) — never block a user-facing request
12. `formatBDT()` and `displayBDPhone()` are the only formatting sources — import, never duplicate
13. All text supports UTF-8 (Bangla Unicode) end to end
14. Passwords: bcrypt only — Better Auth defaults to scrypt, so `lib/auth.ts` overrides `emailAndPassword.password.hash`/`.verify` with bcrypt; never store or verify a password outside Better Auth's `Account.password` field
15. All API input validated with Zod before touching the DB

---

## Start here — run these commands first

```bash
# 1. Create project
npx create-next-app@latest bd-realestate-crm --typescript --tailwind --app
cd bd-realestate-crm

# 2. shadcn/ui
npx shadcn@latest init
# Default style, Slate base color, CSS variables: Yes

# 3. Add components
npx shadcn@latest add button input label select dialog sheet table badge
npx shadcn@latest add card tabs tooltip skeleton avatar dropdown-menu
npx shadcn@latest add sonner calendar popover chart separator switch

# 4. Packages
npm install prisma@6 @prisma/client@6 better-auth bcryptjs
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install lucide-react recharts
npm install resend zod date-fns
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# 5. Prisma
npx prisma init --datasource-provider postgresql
# → Paste Neon connection string into .env.local
# Note: pin to Prisma 6.x (classic `prisma-client-js` generator). Prisma 7's
# default generator requires a driver adapter and is pure ESM — unnecessary
# complexity for this project.

# 6. Apply schema (includes Better Auth's User/Session/Account/Verification
# models — see Database schema section), generate the client, then run
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

After setup, replace the default shadcn CSS variables in `app/globals.css` with the teal theme from the color theme section.

Build Phase 1 first. Get auth, roles, and workspace working before touching leads.