-- Warehouse stock lots + project item lot allocations (manual costing).
-- One-time: migrate existing QuantityInStock into a single lot per item;
-- soft-reserve open-project QuantityFromStock against that lot.
-- Idempotent via __SchemaPatches.

USE SellaSolarAdmin;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.__SchemaPatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__SchemaPatches
    (
        PatchName NVARCHAR(100) NOT NULL CONSTRAINT PK___SchemaPatches PRIMARY KEY,
        AppliedAt DATETIME2 NOT NULL CONSTRAINT DF___SchemaPatches_AppliedAt DEFAULT (SYSUTCDATETIME())
    );
END
GO

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
    );

    CREATE INDEX IX_WarehouseStockLots_WarehouseItem_ReceivedAt
        ON dbo.WarehouseStockLots (WarehouseItemId, ReceivedAt);
END
GO

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
    );

    CREATE INDEX IX_ProjectItemLotAllocations_WarehouseStockLotId
        ON dbo.ProjectItemLotAllocations (WarehouseStockLotId);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'014_WarehouseStockLots_Migrate')
BEGIN
    -- One lot per catalog item that still has on-hand stock.
    INSERT INTO dbo.WarehouseStockLots
    (
        WarehouseItemId,
        UnitCost,
        QuantityOnHand,
        QuantityReceived,
        ReceivedAt,
        Supplier,
        Notes,
        CreatedAt
    )
    SELECT
        wi.Id,
        ISNULL(wi.Price, 0),
        wi.QuantityInStock,
        wi.QuantityInStock,
        SYSUTCDATETIME(),
        wi.Supplier,
        N'Migrated from pre-lot stock',
        SYSUTCDATETIME()
    FROM dbo.WarehouseItems wi
    WHERE wi.QuantityInStock > 0
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.WarehouseStockLots l
          WHERE l.WarehouseItemId = wi.Id
      );

    -- Soft-reserve open-project lines against the migrated lot (one-time auto-fill).
    -- Going forward, allocations are always set manually in the UI.
    INSERT INTO dbo.ProjectItemLotAllocations (ProjectItemId, WarehouseStockLotId, Quantity)
    SELECT
        pi.Id,
        lot.Id,
        pi.QuantityFromStock
    FROM dbo.ProjectItems pi
    INNER JOIN dbo.Projects p ON p.Id = pi.ProjectId
    INNER JOIN dbo.WarehouseStockLots lot ON lot.WarehouseItemId = pi.WarehouseItemId
    WHERE pi.WarehouseItemId IS NOT NULL
      AND pi.QuantityFromStock > 0
      AND p.Status IN (N'Awaiting', N'InProgress')
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.ProjectItemLotAllocations a
          WHERE a.ProjectItemId = pi.Id
      );

    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'014_WarehouseStockLots_Migrate');
    PRINT N'014: created lots tables and migrated existing stock / open allocations.';
END
ELSE
BEGIN
    PRINT N'Skip 014 migrate (already applied).';
END
GO
