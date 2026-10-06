-- Optional bank card number (16 digits) for workers on AspNetUsers.
-- Idempotent / safe to re-run.
--
-- Usage (LocalDB):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -d SellaSolarAdmin -i database\017_UserCardNumber.sql
-- Hosting-safe: no GO / USE — run while connected to the target database.

IF COL_LENGTH(N'dbo.AspNetUsers', N'CardNumber') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD CardNumber NVARCHAR(16) NULL
END
