-- One-time fix: seed ProjectItems historically set QuantityFromStock without
-- reducing WarehouseItems.QuantityInStock. Deduct those amounts once.
-- Idempotent guard: only runs if inverter #2 still has the undeducted seed qty (12)
-- while open+completed project items claim QuantityFromStock against it.
-- Safe to re-run: the guard skips after stock is corrected.
-- Apply with: sqlcmd ... -i database\012_ReconcileUndeductedProjectStock.sql -I

USE SellaSolarAdmin;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (
    SELECT 1
    FROM dbo.WarehouseItems wi
    WHERE wi.Id = 2
      AND wi.QuantityInStock = 12
      AND (
          SELECT SUM(pi.QuantityFromStock)
          FROM dbo.ProjectItems pi
          WHERE pi.WarehouseItemId = 2
      ) >= 4
)
BEGIN
    UPDATE wi
    SET wi.QuantityInStock = wi.QuantityInStock - x.Taken
    FROM dbo.WarehouseItems wi
    INNER JOIN (
        SELECT WarehouseItemId, SUM(QuantityFromStock) AS Taken
        FROM dbo.ProjectItems
        WHERE WarehouseItemId IS NOT NULL
        GROUP BY WarehouseItemId
    ) x ON x.WarehouseItemId = wi.Id;

    PRINT N'Reconciled warehouse stock from ProjectItems.QuantityFromStock.';
END
ELSE
BEGIN
    PRINT N'Skip reconcile (stock already looks deducted or data differs from seed).';
END
GO
