-- Restore stock reserved by open projects that was incorrectly deducted on assign.
-- New rule: QuantityInStock includes items assigned to Awaiting/InProgress;
-- only Completed projects consume stock.
-- Idempotent: adds back open-project QuantityFromStock once (guarded by a marker note is fragile;
-- instead: only restore when on-hand + open reserved would match expected seed-like undercount).
-- Safer approach: always add open reserved amounts that are "missing" by comparing:
--   if QuantityInStock appears already to include open reservations, skip.
-- Practically: add SUM(open QuantityFromStock) to warehouse, once, using a control table flag.

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

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'013_RestoreOpenProjectReservedStock')
BEGIN
    UPDATE wi
    SET wi.QuantityInStock = wi.QuantityInStock + x.Reserved
    FROM dbo.WarehouseItems wi
    INNER JOIN (
        SELECT pi.WarehouseItemId, SUM(pi.QuantityFromStock) AS Reserved
        FROM dbo.ProjectItems pi
        INNER JOIN dbo.Projects p ON p.Id = pi.ProjectId
        WHERE pi.WarehouseItemId IS NOT NULL
          AND p.Status IN (N'Awaiting', N'InProgress')
        GROUP BY pi.WarehouseItemId
    ) x ON x.WarehouseItemId = wi.Id;

    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'013_RestoreOpenProjectReservedStock');
    PRINT N'Restored open-project reserved stock onto warehouse QuantityInStock.';
END
ELSE
BEGIN
    PRINT N'Skip 013 (already applied).';
END
GO
