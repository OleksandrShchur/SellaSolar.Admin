-- Per-lot selling price (UnitSellPrice) + project SellFromStock snapshot.
-- Idempotent via COL_LENGTH + __SchemaPatches.
-- Hosting-safe: no GO / USE.

SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

IF OBJECT_ID(N'dbo.__SchemaPatches', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__SchemaPatches
    (
        PatchName NVARCHAR(100) NOT NULL CONSTRAINT PK___SchemaPatches PRIMARY KEY,
        AppliedAt DATETIME2 NOT NULL CONSTRAINT DF___SchemaPatches_AppliedAt DEFAULT (SYSUTCDATETIME())
    )
END

IF COL_LENGTH(N'dbo.WarehouseStockLots', N'UnitSellPrice') IS NULL
BEGIN
    EXEC(N'
        ALTER TABLE dbo.WarehouseStockLots
            ADD UnitSellPrice DECIMAL(18,2) NULL
                CONSTRAINT CK_WarehouseStockLots_UnitSellPrice CHECK (UnitSellPrice IS NULL OR UnitSellPrice >= 0)
    ')
END

IF COL_LENGTH(N'dbo.ProjectItems', N'SellFromStock') IS NULL
BEGIN
    EXEC(N'
        ALTER TABLE dbo.ProjectItems
            ADD SellFromStock DECIMAL(18,2) NULL
                CONSTRAINT CK_ProjectItems_SellFromStock CHECK (SellFromStock IS NULL OR SellFromStock >= 0)
    ')
END

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'018_WarehouseLotUnitSellPrice')
BEGIN
    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'018_WarehouseLotUnitSellPrice')
    PRINT N'018: UnitSellPrice on WarehouseStockLots + SellFromStock on ProjectItems.'
END
ELSE
BEGIN
    PRINT N'Skip 018 (already applied).'
END
