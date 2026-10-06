-- Drop ALL SellaSolar tables (MonsterASP reset).
-- Run this only when you want a clean slate, then run FreshInstall.sql.
-- Hosting-safe: no GO / USE / statement semicolons.

IF OBJECT_ID(N'dbo.ProjectItemLotAllocations', N'U') IS NOT NULL DROP TABLE dbo.ProjectItemLotAllocations
IF OBJECT_ID(N'dbo.WarehouseStockLots', N'U') IS NOT NULL DROP TABLE dbo.WarehouseStockLots
IF OBJECT_ID(N'dbo.ProjectExpenses', N'U') IS NOT NULL DROP TABLE dbo.ProjectExpenses
IF OBJECT_ID(N'dbo.ProjectItems', N'U') IS NOT NULL DROP TABLE dbo.ProjectItems
IF OBJECT_ID(N'dbo.ProjectWorkers', N'U') IS NOT NULL DROP TABLE dbo.ProjectWorkers
IF OBJECT_ID(N'dbo.ProjectPhotos', N'U') IS NOT NULL DROP TABLE dbo.ProjectPhotos
IF OBJECT_ID(N'dbo.ProjectCustomData', N'U') IS NOT NULL DROP TABLE dbo.ProjectCustomData
IF OBJECT_ID(N'dbo.Projects', N'U') IS NOT NULL DROP TABLE dbo.Projects
IF OBJECT_ID(N'dbo.WarehouseItems', N'U') IS NOT NULL DROP TABLE dbo.WarehouseItems
IF OBJECT_ID(N'dbo.Workers', N'U') IS NOT NULL DROP TABLE dbo.Workers
IF OBJECT_ID(N'dbo.AspNetUserTokens', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserTokens
IF OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserRoles
IF OBJECT_ID(N'dbo.AspNetUserLogins', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserLogins
IF OBJECT_ID(N'dbo.AspNetUserClaims', N'U') IS NOT NULL DROP TABLE dbo.AspNetUserClaims
IF OBJECT_ID(N'dbo.AspNetRoleClaims', N'U') IS NOT NULL DROP TABLE dbo.AspNetRoleClaims
IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NOT NULL DROP TABLE dbo.AspNetUsers
IF OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NOT NULL DROP TABLE dbo.AspNetRoles
IF OBJECT_ID(N'dbo.AuthSecurityLogs', N'U') IS NOT NULL DROP TABLE dbo.AuthSecurityLogs
IF OBJECT_ID(N'dbo.__SchemaPatches', N'U') IS NOT NULL DROP TABLE dbo.__SchemaPatches

PRINT N'All SellaSolar tables dropped. Next: run FreshInstall.sql'
