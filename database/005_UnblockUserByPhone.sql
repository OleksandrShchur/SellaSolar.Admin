-- Recovery: unblock a login account by phone (canonical 0XXXXXXXXX).
-- Usage (LocalDB example):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -v Phone=N"0982441170" -i database\005_UnblockUserByPhone.sql
--
-- Or edit @Phone below and run in SSMS.

USE SellaSolarAdmin;
GO

DECLARE @Phone NVARCHAR(256) = N'$(Phone)'; -- sqlcmd variable; override in SSMS if needed

IF @Phone IS NULL OR LTRIM(RTRIM(@Phone)) = N''
BEGIN
    RAISERROR(N'Phone is required (format 0XXXXXXXXX).', 16, 1);
    RETURN;
END

DECLARE @Normalized NVARCHAR(256) = LTRIM(RTRIM(@Phone));

UPDATE dbo.AspNetUsers
SET IsBlocked = 0,
    BlockedAt = NULL,
    FailedLoginCount = 0
WHERE NormalizedUserName = @Normalized
   OR PhoneNumber = @Normalized;

IF @@ROWCOUNT = 0
BEGIN
    RAISERROR(N'No user found with that phone.', 16, 1);
END
ELSE
BEGIN
    PRINT N'User unblocked successfully.';
END
GO
