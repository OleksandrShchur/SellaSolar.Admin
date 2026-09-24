-- Normalize Identity logins to Ukrainian phone (canonical 0XXXXXXXXX).
-- Converts +380… / 380… phones, sets UserName = PhoneNumber.
-- Maps legacy seed admins (admin / admin2) to 0981000001 / 0981000002.
--
-- Prerequisites: 004_IdentitySchema.sql (and optionally 006_MergeWorkersIntoUsers.sql)
-- Idempotent / safe to re-run.
--
-- Usage (LocalDB):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\007_PhoneAsUsername.sql

USE SellaSolarAdmin;
GO

SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

------------------------------------------------------------------
-- 1) Normalize PhoneNumber: +380XXXXXXXXX / 380XXXXXXXXX -> 0XXXXXXXXX
------------------------------------------------------------------
UPDATE dbo.AspNetUsers
SET PhoneNumber =
    CASE
        WHEN PhoneNumber LIKE N'+380%'
             AND LEN(REPLACE(REPLACE(REPLACE(REPLACE(PhoneNumber, N'+', N''), N' ', N''), N'-', N''), N'(', N'')) >= 12
            THEN N'0' + SUBSTRING(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(PhoneNumber, N'+', N''), N' ', N''), N'-', N''), N'(', N''), N')', N''), N'.', N''),
                4, 9)
        WHEN PhoneNumber LIKE N'380%'
             AND LEN(REPLACE(REPLACE(REPLACE(PhoneNumber, N' ', N''), N'-', N''), N'.', N'')) >= 12
            THEN N'0' + SUBSTRING(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(PhoneNumber, N' ', N''), N'-', N''), N'.', N''), N'(', N''), N')', N''),
                4, 9)
        ELSE PhoneNumber
    END
WHERE PhoneNumber IS NOT NULL
  AND (
        PhoneNumber LIKE N'+380%'
     OR PhoneNumber LIKE N'380%'
  );
GO

------------------------------------------------------------------
-- 2) Legacy seed admins without phone -> assign canonical phones
------------------------------------------------------------------
UPDATE dbo.AspNetUsers
SET PhoneNumber = N'0981000001',
    UserName = N'0981000001',
    NormalizedUserName = N'0981000001'
WHERE NormalizedUserName = N'ADMIN'
  AND (PhoneNumber IS NULL OR LTRIM(RTRIM(PhoneNumber)) = N'');

UPDATE dbo.AspNetUsers
SET PhoneNumber = N'0981000002',
    UserName = N'0981000002',
    NormalizedUserName = N'0981000002'
WHERE NormalizedUserName = N'ADMIN2'
  AND (PhoneNumber IS NULL OR LTRIM(RTRIM(PhoneNumber)) = N'');
GO

------------------------------------------------------------------
-- 3) UserName / NormalizedUserName = canonical PhoneNumber
------------------------------------------------------------------
UPDATE dbo.AspNetUsers
SET UserName = PhoneNumber,
    NormalizedUserName = PhoneNumber
WHERE PhoneNumber IS NOT NULL
  AND PhoneNumber LIKE N'0[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  AND LEN(PhoneNumber) = 10
  AND (
        UserName <> PhoneNumber
     OR NormalizedUserName <> PhoneNumber
     OR PhoneNumber IS NULL
  );
GO

PRINT N'007_PhoneAsUsername completed successfully.';
GO
