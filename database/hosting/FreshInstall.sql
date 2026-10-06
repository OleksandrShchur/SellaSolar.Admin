-- SellaSolar Admin - full schema for MonsterASP / shared SQL Server hosting
-- Run while connected to your hosted database.
-- Hosting rules: no CREATE DATABASE, no USE, no GO, no statement semicolons.
-- Idempotent. Prefer this over running 001-017 individually.
-- Skip 002_SeedData on production - admins come from Auth:SeedAdmins on app start.

SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON
SET XACT_ABORT ON

------------------------------------------------------------------
-- Business tables
------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Projects', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Projects
    (
        Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Projects PRIMARY KEY,
        Name            NVARCHAR(200)   NOT NULL,
        Description     NVARCHAR(MAX)   NULL,
        Address         NVARCHAR(500)   NOT NULL,
        Status          NVARCHAR(20)    NOT NULL CONSTRAINT CK_Projects_Status CHECK (Status IN (N'Awaiting', N'InProgress', N'Completed')),
        CustomerName    NVARCHAR(200)   NOT NULL,
        CustomerPhone   NVARCHAR(50)    NOT NULL,
        CustomerEmail   NVARCHAR(200)   NULL,
        StartDate       DATETIME2       NULL,
        EndDate         DATETIME2       NULL,
        CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2       NOT NULL CONSTRAINT DF_Projects_UpdatedAt DEFAULT (SYSUTCDATETIME())
    )
END

IF OBJECT_ID(N'dbo.ProjectPhotos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectPhotos
    (
        Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectPhotos PRIMARY KEY,
        ProjectId       INT             NOT NULL,
        FilePathOrUrl   NVARCHAR(1000)  NOT NULL,
        Caption         NVARCHAR(500)   NULL,
        UploadedAt      DATETIME2       NOT NULL CONSTRAINT DF_ProjectPhotos_UploadedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ProjectPhotos_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.ProjectCustomData', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectCustomData
    (
        Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectCustomData PRIMARY KEY,
        ProjectId       INT             NOT NULL,
        [Key]           NVARCHAR(200)   NOT NULL,
        Value           NVARCHAR(MAX)   NOT NULL,
        CONSTRAINT FK_ProjectCustomData_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.WarehouseItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WarehouseItems
    (
        Id                  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_WarehouseItems PRIMARY KEY,
        Name                NVARCHAR(200)   NOT NULL,
        Category            NVARCHAR(100)   NOT NULL,
        Unit                NVARCHAR(50)    NOT NULL,
        QuantityInStock     DECIMAL(18,2)   NOT NULL CONSTRAINT DF_WarehouseItems_Qty DEFAULT (0),
        Price               DECIMAL(18,2)   NULL,
        Supplier            NVARCHAR(200)   NULL,
        Notes               NVARCHAR(MAX)   NULL,
        LowStockThreshold   DECIMAL(18,2)   NULL
    )
END

-- Identity must exist before ProjectWorkers FK to AspNetUsers
IF OBJECT_ID(N'dbo.AuthSecurityLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthSecurityLogs
    (
        Id              BIGINT          NOT NULL IDENTITY(1,1) CONSTRAINT PK_AuthSecurityLogs PRIMARY KEY,
        EventType       NVARCHAR(50)    NOT NULL,
        ActorUserId     NVARCHAR(128)   NULL,
        TargetUserId    NVARCHAR(128)   NULL,
        IpAddress       NVARCHAR(45)    NULL,
        CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_AuthSecurityLogs_CreatedAt DEFAULT (SYSUTCDATETIME())
    )
END

IF OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetRoles
    (
        Id               NVARCHAR(128)   NOT NULL CONSTRAINT PK_AspNetRoles PRIMARY KEY,
        Name             NVARCHAR(256)   NULL,
        NormalizedName   NVARCHAR(256)   NULL,
        ConcurrencyStamp NVARCHAR(MAX)   NULL
    )
    CREATE UNIQUE INDEX UX_AspNetRoles_NormalizedName ON dbo.AspNetRoles(NormalizedName) WHERE NormalizedName IS NOT NULL
END

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUsers
    (
        Id                      NVARCHAR(128)   NOT NULL CONSTRAINT PK_AspNetUsers PRIMARY KEY,
        UserName                NVARCHAR(256)   NULL,
        NormalizedUserName      NVARCHAR(256)   NULL,
        PasswordHash            NVARCHAR(MAX)   NULL,
        SecurityStamp           NVARCHAR(MAX)   NULL,
        ConcurrencyStamp        NVARCHAR(MAX)   NULL,
        PhoneNumber             NVARCHAR(MAX)   NULL,
        LockoutEnd              DATETIMEOFFSET  NULL,
        LockoutEnabled          BIT             NOT NULL,
        AccessFailedCount       INT             NOT NULL,
        FullName                NVARCHAR(200)   NOT NULL CONSTRAINT DF_AspNetUsers_FullName DEFAULT (N''),
        IsActive                BIT             NOT NULL CONSTRAINT DF_AspNetUsers_IsActive DEFAULT (1),
        IsBlocked               BIT             NOT NULL CONSTRAINT DF_AspNetUsers_IsBlocked DEFAULT (0),
        BlockedAt               DATETIMEOFFSET  NULL,
        FailedLoginCount        INT             NOT NULL CONSTRAINT DF_AspNetUsers_FailedLoginCount DEFAULT (0),
        CreatedAt               DATETIMEOFFSET  NOT NULL CONSTRAINT DF_AspNetUsers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        WorkerType              NVARCHAR(20)    NULL,
        CardNumber              NVARCHAR(16)    NULL,
        CONSTRAINT CK_AspNetUsers_WorkerType CHECK (WorkerType IS NULL OR WorkerType IN (N'Assembler', N'Installer'))
    )
    CREATE UNIQUE INDEX UX_AspNetUsers_NormalizedUserName ON dbo.AspNetUsers(NormalizedUserName) WHERE NormalizedUserName IS NOT NULL
    CREATE INDEX IX_AspNetUsers_WorkerType ON dbo.AspNetUsers(WorkerType) WHERE WorkerType IS NOT NULL
END

IF OBJECT_ID(N'dbo.AspNetRoleClaims', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetRoleClaims
    (
        Id          INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_AspNetRoleClaims PRIMARY KEY,
        RoleId      NVARCHAR(128)   NOT NULL,
        ClaimType   NVARCHAR(MAX)   NULL,
        ClaimValue  NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_AspNetRoleClaims_AspNetRoles FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.AspNetUserClaims', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserClaims
    (
        Id          INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_AspNetUserClaims PRIMARY KEY,
        UserId      NVARCHAR(128)   NOT NULL,
        ClaimType   NVARCHAR(MAX)   NULL,
        ClaimValue  NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_AspNetUserClaims_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.AspNetUserLogins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserLogins
    (
        LoginProvider       NVARCHAR(128)   NOT NULL,
        ProviderKey         NVARCHAR(128)   NOT NULL,
        ProviderDisplayName NVARCHAR(MAX)   NULL,
        UserId              NVARCHAR(128)   NOT NULL,
        CONSTRAINT PK_AspNetUserLogins PRIMARY KEY (LoginProvider, ProviderKey),
        CONSTRAINT FK_AspNetUserLogins_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserRoles
    (
        UserId  NVARCHAR(128) NOT NULL,
        RoleId  NVARCHAR(128) NOT NULL,
        CONSTRAINT PK_AspNetUserRoles PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_AspNetUserRoles_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE,
        CONSTRAINT FK_AspNetUserRoles_AspNetRoles FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.AspNetUserTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserTokens
    (
        UserId          NVARCHAR(128) NOT NULL,
        LoginProvider   NVARCHAR(128) NOT NULL,
        Name            NVARCHAR(128) NOT NULL,
        Value           NVARCHAR(MAX) NULL,
        CONSTRAINT PK_AspNetUserTokens PRIMARY KEY (UserId, LoginProvider, Name),
        CONSTRAINT FK_AspNetUserTokens_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    )
END

IF OBJECT_ID(N'dbo.ProjectWorkers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectWorkers
    (
        Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectWorkers PRIMARY KEY,
        ProjectId       INT             NOT NULL,
        UserId          NVARCHAR(128)   NOT NULL,
        RoleOnProject   NVARCHAR(100)   NULL,
        AssignedAt      DATETIME2       NOT NULL CONSTRAINT DF_ProjectWorkers_AssignedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ProjectWorkers_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectWorkers_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id),
        CONSTRAINT UQ_ProjectWorkers_Project_User UNIQUE (ProjectId, UserId)
    )
END

IF OBJECT_ID(N'dbo.ProjectItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectItems
    (
        Id                  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectItems PRIMARY KEY,
        ProjectId           INT             NOT NULL,
        WarehouseItemId     INT             NULL,
        QuantityNeeded      DECIMAL(18,2)   NOT NULL,
        QuantityFromStock   DECIMAL(18,2)   NOT NULL,
        QuantityToPurchase  DECIMAL(18,2)   NOT NULL CONSTRAINT DF_ProjectItems_ToPurchase DEFAULT (0),
        NeedsPurchase       BIT             NOT NULL CONSTRAINT DF_ProjectItems_NeedsPurchase DEFAULT (0),
        CostFromStock       DECIMAL(18,2)   NULL,
        RequestedName       NVARCHAR(200)   NULL,
        RequestedCategory   NVARCHAR(100)   NULL,
        RequestedUnit       NVARCHAR(50)    NULL,
        CONSTRAINT FK_ProjectItems_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectItems_WarehouseItems FOREIGN KEY (WarehouseItemId) REFERENCES dbo.WarehouseItems(Id),
        CONSTRAINT CK_ProjectItems_CostFromStock CHECK (CostFromStock IS NULL OR CostFromStock >= 0),
        CONSTRAINT CK_ProjectItems_CatalogOrRequested CHECK (
            (WarehouseItemId IS NOT NULL
             AND RequestedName IS NULL
             AND RequestedCategory IS NULL
             AND RequestedUnit IS NULL)
            OR
            (WarehouseItemId IS NULL
             AND RequestedName IS NOT NULL
             AND RequestedCategory IS NOT NULL
             AND RequestedUnit IS NOT NULL)
        )
    )

    CREATE UNIQUE INDEX UQ_ProjectItems_Project_WarehouseItem
        ON dbo.ProjectItems (ProjectId, WarehouseItemId)
        WHERE WarehouseItemId IS NOT NULL

    CREATE UNIQUE INDEX UQ_ProjectItems_Project_RequestedName
        ON dbo.ProjectItems (ProjectId, RequestedName)
        WHERE WarehouseItemId IS NULL
END

IF OBJECT_ID(N'dbo.WarehouseStockLots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WarehouseStockLots
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WarehouseStockLots PRIMARY KEY,
        WarehouseItemId INT NOT NULL,
        UnitCost DECIMAL(18,2) NOT NULL,
        QuantityOnHand DECIMAL(18,2) NOT NULL,
        QuantityReceived DECIMAL(18,2) NOT NULL,
        ReceivedAt DATETIME2 NOT NULL,
        Supplier NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_WarehouseStockLots_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_WarehouseStockLots_WarehouseItems
            FOREIGN KEY (WarehouseItemId) REFERENCES dbo.WarehouseItems (Id),
        CONSTRAINT CK_WarehouseStockLots_UnitCost CHECK (UnitCost >= 0),
        CONSTRAINT CK_WarehouseStockLots_QuantityOnHand CHECK (QuantityOnHand >= 0),
        CONSTRAINT CK_WarehouseStockLots_QuantityReceived CHECK (QuantityReceived > 0)
    )

    CREATE INDEX IX_WarehouseStockLots_WarehouseItem_ReceivedAt
        ON dbo.WarehouseStockLots (WarehouseItemId, ReceivedAt)
END

IF OBJECT_ID(N'dbo.ProjectItemLotAllocations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectItemLotAllocations
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProjectItemLotAllocations PRIMARY KEY,
        ProjectItemId INT NOT NULL,
        WarehouseStockLotId INT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        CONSTRAINT FK_ProjectItemLotAllocations_ProjectItems
            FOREIGN KEY (ProjectItemId) REFERENCES dbo.ProjectItems (Id) ON DELETE CASCADE,
        CONSTRAINT FK_ProjectItemLotAllocations_WarehouseStockLots
            FOREIGN KEY (WarehouseStockLotId) REFERENCES dbo.WarehouseStockLots (Id),
        CONSTRAINT CK_ProjectItemLotAllocations_Quantity CHECK (Quantity > 0),
        CONSTRAINT UQ_ProjectItemLotAllocations_Item_Lot UNIQUE (ProjectItemId, WarehouseStockLotId)
    )

    CREATE INDEX IX_ProjectItemLotAllocations_WarehouseStockLotId
        ON dbo.ProjectItemLotAllocations (WarehouseStockLotId)
END

IF OBJECT_ID(N'dbo.ProjectExpenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectExpenses
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProjectExpenses PRIMARY KEY,
        ProjectId INT NOT NULL,
        Category NVARCHAR(200) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        ExpenseDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProjectExpenses_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProjectExpenses_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ProjectExpenses_Projects
            FOREIGN KEY (ProjectId) REFERENCES dbo.Projects (Id) ON DELETE CASCADE,
        CONSTRAINT CK_ProjectExpenses_Amount CHECK (Amount > 0),
        CONSTRAINT CK_ProjectExpenses_Category CHECK (LEN(LTRIM(RTRIM(Category))) > 0)
    )

    CREATE INDEX IX_ProjectExpenses_ProjectId
        ON dbo.ProjectExpenses (ProjectId)
END

IF OBJECT_ID(N'dbo.__SchemaPatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__SchemaPatches
    (
        PatchName NVARCHAR(100) NOT NULL CONSTRAINT PK___SchemaPatches PRIMARY KEY,
        AppliedAt DATETIME2 NOT NULL CONSTRAINT DF___SchemaPatches_AppliedAt DEFAULT (SYSUTCDATETIME())
    )
END

------------------------------------------------------------------
-- Indexes (idempotent)
------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Projects_Status' AND object_id = OBJECT_ID(N'dbo.Projects'))
    CREATE INDEX IX_Projects_Status ON dbo.Projects(Status)

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Projects_Name' AND object_id = OBJECT_ID(N'dbo.Projects'))
    CREATE INDEX IX_Projects_Name ON dbo.Projects(Name)

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WarehouseItems_Category' AND object_id = OBJECT_ID(N'dbo.WarehouseItems'))
    CREATE INDEX IX_WarehouseItems_Category ON dbo.WarehouseItems(Category)

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProjectWorkers_UserId' AND object_id = OBJECT_ID(N'dbo.ProjectWorkers'))
    CREATE INDEX IX_ProjectWorkers_UserId ON dbo.ProjectWorkers(UserId)

------------------------------------------------------------------
-- Ensure Admin + Worker roles exist (users seeded by the app)
------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles WHERE NormalizedName = N'ADMIN')
BEGIN
    INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (CONVERT(NVARCHAR(128), NEWID()), N'Admin', N'ADMIN', CONVERT(NVARCHAR(MAX), NEWID()))
END

IF NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles WHERE NormalizedName = N'WORKER')
BEGIN
    INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (CONVERT(NVARCHAR(128), NEWID()), N'Worker', N'WORKER', CONVERT(NVARCHAR(MAX), NEWID()))
END

-- Mark one-time data patches as applied so incremental scripts skip them on a fresh host DB
IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'013_RestoreOpenProjectReservedStock')
    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'013_RestoreOpenProjectReservedStock')

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'014_WarehouseStockLots_Migrate')
    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'014_WarehouseStockLots_Migrate')

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'016_ProjectItemCostFromStock_Backfill')
    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'016_ProjectItemCostFromStock_Backfill')

PRINT N'FreshInstall completed. Connect the app and set Auth:SeedAdmins passwords.'
