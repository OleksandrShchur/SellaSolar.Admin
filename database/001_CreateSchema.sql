-- SellaSolar Admin Panel - Database schema (Database-First)
-- Target: SQL Server / LocalDB
-- Run against an empty database named SellaSolarAdmin (or change USE below).

IF DB_ID(N'SellaSolarAdmin') IS NULL
BEGIN
    CREATE DATABASE SellaSolarAdmin;
END
GO

USE SellaSolarAdmin;
GO

-- Drop in dependency order (idempotent re-run for local dev)
IF OBJECT_ID(N'dbo.ProjectItems', N'U') IS NOT NULL DROP TABLE dbo.ProjectItems;
IF OBJECT_ID(N'dbo.ProjectWorkers', N'U') IS NOT NULL DROP TABLE dbo.ProjectWorkers;
IF OBJECT_ID(N'dbo.ProjectPhotos', N'U') IS NOT NULL DROP TABLE dbo.ProjectPhotos;
IF OBJECT_ID(N'dbo.ProjectCustomData', N'U') IS NOT NULL DROP TABLE dbo.ProjectCustomData;
IF OBJECT_ID(N'dbo.Projects', N'U') IS NOT NULL DROP TABLE dbo.Projects;
IF OBJECT_ID(N'dbo.Workers', N'U') IS NOT NULL DROP TABLE dbo.Workers; -- legacy; removed by 006
IF OBJECT_ID(N'dbo.WarehouseItems', N'U') IS NOT NULL DROP TABLE dbo.WarehouseItems;
GO

CREATE TABLE dbo.Projects
(
    Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Projects PRIMARY KEY,
    Name            NVARCHAR(200)   NOT NULL,
    Description     NVARCHAR(MAX)   NULL,
    Address         NVARCHAR(500)   NOT NULL,
    Status          NVARCHAR(20)    NOT NULL CONSTRAINT CK_Projects_Status CHECK (Status IN (N'InProgress', N'Completed')),
    CustomerName    NVARCHAR(200)   NOT NULL,
    CustomerPhone   NVARCHAR(50)    NOT NULL,
    CustomerEmail   NVARCHAR(200)   NULL,
    StartDate       DATETIME2       NULL,
    EndDate         DATETIME2       NULL,
    CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt       DATETIME2       NOT NULL CONSTRAINT DF_Projects_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.ProjectPhotos
(
    Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectPhotos PRIMARY KEY,
    ProjectId       INT             NOT NULL,
    FilePathOrUrl   NVARCHAR(1000)  NOT NULL,
    Caption         NVARCHAR(500)   NULL,
    UploadedAt      DATETIME2       NOT NULL CONSTRAINT DF_ProjectPhotos_UploadedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ProjectPhotos_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.ProjectCustomData
(
    Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectCustomData PRIMARY KEY,
    ProjectId       INT             NOT NULL,
    [Key]           NVARCHAR(200)   NOT NULL,
    Value           NVARCHAR(MAX)   NOT NULL,
    CONSTRAINT FK_ProjectCustomData_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE
);
GO

-- Project assignment targets AspNetUsers (created in 004_IdentitySchema.sql).
-- FK to AspNetUsers is added by 006_MergeWorkersIntoUsers.sql after Identity exists.
CREATE TABLE dbo.ProjectWorkers
(
    Id              INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectWorkers PRIMARY KEY,
    ProjectId       INT             NOT NULL,
    UserId          NVARCHAR(450)   NOT NULL,
    RoleOnProject   NVARCHAR(100)   NULL,
    AssignedAt      DATETIME2       NOT NULL CONSTRAINT DF_ProjectWorkers_AssignedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ProjectWorkers_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ProjectWorkers_Project_User UNIQUE (ProjectId, UserId)
);
GO

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
);
GO

CREATE TABLE dbo.ProjectItems
(
    Id                  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ProjectItems PRIMARY KEY,
    ProjectId           INT             NOT NULL,
    WarehouseItemId     INT             NOT NULL,
    QuantityNeeded      DECIMAL(18,2)   NOT NULL,
    QuantityFromStock   DECIMAL(18,2)   NOT NULL,
    QuantityToPurchase  DECIMAL(18,2)   NOT NULL CONSTRAINT DF_ProjectItems_ToPurchase DEFAULT (0),
    NeedsPurchase       BIT             NOT NULL CONSTRAINT DF_ProjectItems_NeedsPurchase DEFAULT (0),
    CONSTRAINT FK_ProjectItems_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ProjectItems_WarehouseItems FOREIGN KEY (WarehouseItemId) REFERENCES dbo.WarehouseItems(Id),
    CONSTRAINT UQ_ProjectItems_Project_WarehouseItem UNIQUE (ProjectId, WarehouseItemId)
);
GO

CREATE INDEX IX_Projects_Status ON dbo.Projects(Status);
CREATE INDEX IX_Projects_Name ON dbo.Projects(Name);
CREATE INDEX IX_WarehouseItems_Category ON dbo.WarehouseItems(Category);
CREATE INDEX IX_ProjectWorkers_UserId ON dbo.ProjectWorkers(UserId);
GO
