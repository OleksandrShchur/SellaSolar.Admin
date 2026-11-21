# SellaSolar.Admin — AI Project Context

Share this file (or the whole `ai-context/` folder) with another AI tool so it understands the codebase without exploring from scratch.

**Last updated:** 2026-09-25  
**Product:** Internal CRM / admin panel for a solar panel installation company (projects, warehouse, employees).  
**UI language:** Ukrainian. Code identifiers and comments: English.

---

## 1. Stack

| Layer | Tech |
|-------|------|
| Backend | .NET 10, ASP.NET Core Web API |
| Database | MS SQL Server / LocalDB |
| ORM | EF Core **Database-First** (scaffold after SQL scripts) |
| Auth | ASP.NET Identity + cookie sessions + antiforgery (CSRF) |
| Frontend | React 19 + TypeScript + Vite 8 + MUI 6 (+ Data Grid) |
| Routing | react-router-dom 7 |

---

## 2. Solution layout

```
SellaSolar.Admin.sln
ai-context/                      # THIS folder — shareable AI docs
database/                        # numbered SQL scripts (source of truth for schema)
SellaSolar.Admin.Domain/         # roles, policies, domain constants
SellaSolar.Admin.Infrastructure/ # Identity, ApplicationUser, auth DbContext, seeding, security logs
SellaSolar.Admin.Data/           # scaffolded domain entities + SellaSolarAdminContext
SellaSolar.Admin.Application/    # services, DTOs, exceptions
SellaSolar.Admin.Server/         # REST controllers, middleware, SPA host, Program.cs
sellasolar.admin.client/         # React admin UI
```

### Dependency direction

```
Server → Application → Data (domain tables)
       → Infrastructure → Identity / AspNet*
Domain ← referenced by Application / Infrastructure / Server (constants & policies only)
```

Controllers stay thin: call Application services, map exceptions to HTTP.

---

## 3. Hard rules (do not violate)

1. **Database-First:** schema changes = new `database/NNN_Description.sql` with the next free number. Do not edit already-applied scripts on shared DBs. Prefer idempotent SQL (`IF NOT EXISTS`, `COL_LENGTH`, etc.).
2. **Never use EF Code-First migrations** to drive schema. Apply SQL → re-scaffold domain tables into `SellaSolar.Admin.Data`.
3. **Do not scaffold** `AspNet*` / `AuthSecurityLogs` into the Data project — Identity owns those in `ApplicationIdentityDbContext`.
4. **UI strings are Ukrainian**; labels live in `sellasolar.admin.client/src/utils/labels.ts`.
5. **Roles are only `Admin` and `Worker`.** Manager role was removed (`database/009_DropManagerRole.sql`). Do not reintroduce Manager.
6. **Login is phone + password.** Phone format: `0XXXXXXXXX` (10 digits, Ukrainian mobile style). Username = phone.
7. Prefer extending existing services/pages over creating parallel systems.

---

## 4. Domain model (SQL tables)

### Business tables (`SellaSolarAdminContext`)

| Table | Purpose |
|-------|---------|
| `Projects` | Installation jobs: name, address, status, customer, dates |
| `ProjectCustomData` | Key/value extras per project |
| `ProjectItems` | Materials assigned from warehouse or non-catalog requests |
| `WarehouseStockLots` | Physical stock lots per catalog item (`UnitCost`, `UnitSellPrice`, on-hand, received) |
| `ProjectItemLotAllocations` | Manual soft-reserve of lot qty onto a project material line |
| `ProjectPhotos` | Uploaded photo paths under `wwwroot/uploads/projects/{id}/` |
| `ProjectExpenses` | Manual project costs (category, amount, optional date/notes); stock costs stay derived from allocations |
| `ProjectWorkers` | Assigns `AspNetUsers` to a project (`UserId` NVARCHAR(450)) |
| `WarehouseItems` | Catalog inventory identity: qty summary, unit, category, low-stock |

### Project status values

- `Awaiting`
- `InProgress`
- `Completed`

Defined in `SellaSolar.Admin.Domain/Constants/ProjectStatuses.cs`. Constraint updated by `database/010_ProjectStatusAwaiting.sql`.

### Worker types (only when role = Worker)

- `Assembler` (Складальник)
- `Installer` (Монтажник)

Defined in `SellaSolar.Admin.Domain/Constants/WorkerTypes.cs`.

### Identity (`ApplicationIdentityDbContext`)

- `ApplicationUser` extends `IdentityUser`: `FullName`, `IsActive`, `IsBlocked`, `BlockedAt`, `FailedLoginCount`, `CreatedAt`, `WorkerType`
- Roles: `Admin`, `Worker` (`AppRoles`)
- Phone is username; unused email/2FA columns dropped by script `008`

### Stock deduction (critical business rule)

Soft-reserve model with **manual lot allocation** for project costing.

**Terminology**

| Term | Meaning |
|------|---------|
| Active / open project | Status `Awaiting` or `InProgress` |
| На складі | `WarehouseItems.QuantityInStock` = `SUM(lots.QuantityOnHand)` (includes reserved) |
| Партія (`WarehouseStockLot`) | Physical stock at a specific `UnitCost` (buy) and optional `UnitSellPrice` (sell) |
| Вільно (catalog) | Sum of free qty across lots |
| Вільно (lot) | `QuantityOnHand − Σ allocations on open projects for that lot` |
| Зарезервовано | Allocations on open project lines (`QuantityFromStock = sum(allocations)`) |
| `costFromStock` | Persisted on `ProjectItems.CostFromStock` (= `Σ allocation.quantity × lot.unitCost`). Survives Completed; updated when allocations change. No cost invented for QuantityToPurchase. |
| `sellFromStock` | Persisted on `ProjectItems.SellFromStock` (= `Σ allocation.quantity × lot.unitSellPrice`) when every allocated lot has sell price; otherwise null. Used for накладна / margin. |

**Catalog vs lot**

- `WarehouseItem` = catalog identity (name, category, unit, low-stock, notes, optional supplier).
- Physical stock + buy/sell unit prices live in `WarehouseStockLot` rows.
- `WarehouseItems.Price` is optional last-purchase price (updated on receive); **never shown on the warehouse list grid**. Lot prices appear only on warehouse **detail**.
- Receive stock: `POST /api/warehouse-items/{id}/receive` creates a lot (`UnitCost` + required `UnitSellPrice`) and increases `QuantityInStock`.
- Update lot sell price: `PUT /api/warehouse-items/{id}/lots/{lotId}` with `{ unitSellPrice }` (refreshes `SellFromStock` on affected project lines).
- Nакладна PDF bills **sell** prices only; project Expenses tab shows cost, sell, and **margin** (= sell − cost) for materials.

When assigning catalog materials (`POST /api/projects/{id}/items`):

1. Admin sets `quantityNeeded` only — **no auto FIFO / no auto min(needed, free)**.
2. `QuantityFromStock = 0`, full amount → `QuantityToPurchase` until allocations are set.
3. Admin allocates via `PUT /api/projects/{id}/items/{itemId}/allocations` with explicit lot quantities.
4. Server validates: project open; lots belong to the line’s warehouse item; qty ≤ lot free (+ this line’s current allocation on that lot); sum ≤ QuantityNeeded.
5. Persists allocations; sets `QuantityFromStock = sum(allocations)`, `QuantityToPurchase = needed − fromStock`.
6. Decreasing `QuantityNeeded` below current allocations is **rejected** (admin must reduce allocations first).
7. **Warehouse `QuantityInStock` / lot `QuantityOnHand` are NOT reduced on assign/edit** — open projects only soft-reserve.
8. **Completing** (`PATCH .../status` → `Completed` / «Завершити») is **hard-blocked** unless every catalog line is fully lot-allocated (`QuantityFromStock == QuantityNeeded`) and each allocated lot still has `QuantityOnHand >= allocation`. Non-catalog lines do not block. Full project `PUT` cannot set `Completed` (must use «Завершити»). On success, subtracts each allocation from lot `QuantityOnHand` and catalog `QuantityInStock`.
9. Reopening from `Completed` restores lot on-hand and catalog qty; allocations become soft-reserves again.
10. Removing an item from an open project deletes allocations (releases reserves); no on-hand change.
11. Non-catalog ProjectItems unchanged (no lots).

**Warehouse UI:** list columns — name, category, unit, на складі, вільно, low-stock, needs-order — **no price**. Detail shows lots table (buy + sell) + Додати + edit sell price per lot.

**Project materials UI:** one row per catalog item; show quantities + `costFromStock` / `sellFromStock` / breakdown when allocated; allocation dialog lists lots with free qty + buy/sell prices.

**NeedsPurchase** = `QuantityNeeded >` free stock capacity for this project (must buy). Unallocated qty (`QuantityToPurchase = needed − fromStock`) with free stock left shows as **«Потрібно розподілити»**, not purchase.

---

## 5. Auth & authorization

### Mechanisms

- Cookie authentication (long session, default 90 days via `Auth:SessionDays`)
- CSRF: cookie `XSRF-REQUEST-TOKEN` + header `X-XSRF-TOKEN` (frontend fetches token from `/api/auth/antiforgery`)
- Login rate limit (IP, configurable `Auth:LoginRateLimitPerMinute`)
- Auto-block after failed logins (`Auth:MaxFailedLoginsBeforeBlock`, default 5)
- Seed admins on startup if none exist (`Auth:SeedAdmins` in appsettings — **do not commit real passwords into shared context**)

### Policies (`AppPolicies`)

| Policy | Who |
|--------|-----|
| `CanManageUsers` | Admin |
| `CanManageProjects` | Admin |
| `CanManageWarehouse` | Admin |
| `CanViewAssignedJobs` | Admin, Worker |

Registered in `InfrastructureServiceCollectionExtensions`.

### Frontend access

| Route | Role |
|-------|------|
| `/projects`, `/warehouse`, `/users` | Admin |
| `/my-jobs` | Worker (and Admin can also view assigned jobs API) |
| `/login` | Public |

`HomeRedirect` sends Admin → projects (or similar admin home), Worker → my-jobs.

---

## 6. API map

Base (dev): `https://localhost:7069`  
OpenAPI (dev): `/openapi/v1.json`  
Vite proxies `/api` and `/uploads` to the backend.

### Auth — `/api/auth`

| Method | Path | Notes |
|--------|------|-------|
| GET | `/antiforgery` | CSRF token |
| POST | `/login` | phone + password; CSRF exempt for header |
| POST | `/logout` | |
| GET | `/me` | current user |
| POST | `/change-password` | |

### Projects — `/api/projects` (Admin)

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/` | |
| GET/PUT/DELETE | `/{id}` | |
| PATCH | `/{id}/status` | |
| POST/PUT/DELETE | `/{id}/items`, `/{id}/items/{itemId}` | |
| PUT | `/{id}/items/{itemId}/allocations` | Replace lot allocations (manual) |
| POST/DELETE | `/{id}/workers`, `/{id}/workers/{assignmentId}` | |
| POST/DELETE | `/{id}/photos`, `/{id}/photos/{photoId}` | |
| POST/PUT/DELETE | `/{id}/expenses`, `/{id}/expenses/{expenseId}` | Manual expenses; only when project is open |

### Warehouse — `/api/warehouse-items` (Admin)

CRUD + `GET /categories` + `GET /purchase-requests` (non-catalog open demand).  
`GET /{id}/lots` — lot free/reserved/on-hand + unit cost + unit sell price.  
`POST /{id}/receive` — create lot (qty + unitCost + unitSellPrice); optional allocate-to-project-item.  
`PUT /{id}/lots/{lotId}` — set lot `unitSellPrice` (refreshes project `SellFromStock`).  
List query: `lowStockOnly`, `needsPurchaseOnly` (open-project shortfall; includes `quantityToOrder`).  
List DTO **omits price**; prices only via lots on detail.

### Users — `/api/users` (Admin)

List/create/update, reset-password, activate/deactivate, block/unblock.  
`GET /api/users/workers` — workers for project assignment (policy `CanManageProjects`).

### My jobs — `/api/my-jobs` (Admin + Worker)

Projects assigned to the current user.

### Error style

Application throws `ValidationException` / `NotFoundException` / `ConflictException`. Controllers return `{ message: "..." }` with 400/404/409 as appropriate. Ukrainian user-facing messages where applicable (`AuthMessages`, etc.).

---

## 7. Frontend structure

```
sellasolar.admin.client/src/
  api/           # client.ts (fetch + CSRF), index.ts (API wrappers), types.ts
  auth/          # AuthContext, ProtectedRoute, HomeRedirect
  components/    # ChangePasswordDialog, RowActionsMenu
  layout/        # AppLayout (nav)
  pages/         # Login, Projects, ProjectDetail, Warehouse, WarehouseDetail, Users, MyJobs, NoAccess
  utils/labels.ts
  theme.ts
  App.tsx
```

### Conventions

- Use `apiGet` / `apiSend` / `apiUpload` from `api/client.ts` (always `credentials: 'include'`)
- Types mirror backend DTOs in `api/types.ts`
- MUI Data Grid for list pages
- Ukrainian copy in UI; English enum values in API (`InProgress`, `Admin`, …)

### Notable screens

- **Проекти** — list + detail tabs: info / materials / expenses / workers / photos
- **Проект → витрати** — read-only stock costs from allocations + CRUD manual expenses (locked when Completed); totals: materials / manual / grand
- **Склад** — CRUD, lots / receive on detail, low-stock filter, «Потрібно замовити» (open-project demand + non-catalog); **no price on list**
- **Співробітники** — unified users (replaces old separate Workers page); phone login; role + optional worker type
- **Мої завдання** — worker’s assigned projects
- **Проект → матеріали** — manual lot allocation dialog; `costFromStock` from allocated lots

Legacy note: `WorkersPage.tsx` may still exist on disk but is **not** routed; users are managed via `UsersPage`.

---

## 8. Database scripts (apply in order)

| Script | Purpose |
|--------|---------|
| `001_CreateSchema.sql` | Core business tables |
| `002_SeedData.sql` | Optional sample data (UTF-8 / `-f 65001`) |
| `004_IdentitySchema.sql` | AspNet Identity + roles |
| `005_UnblockUserByPhone.sql` | Utility — unblock a user |
| `006_MergeWorkersIntoUsers.sql` | Workers → AspNetUsers; ProjectWorkers.UserId FK |
| `007_PhoneAsUsername.sql` | Phone as login username |
| `008_DropUnusedIdentityColumns.sql` | Drop unused email/2FA columns |
| `009_DropManagerRole.sql` | Remove Manager; migrate users to Admin |
| `010_ProjectStatusAwaiting.sql` | Allow `Awaiting` project status |
| `011_ProjectItemNonCatalog.sql` | Nullable `WarehouseItemId` + requested name/category/unit |
| `012_ReconcileUndeductedProjectStock.sql` | One-time: deduct seed `QuantityFromStock` that was never subtracted |
| `013_RestoreOpenProjectReservedStock.sql` | Restore open-project reservations onto `QuantityInStock` (deduct only on Completed) |
| `014_WarehouseStockLots.sql` | Lots + allocations; migrate on-hand stock → one lot; soft-reserve open lines |
| `015_ProjectExpenses.sql` | Manual project expenses table |
| `016_ProjectItemCostFromStock.sql` | Persist `CostFromStock` on ProjectItems; backfill legacy completed lines |

Next new script should be `017_...`.

After schema changes, re-scaffold only domain tables (see root `README.md` for the exact `dotnet ef dbcontext scaffold` command). Include `WarehouseStockLots`, `ProjectItemLotAllocations`, `ProjectExpenses`, and `ProjectItems.CostFromStock`.

---

## 9. Application services

| Service | Responsibility |
|---------|----------------|
| `ProjectService` | Project CRUD, status, detail aggregation |
| `ProjectMaterialsService` | Assign/remove materials + stock math |
| `WarehouseService` | Warehouse CRUD / categories / usage |
| `AuthService` | Login/logout/me/change-password |
| `UserManagementService` | Employee CRUD, roles, block/activate, reset password |

Registered scoped in `ApplicationServiceCollectionExtensions`.

---

## 10. Local run (summary)

```powershell
# DB
sqllocaldb start MSSQLLocalDB
# apply database\001, 004, 006, 007, 008, 009 (+ optional 002)

# API (+ SpaProxy starts Vite)
cd SellaSolar.Admin.Server
dotnet run --launch-profile https

# Or frontend alone
cd sellasolar.admin.client
npm install
npm run dev
```

Connection string (dev): LocalDB `SellaSolarAdmin`, Trusted_Connection.

---

## 11. Known follow-ups (not built yet)

- Soft-delete / audit log
- Full purchase-order workflow (supplier PO, receiving against PO) — demand visibility exists via `NeedsPurchase` / warehouse «Потрібно замовити»; receive + lots cover costing without PO docs
- Auto FIFO/LIFO allocation (explicitly out of product scope — allocation is manual)
- Automated tests

---

## 12. Guidance for the other AI

When implementing a feature:

1. Decide if a **new SQL script** is needed; if yes, add `database/NNN_*.sql`, apply, re-scaffold Data entities.
2. Put business logic in **Application** services; DTOs in `Application/DTOs`.
3. Keep controllers thin; reuse exception → HTTP mapping pattern.
4. Mirror types and API helpers on the **client**; Ukrainian UI labels via `labels.ts`.
5. Respect **Admin vs Worker** policies and routes.
6. Do not invent a Manager role, Code-First migrations, or English UI copy for end users.
7. Do not put secrets (real seed passwords, connection strings with credentials) into commits or shared context dumps.

For deep setup details, also see the repo root `README.md`.
