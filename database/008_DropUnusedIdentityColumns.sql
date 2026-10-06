-- Drop unused ASP.NET Identity columns from AspNetUsers.
-- Phone is the login - email and two-factor are not used.
-- Idempotent: safe to re-run. Apply after 001-007 on existing databases.
-- Fresh installs: 004 no longer creates these columns - this script is a no-op.
-- Hosting-safe: no GO / USE / statement semicolons.

SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @ConstraintName SYSNAME
DECLARE @DropSql NVARCHAR(500)

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'EmailIndex'
      AND object_id = OBJECT_ID(N'dbo.AspNetUsers'))
BEGIN
    DROP INDEX EmailIndex ON dbo.AspNetUsers
END

-- Drop default constraints one-by-one (no ';' in source - MonsterASP splits on it)
WHILE 1 = 1
BEGIN
    SET @ConstraintName = NULL
    SELECT TOP (1) @ConstraintName = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.default_object_id = dc.object_id
       AND c.object_id = dc.parent_object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.AspNetUsers')
      AND c.name IN (
          N'Email',
          N'NormalizedEmail',
          N'EmailConfirmed',
          N'PhoneNumberConfirmed',
          N'TwoFactorEnabled')

    IF @ConstraintName IS NULL
        BREAK

    SET @DropSql = N'ALTER TABLE dbo.AspNetUsers DROP CONSTRAINT ' + QUOTENAME(@ConstraintName)
    EXEC sp_executesql @DropSql
END

IF COL_LENGTH(N'dbo.AspNetUsers', N'Email') IS NOT NULL
    EXEC(N'ALTER TABLE dbo.AspNetUsers DROP COLUMN Email')

IF COL_LENGTH(N'dbo.AspNetUsers', N'NormalizedEmail') IS NOT NULL
    EXEC(N'ALTER TABLE dbo.AspNetUsers DROP COLUMN NormalizedEmail')

IF COL_LENGTH(N'dbo.AspNetUsers', N'EmailConfirmed') IS NOT NULL
    EXEC(N'ALTER TABLE dbo.AspNetUsers DROP COLUMN EmailConfirmed')

IF COL_LENGTH(N'dbo.AspNetUsers', N'PhoneNumberConfirmed') IS NOT NULL
    EXEC(N'ALTER TABLE dbo.AspNetUsers DROP COLUMN PhoneNumberConfirmed')

IF COL_LENGTH(N'dbo.AspNetUsers', N'TwoFactorEnabled') IS NOT NULL
    EXEC(N'ALTER TABLE dbo.AspNetUsers DROP COLUMN TwoFactorEnabled')

PRINT N'Dropped unused AspNetUsers identity columns (if they existed).'
