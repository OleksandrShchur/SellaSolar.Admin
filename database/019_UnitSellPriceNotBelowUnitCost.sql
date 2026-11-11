-- Enforce UnitSellPrice >= UnitCost when sell price is set.
-- Idempotent via constraint name check + __SchemaPatches.
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

IF OBJECT_ID(N'dbo.CK_WarehouseStockLots_UnitSellPrice_GteUnitCost', N'C') IS NULL
   AND COL_LENGTH(N'dbo.WarehouseStockLots', N'UnitSellPrice') IS NOT NULL
BEGIN
    EXEC(N'
        ALTER TABLE dbo.WarehouseStockLots
            ADD CONSTRAINT CK_WarehouseStockLots_UnitSellPrice_GteUnitCost
            CHECK (UnitSellPrice IS NULL OR UnitSellPrice >= UnitCost)
    ')
END

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'019_UnitSellPriceNotBelowUnitCost')
BEGIN
    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'019_UnitSellPriceNotBelowUnitCost')
    PRINT N'019: UnitSellPrice must be >= UnitCost when set.'
END
ELSE
BEGIN
    PRINT N'Skip 019 (already applied).'
END
