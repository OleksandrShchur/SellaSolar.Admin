-- Recovery: unblock a login account by phone (canonical 0XXXXXXXXX).
-- Hosting-safe: no GO / USE / statement semicolons.
-- Edit @Phone below, then run while connected to the target database.

SET ANSI_NULLS ON
SET QUOTED_IDENTIFIER ON

DECLARE @Phone NVARCHAR(256) = N'0982441170'
DECLARE @Normalized NVARCHAR(256)

SET @Normalized = LTRIM(RTRIM(@Phone))

IF @Normalized IS NULL OR @Normalized = N''
BEGIN
    RAISERROR(N'Phone is required (format 0XXXXXXXXX).', 16, 1)
    RETURN
END

UPDATE dbo.AspNetUsers
SET IsBlocked = 0,
    BlockedAt = NULL,
    FailedLoginCount = 0
WHERE NormalizedUserName = @Normalized
   OR PhoneNumber = @Normalized

IF @@ROWCOUNT = 0
BEGIN
    RAISERROR(N'No user found with that phone.', 16, 1)
END
ELSE
BEGIN
    PRINT N'User unblocked successfully.'
END
