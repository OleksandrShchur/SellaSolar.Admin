-- Allow non-catalog project materials (nullable WarehouseItemId + requested fields).
-- Idempotent: safe to re-run. Apply after 001–010 on existing databases.

USE SellaSolarAdmin;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- Drop old unique constraint so WarehouseItemId can be nullable / filtered.
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_ProjectItems_Project_WarehouseItem'
      AND object_id = OBJECT_ID(N'dbo.ProjectItems')
)
BEGIN
    ALTER TABLE dbo.ProjectItems DROP CONSTRAINT UQ_ProjectItems_Project_WarehouseItem;
END
GO

-- Nullable WarehouseItemId
IF COL_LENGTH(N'dbo.ProjectItems', N'WarehouseItemId') IS NOT NULL
   AND EXISTS (
       SELECT 1
       FROM sys.columns
       WHERE object_id = OBJECT_ID(N'dbo.ProjectItems')
         AND name = N'WarehouseItemId'
         AND is_nullable = 0
   )
BEGIN
    ALTER TABLE dbo.ProjectItems ALTER COLUMN WarehouseItemId INT NULL;
END
GO

IF COL_LENGTH(N'dbo.ProjectItems', N'RequestedName') IS NULL
BEGIN
    ALTER TABLE dbo.ProjectItems ADD RequestedName NVARCHAR(200) NULL;
END
GO

IF COL_LENGTH(N'dbo.ProjectItems', N'RequestedCategory') IS NULL
BEGIN
    ALTER TABLE dbo.ProjectItems ADD RequestedCategory NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH(N'dbo.ProjectItems', N'RequestedUnit') IS NULL
BEGIN
    ALTER TABLE dbo.ProjectItems ADD RequestedUnit NVARCHAR(50) NULL;
END
GO

-- Either catalog item OR all three requested fields.
IF OBJECT_ID(N'dbo.ProjectItems', N'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.check_constraints
       WHERE name = N'CK_ProjectItems_CatalogOrRequested'
         AND parent_object_id = OBJECT_ID(N'dbo.ProjectItems')
   )
BEGIN
    ALTER TABLE dbo.ProjectItems
        ADD CONSTRAINT CK_ProjectItems_CatalogOrRequested
        CHECK (
            (WarehouseItemId IS NOT NULL
             AND RequestedName IS NULL
             AND RequestedCategory IS NULL
             AND RequestedUnit IS NULL)
            OR
            (WarehouseItemId IS NULL
             AND RequestedName IS NOT NULL
             AND RequestedCategory IS NOT NULL
             AND RequestedUnit IS NOT NULL)
        );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_ProjectItems_Project_WarehouseItem'
      AND object_id = OBJECT_ID(N'dbo.ProjectItems')
)
BEGIN
    CREATE UNIQUE INDEX UQ_ProjectItems_Project_WarehouseItem
        ON dbo.ProjectItems (ProjectId, WarehouseItemId)
        WHERE WarehouseItemId IS NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UQ_ProjectItems_Project_RequestedName'
      AND object_id = OBJECT_ID(N'dbo.ProjectItems')
)
BEGIN
    CREATE UNIQUE INDEX UQ_ProjectItems_Project_RequestedName
        ON dbo.ProjectItems (ProjectId, RequestedName)
        WHERE WarehouseItemId IS NULL;
END
GO
