-- Persist CostFromStock on ProjectItems (project costing snapshot).
-- Also backfill lot allocations for completed/legacy lines that had QuantityFromStock
-- but no ProjectItemLotAllocations (014 only auto-allocated open projects).
-- Idempotent via COL_LENGTH + __SchemaPatches.

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

IF COL_LENGTH(N'dbo.ProjectItems', N'CostFromStock') IS NULL
BEGIN
    ALTER TABLE dbo.ProjectItems
        ADD CostFromStock DECIMAL(18,2) NULL
            CONSTRAINT CK_ProjectItems_CostFromStock CHECK (CostFromStock IS NULL OR CostFromStock >= 0);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.__SchemaPatches WHERE PatchName = N'016_ProjectItemCostFromStock_Backfill')
BEGIN
    -- 1) Lines that already have allocations: persist Σ qty × unitCost.
    UPDATE pi
    SET pi.CostFromStock = x.Cost
    FROM dbo.ProjectItems pi
    INNER JOIN (
        SELECT
            a.ProjectItemId,
            SUM(a.Quantity * l.UnitCost) AS Cost
        FROM dbo.ProjectItemLotAllocations a
        INNER JOIN dbo.WarehouseStockLots l ON l.Id = a.WarehouseStockLotId
        GROUP BY a.ProjectItemId
    ) x ON x.ProjectItemId = pi.Id;

    -- 2) Legacy catalog lines with stock usage but no allocations:
    --    create a historical lot (on-hand 0 = already consumed) + allocation, then set cost.
    --    Reopening will restore on-hand onto that lot via existing RestoreConsumedAllocations.
    DECLARE @legacy TABLE
    (
        ProjectItemId INT NOT NULL,
        WarehouseItemId INT NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        UnitCost DECIMAL(18,2) NOT NULL
    );

    INSERT INTO @legacy (ProjectItemId, WarehouseItemId, Quantity, UnitCost)
    SELECT
        pi.Id,
        pi.WarehouseItemId,
        pi.QuantityFromStock,
        ISNULL(wi.Price, 0)
    FROM dbo.ProjectItems pi
    INNER JOIN dbo.WarehouseItems wi ON wi.Id = pi.WarehouseItemId
    WHERE pi.WarehouseItemId IS NOT NULL
      AND pi.QuantityFromStock > 0
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.ProjectItemLotAllocations a
          WHERE a.ProjectItemId = pi.Id
      );

    DECLARE @ProjectItemId INT;
    DECLARE @WarehouseItemId INT;
    DECLARE @Quantity DECIMAL(18,2);
    DECLARE @UnitCost DECIMAL(18,2);
    DECLARE @NewLotId INT;

    DECLARE legacy_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT ProjectItemId, WarehouseItemId, Quantity, UnitCost FROM @legacy;

    OPEN legacy_cursor;
    FETCH NEXT FROM legacy_cursor INTO @ProjectItemId, @WarehouseItemId, @Quantity, @UnitCost;

    WHILE @@FETCH_STATUS = 0
    BEGIN
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
        VALUES
        (
            @WarehouseItemId,
            @UnitCost,
            0,              -- already consumed by completed / pre-lot project
            @Quantity,
            SYSUTCDATETIME(),
            NULL,
            N'Historical: stock used by project before lot allocations existed',
            SYSUTCDATETIME()
        );

        SET @NewLotId = SCOPE_IDENTITY();

        INSERT INTO dbo.ProjectItemLotAllocations (ProjectItemId, WarehouseStockLotId, Quantity)
        VALUES (@ProjectItemId, @NewLotId, @Quantity);

        UPDATE dbo.ProjectItems
        SET CostFromStock = @Quantity * @UnitCost
        WHERE Id = @ProjectItemId;

        FETCH NEXT FROM legacy_cursor INTO @ProjectItemId, @WarehouseItemId, @Quantity, @UnitCost;
    END

    CLOSE legacy_cursor;
    DEALLOCATE legacy_cursor;

    INSERT INTO dbo.__SchemaPatches (PatchName) VALUES (N'016_ProjectItemCostFromStock_Backfill');
    PRINT N'016: CostFromStock column + backfill / legacy historical lots.';
END
ELSE
BEGIN
    PRINT N'Skip 016 backfill (already applied).';
END
GO
