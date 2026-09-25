# SellaSolar Admin Panel (MVP)

Internal CRM for a solar panel installation company: projects, warehouse, and workers.

**UI language: Ukrainian.** Code identifiers and comments are in English.

## Stack

- Backend: .NET 10, ASP.NET Core Web API
- Database: MS SQL Server / LocalDB, EF Core **Database-First**
- Frontend: React + TypeScript + Vite + Material UI
- Architecture: `Server (API)` → `Application (services/DTOs)` → `Data (EF DbContext/entities)` → `Domain (constants)`

## Solution layout

```
SellaSolar.Admin.sln
database/                 # numbered SQL scripts only (apply in order)
  001_CreateSchema.sql
  002_SeedData.sql        # sample data (run after schema scripts)
  004_IdentitySchema.sql
  005_UnblockUserByPhone.sql
  006_MergeWorkersIntoUsers.sql
  007_PhoneAsUsername.sql
  008_DropUnusedIdentityColumns.sql
SellaSolar.Admin.Domain/
SellaSolar.Admin.Infrastructure/ # ASP.NET Identity, auth DbContext, seeding
SellaSolar.Admin.Data/          # scaffolded entities + DbContext
SellaSolar.Admin.Application/   # services, DTOs, ProjectMaterialsService
SellaSolar.Admin.Server/        # REST controllers, uploads, SPA host
sellasolar.admin.client/        # React admin UI
```

**Database change rule:** every schema/data change is a new `database/NNN_Description.sql` with the next free number. Do not edit already-applied scripts on shared/production databases — add a new script instead. Scripts should be idempotent when practical (`IF NOT EXISTS` / `COL_LENGTH` checks).

## Stock deduction assumption (important)

Soft-reserve with **manual lot allocation**:

1. Assigning a catalog item sets `QuantityNeeded` only — no auto-reserve from free stock.
2. Admin allocates lots via `PUT .../items/{itemId}/allocations`.
3. `QuantityFromStock = sum(allocations)`; shortfall → `QuantityToPurchase`.
4. Project `costFromStock` = Σ qty × lot unit cost (only allocated lots).
5. Completing the project consumes allocated lot on-hand (and catalog `QuantityInStock`).
6. Warehouse list does **not** show prices; lot prices live on warehouse detail / receive.

See `ai-context/PROJECT_CONTEXT.md` § Stock for the full rules.

## Prerequisites

- .NET 10 SDK
- Node.js 20+
- SQL Server LocalDB **or** full SQL Server
- `dotnet-ef` tool (for re-scaffold): `dotnet tool install --global dotnet-ef`

## 1. Create the database

LocalDB (already used in `appsettings`):

```powershell
sqllocaldb start MSSQLLocalDB

# Schema (in order). Skip scripts already applied on that database.
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\001_CreateSchema.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\004_IdentitySchema.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\006_MergeWorkersIntoUsers.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\007_PhoneAsUsername.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\008_DropUnusedIdentityColumns.sql

# Optional sample data (UTF-8). Prefer -f 65001 so Ukrainian text is preserved.
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -f 65001 -i database\002_SeedData.sql
```

Utility (run only when needed): `database\005_UnblockUserByPhone.sql`.

Connection string (Development):

```
Server=(localdb)\MSSQLLocalDB;Database=SellaSolarAdmin;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

If you use another SQL Server instance, update `ConnectionStrings:DefaultConnection` in:

- `SellaSolar.Admin.Server/appsettings.json`
- `SellaSolar.Admin.Server/appsettings.Development.json`

## 2. EF Core scaffold (Database-First)

Domain entities live in `SellaSolar.Admin.Data` (not Identity tables — those stay in `ApplicationIdentityDbContext`).
After applying SQL scripts, re-scaffold **domain tables only**:

```powershell
dotnet ef dbcontext scaffold `
  "Server=(localdb)\MSSQLLocalDB;Database=SellaSolarAdmin;Trusted_Connection=True;TrustServerCertificate=True;" `
  Microsoft.EntityFrameworkCore.SqlServer `
  -p SellaSolar.Admin.Data `
  -s SellaSolar.Admin.Server `
  -o Entities `
  -c SellaSolarAdminContext `
  --context-dir Context `
  --force `
  --no-onconfiguring `
  --data-annotations `
  --table Projects `
  --table ProjectCustomData `
  --table ProjectItems `
  --table ProjectPhotos `
  --table ProjectWorkers `
  --table WarehouseItems `
  --table WarehouseStockLots `
  --table ProjectItemLotAllocations
```

Do **not** scaffold `AspNet*` / `AuthSecurityLogs` into the Data project (Identity owns those).
Do **not** use Code-First migrations to drive schema changes — edit SQL scripts first, apply them, then scaffold.

`ApplicationUser.WorkerType` is configured manually in `ApplicationIdentityDbContext` (see `004` / `006`).
Unused Identity email/2FA columns are ignored in EF and removed by `008_DropUnusedIdentityColumns.sql`.

## 3. Run the backend

```powershell
cd SellaSolar.Admin.Server
dotnet run --launch-profile https
```

API base (default): `https://localhost:7069`  
OpenAPI (dev): `https://localhost:7069/openapi/v1.json`

Photo uploads are stored under `wwwroot/uploads/projects/{projectId}/`.

## 4. Run the frontend

With the ASP.NET SpaProxy (recommended): running the Server also starts Vite.

Standalone Vite:

```powershell
cd sellasolar.admin.client
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to the backend (see `vite.config.ts`).

## API overview

| Area | Endpoints |
|------|-----------|
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/{id}`, `PATCH /api/projects/{id}/status` |
| Materials | `POST /api/projects/{id}/items`, `DELETE /api/projects/{id}/items/{itemId}` |
| Workers on project | `POST /api/projects/{id}/workers`, `DELETE /api/projects/{id}/workers/{assignmentId}` |
| Photos | `POST /api/projects/{id}/photos`, `DELETE /api/projects/{id}/photos/{photoId}` |
| Warehouse | `GET/POST /api/warehouse-items`, `GET/PUT/DELETE /api/warehouse-items/{id}`, `GET /api/warehouse-items/categories` |
| My jobs | `GET /api/my-jobs` |
| Employees (users) | Admin: `GET/POST/PUT /api/users`, reset-password, activate/deactivate, block/unblock; Manager: `GET /api/users/workers` |

Authentication: cookie session, phone (`0XXXXXXXXX`) + password (see `Auth` in appsettings). Initial admins are seeded on startup when no admin exists yet.

| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password` |

Recovery SQL if a user is blocked: `database/005_UnblockUserByPhone.sql`.
Schema merge Workers→Users: `database/006_MergeWorkersIntoUsers.sql`.
Migrate existing usernames to phone logins: `database/007_PhoneAsUsername.sql`.
Drop unused Identity email/2FA columns: `database/008_DropUnusedIdentityColumns.sql`.

## Frontend screens

- **Вхід** — phone/password, Ukrainian UI
- **Проекти** — list (status/search), create, detail tabs: Загальна інформація / Матеріали / Працівники / Фото
- **Склад** — CRUD, low-stock filter, detail shows projects using the item
- **Співробітники** (Admin) — unified users/workers: roles, phone as login, block/unblock, reset password; worker type when role = Worker
- **Мої завдання** (Worker) — projects assigned to the logged-in user

## Known follow-ups
- Soft-delete / audit log
- Purchase orders for `NeedsPurchase` items
- Optional delayed stock reservation instead of immediate deduction
- Automated tests
