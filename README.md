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
database/
  001_CreateSchema.sql
  002_SeedData.sql
SellaSolar.Admin.Domain/
SellaSolar.Admin.Infrastructure/ # ASP.NET Identity, auth DbContext, seeding
SellaSolar.Admin.Data/          # scaffolded entities + DbContext
SellaSolar.Admin.Application/   # services, DTOs, ProjectMaterialsService
SellaSolar.Admin.Server/        # REST controllers, uploads, SPA host
sellasolar.admin.client/        # React admin UI
```

## Stock deduction assumption (important)

When materials are assigned to a project (`POST /api/projects/{id}/items`):

1. The API compares `QuantityNeeded` with `WarehouseItem.QuantityInStock`.
2. `QuantityFromStock = min(needed, available)`.
3. Shortfall is stored as `QuantityToPurchase` and `NeedsPurchase = true`.
4. **`QuantityFromStock` is deducted from warehouse stock immediately.**

Removing a project item (or deleting a project) restores the previously deducted amount.

This is an MVP choice and is easy to change later (e.g. reserve-only until project start).

## Prerequisites

- .NET 10 SDK
- Node.js 20+
- SQL Server LocalDB **or** full SQL Server
- `dotnet-ef` tool (for re-scaffold): `dotnet tool install --global dotnet-ef`

## 1. Create the database

LocalDB (already used in `appsettings`):

```powershell
sqllocaldb start MSSQLLocalDB
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\001_CreateSchema.sql
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\004_IdentitySchema.sql
# Prefer PowerShell seed for correct Ukrainian Unicode:
powershell -ExecutionPolicy Bypass -File database\003_SeedData.ps1
# Alternative (may mangle Cyrillic depending on console code page):
# sqlcmd -S "(localdb)\MSSQLLocalDB" -E -f 65001 -i database\002_SeedData.sql
```

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
  --table WarehouseItems
```

Do **not** scaffold `AspNet*` / `AuthSecurityLogs` into the Data project (Identity owns those).
Do **not** use Code-First migrations to drive schema changes — edit SQL scripts first, apply them, then scaffold.

`ApplicationUser.WorkerType` is configured manually in `ApplicationIdentityDbContext` (see `004` / `006`).

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
