-- Recovery: unblock a login account by username (case-insensitive).
-- Usage (LocalDB example):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -v Username=N"admin" -i database\005_UnblockUserByUsername.sql
--
-- Or edit @Username below and run in SSMS.

USE SellaSolarAdmin;
GO

DECLARE @Username NVARCHAR(256) = N'$(Username)'; -- sqlcmd variable; override in SSMS if needed

IF @Username IS NULL OR LTRIM(RTRIM(@Username)) = N''
BEGIN
    RAISERROR(N'Username is required.', 16, 1);
    RETURN;
END

DECLARE @Normalized NVARCHAR(256) = UPPER(LTRIM(RTRIM(@Username)));

UPDATE dbo.AspNetUsers
SET IsBlocked = 0,
    BlockedAt = NULL,
    FailedLoginCount = 0
WHERE NormalizedUserName = @Normalized;

IF @@ROWCOUNT = 0
BEGIN
    RAISERROR(N'No user found with that username.', 16, 1);
END
ELSE
BEGIN
    PRINT N'User unblocked successfully.';
END
GO
