-- Restore stock reserved by open projects that was incorrectly deducted on assign.
-- New rule: QuantityInStock includes items assigned to Awaiting/InProgress
-- only Completed projects consume stock.
-- Idempotent via __SchemaPatches.
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

EXEC(N'
IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N''013_RestoreOpenProjectReservedStock'')
BEGIN
    UPDATE wi
    SET wi.QuantityInStock = wi.QuantityInStock + x.Reserved
    FROM dbo.WarehouseItems wi
    INNER JOIN (
        SELECT pi.WarehouseItemId, SUM(pi.QuantityFromStock) AS Reserved
        FROM dbo.ProjectItems pi
        INNER JOIN dbo.Projects p ON p.Id = pi.ProjectId
        WHERE pi.WarehouseItemId IS NOT NULL
          AND p.Status IN (N''Awaiting'', N''InProgress'')
        GROUP BY pi.WarehouseItemId
    ) x ON x.WarehouseItemId = wi.Id

    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N''013_RestoreOpenProjectReservedStock'')
    PRINT N''Restored open-project reserved stock onto warehouse QuantityInStock.''
END
ELSE
BEGIN
    PRINT N''Skip 013 (already applied).''
END
')
