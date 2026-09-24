-- Add Awaiting to project statuses.
-- Allowed: Awaiting | InProgress | Completed
-- Idempotent: safe to re-run. Apply after 001–009 on existing databases.

USE SellaSolarAdmin;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Projects_Status'
      AND parent_object_id = OBJECT_ID(N'dbo.Projects')
)
BEGIN
    ALTER TABLE dbo.Projects DROP CONSTRAINT CK_Projects_Status;
END
GO

IF OBJECT_ID(N'dbo.Projects', N'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.check_constraints
       WHERE name = N'CK_Projects_Status'
         AND parent_object_id = OBJECT_ID(N'dbo.Projects')
   )
BEGIN
    ALTER TABLE dbo.Projects
        ADD CONSTRAINT CK_Projects_Status
        CHECK (Status IN (N'Awaiting', N'InProgress', N'Completed'));
END
GO
