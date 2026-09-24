-- Drop unused ASP.NET Identity columns from AspNetUsers.
-- Phone is the login; email and two-factor are not used.
-- Idempotent: safe to re-run. Apply after 001–007 on existing databases.
-- Fresh installs: 004 no longer creates these columns; this script is a no-op.

USE SellaSolarAdmin;
GO

-- Drop EmailIndex if present (default Identity index on NormalizedEmail)
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'EmailIndex'
      AND object_id = OBJECT_ID(N'dbo.AspNetUsers'))
BEGIN
    DROP INDEX EmailIndex ON dbo.AspNetUsers;
END
GO

-- Drop default constraints on columns we are about to remove
DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'ALTER TABLE dbo.AspNetUsers DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
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
      N'TwoFactorEnabled');

IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'Email') IS NOT NULL
    ALTER TABLE dbo.AspNetUsers DROP COLUMN Email;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'NormalizedEmail') IS NOT NULL
    ALTER TABLE dbo.AspNetUsers DROP COLUMN NormalizedEmail;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'EmailConfirmed') IS NOT NULL
    ALTER TABLE dbo.AspNetUsers DROP COLUMN EmailConfirmed;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'PhoneNumberConfirmed') IS NOT NULL
    ALTER TABLE dbo.AspNetUsers DROP COLUMN PhoneNumberConfirmed;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'TwoFactorEnabled') IS NOT NULL
    ALTER TABLE dbo.AspNetUsers DROP COLUMN TwoFactorEnabled;
GO

PRINT N'Dropped unused AspNetUsers identity columns (if they existed).';
GO
