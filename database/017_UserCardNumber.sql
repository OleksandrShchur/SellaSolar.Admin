-- Optional bank card number (16 digits) for workers on AspNetUsers.
-- Idempotent / safe to re-run.
--
-- Usage (LocalDB):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\017_UserCardNumber.sql

USE SellaSolarAdmin;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'CardNumber') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD CardNumber NVARCHAR(16) NULL;
END
GO
