-- Merge Workers into AspNetUsers (Identity) and retarget ProjectWorkers.
-- Prerequisites: 001_CreateSchema.sql, 004_IdentitySchema.sql
-- Idempotent / safe to re-run.
--
-- Temp password for newly created worker logins: TempPass123!
-- Admin must reset passwords after migration.
--
-- Usage (LocalDB):
--   sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i database\006_MergeWorkersIntoUsers.sql

USE SellaSolarAdmin;
GO

SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

------------------------------------------------------------------
-- 1) Ensure Worker role exists
------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles WHERE NormalizedName = N'WORKER')
BEGIN
    INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (CONVERT(NVARCHAR(450), NEWID()), N'Worker', N'WORKER', CONVERT(NVARCHAR(MAX), NEWID()));
END
GO

------------------------------------------------------------------
-- 2) Add WorkerType column on AspNetUsers
------------------------------------------------------------------
IF COL_LENGTH(N'dbo.AspNetUsers', N'WorkerType') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD WorkerType NVARCHAR(20) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_AspNetUsers_WorkerType' AND parent_object_id = OBJECT_ID(N'dbo.AspNetUsers'))
BEGIN
    ALTER TABLE dbo.AspNetUsers WITH NOCHECK
    ADD CONSTRAINT CK_AspNetUsers_WorkerType
        CHECK (WorkerType IS NULL OR WorkerType IN (N'Assembler', N'Installer'));
END
GO

------------------------------------------------------------------
-- 3) Prepare ProjectWorkers.UserId column
------------------------------------------------------------------
IF COL_LENGTH(N'dbo.ProjectWorkers', N'UserId') IS NULL
   AND OBJECT_ID(N'dbo.Workers', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ProjectWorkers ADD UserId NVARCHAR(450) NULL;
END
GO

------------------------------------------------------------------
-- 4) Migrate Workers -> AspNetUsers (only if Workers table still exists)
------------------------------------------------------------------
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Workers', N'U') IS NOT NULL
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    -- Pre-008 schemas: Email* / PhoneNumberConfirmed / TwoFactorEnabled may still exist.
    -- Add defaults so INSERT below can omit them (008 drops the columns later).
    IF COL_LENGTH(N'dbo.AspNetUsers', N'PhoneNumberConfirmed') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM sys.default_constraints dc
           INNER JOIN sys.columns c ON c.default_object_id = dc.object_id AND c.object_id = dc.parent_object_id
           WHERE dc.parent_object_id = OBJECT_ID(N'dbo.AspNetUsers') AND c.name = N'PhoneNumberConfirmed')
    BEGIN
        ALTER TABLE dbo.AspNetUsers
            ADD CONSTRAINT DF_AspNetUsers_PhoneNumberConfirmed DEFAULT (0) FOR PhoneNumberConfirmed;
    END

    IF COL_LENGTH(N'dbo.AspNetUsers', N'TwoFactorEnabled') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM sys.default_constraints dc
           INNER JOIN sys.columns c ON c.default_object_id = dc.object_id AND c.object_id = dc.parent_object_id
           WHERE dc.parent_object_id = OBJECT_ID(N'dbo.AspNetUsers') AND c.name = N'TwoFactorEnabled')
    BEGIN
        ALTER TABLE dbo.AspNetUsers
            ADD CONSTRAINT DF_AspNetUsers_TwoFactorEnabled DEFAULT (0) FOR TwoFactorEnabled;
    END

    IF OBJECT_ID(N'tempdb..#WorkerUserMap') IS NOT NULL DROP TABLE #WorkerUserMap;
    CREATE TABLE #WorkerUserMap
    (
        WorkerId INT NOT NULL PRIMARY KEY,
        UserId   NVARCHAR(450) NOT NULL
    );

    DECLARE @WorkerRoleId NVARCHAR(450) =
        (SELECT TOP (1) Id FROM dbo.AspNetRoles WHERE NormalizedName = N'WORKER');

    -- Match existing users by FullName or PhoneNumber
    INSERT INTO #WorkerUserMap (WorkerId, UserId)
    SELECT w.Id, u.Id
    FROM dbo.Workers w
    CROSS APPLY (
        SELECT TOP (1) au.Id
        FROM dbo.AspNetUsers au
        WHERE au.FullName = w.FullName
           OR (au.PhoneNumber IS NOT NULL AND au.PhoneNumber = w.Phone)
        ORDER BY
            CASE WHEN au.FullName = w.FullName THEN 0 ELSE 1 END,
            au.CreatedAt
    ) u;

    DECLARE @TempPasswordHash NVARCHAR(MAX) =
        N'AQAAAAIAAYagAAAAEN/x78+bIvRkZUZEeANQITAQxqFB4xWj7pegRksChFRTJj4hZmv75rRfXCqc6y1Z9g==';

    DECLARE @WorkerId INT, @FullName NVARCHAR(200), @Type NVARCHAR(20), @Phone NVARCHAR(50), @IsActive BIT;
    DECLARE @UserId NVARCHAR(450), @CanonicalPhone NVARCHAR(20), @Digits NVARCHAR(50);

    DECLARE worker_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT w.Id, w.FullName, w.Type, w.Phone, w.IsActive
        FROM dbo.Workers w
        WHERE NOT EXISTS (SELECT 1 FROM #WorkerUserMap m WHERE m.WorkerId = w.Id);

    OPEN worker_cursor;
    FETCH NEXT FROM worker_cursor INTO @WorkerId, @FullName, @Type, @Phone, @IsActive;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @UserId = CONVERT(NVARCHAR(450), NEWID());

        -- Canonical UA phone: skip country 38 → 0XXXXXXXXX
        SET @Digits = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            ISNULL(@Phone, N''), N'+', N''), N' ', N''), N'-', N''), N'(', N''), N')', N''), N'.', N'');
        IF @Digits LIKE N'380%' AND LEN(@Digits) >= 12
            SET @CanonicalPhone = N'0' + SUBSTRING(@Digits, 4, 9);
        ELSE IF @Digits LIKE N'0%' AND LEN(@Digits) = 10
            SET @CanonicalPhone = @Digits;
        ELSE
            SET @CanonicalPhone = N'090' + RIGHT(N'0000000' + CAST(@WorkerId AS NVARCHAR(10)), 7);

        IF EXISTS (SELECT 1 FROM dbo.AspNetUsers WHERE NormalizedUserName = @CanonicalPhone)
            SET @CanonicalPhone = N'090' + RIGHT(N'0000000' + CAST(@WorkerId AS NVARCHAR(10)), 7);

        INSERT INTO dbo.AspNetUsers
        (
            Id, UserName, NormalizedUserName,
            PasswordHash, SecurityStamp, ConcurrencyStamp,
            PhoneNumber, LockoutEnd, LockoutEnabled, AccessFailedCount,
            FullName, IsActive, IsBlocked, BlockedAt, FailedLoginCount, CreatedAt,
            WorkerType
        )
        VALUES
        (
            @UserId, @CanonicalPhone, @CanonicalPhone,
            @TempPasswordHash, CONVERT(NVARCHAR(MAX), NEWID()), CONVERT(NVARCHAR(MAX), NEWID()),
            @CanonicalPhone, NULL, 0, 0,
            @FullName, @IsActive, 0, NULL, 0, SYSUTCDATETIME(),
            @Type
        );

        INSERT INTO #WorkerUserMap (WorkerId, UserId) VALUES (@WorkerId, @UserId);

        FETCH NEXT FROM worker_cursor INTO @WorkerId, @FullName, @Type, @Phone, @IsActive;
    END

    CLOSE worker_cursor;
    DEALLOCATE worker_cursor;

    UPDATE u
    SET
        u.WorkerType = COALESCE(u.WorkerType, w.Type),
        u.PhoneNumber = COALESCE(
            NULLIF(u.PhoneNumber, N''),
            CASE
                WHEN REPLACE(REPLACE(REPLACE(ISNULL(w.Phone, N''), N'+', N''), N' ', N''), N'-', N'') LIKE N'380%'
                    THEN N'0' + SUBSTRING(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(w.Phone, N'+', N''), N' ', N''), N'-', N''), N'(', N''), N')', N''), N'.', N''), 4, 9)
                ELSE w.Phone
            END),
        u.IsActive = CASE WHEN u.IsActive = 0 THEN w.IsActive ELSE u.IsActive END
    FROM dbo.AspNetUsers u
    INNER JOIN #WorkerUserMap m ON m.UserId = u.Id
    INNER JOIN dbo.Workers w ON w.Id = m.WorkerId;

    -- Users with no roles yet -> Worker
    INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
    SELECT m.UserId, @WorkerRoleId
    FROM #WorkerUserMap m
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUserRoles ur WHERE ur.UserId = m.UserId);

    -- Matched users who are not Admin/Manager and lack Worker role
    INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
    SELECT m.UserId, @WorkerRoleId
    FROM #WorkerUserMap m
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.AspNetUserRoles ur
        INNER JOIN dbo.AspNetRoles r ON r.Id = ur.RoleId
        WHERE ur.UserId = m.UserId AND r.NormalizedName = N'WORKER')
    AND NOT EXISTS (
        SELECT 1 FROM dbo.AspNetUserRoles ur
        INNER JOIN dbo.AspNetRoles r ON r.Id = ur.RoleId
        WHERE ur.UserId = m.UserId AND r.NormalizedName IN (N'ADMIN', N'MANAGER'));

    IF COL_LENGTH(N'dbo.ProjectWorkers', N'UserId') IS NOT NULL
       AND COL_LENGTH(N'dbo.ProjectWorkers', N'WorkerId') IS NOT NULL
    BEGIN
        UPDATE pw
        SET pw.UserId = m.UserId
        FROM dbo.ProjectWorkers pw
        INNER JOIN #WorkerUserMap m ON m.WorkerId = pw.WorkerId
        WHERE pw.UserId IS NULL;
    END

    DROP TABLE #WorkerUserMap;

    COMMIT TRANSACTION;
    PRINT N'Step 4: Workers data migrated into AspNetUsers.';
END
ELSE
BEGIN
    PRINT N'Step 4: Workers table already absent; skip data migrate.';
END
GO

------------------------------------------------------------------
-- 5) Retarget ProjectWorkers FK: drop WorkerId, enforce UserId
------------------------------------------------------------------
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.ProjectWorkers', N'WorkerId') IS NOT NULL
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ProjectWorkers_Workers')
        ALTER TABLE dbo.ProjectWorkers DROP CONSTRAINT FK_ProjectWorkers_Workers;

    IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_ProjectWorkers_Project_Worker')
        ALTER TABLE dbo.ProjectWorkers DROP CONSTRAINT UQ_ProjectWorkers_Project_Worker;

    IF EXISTS (SELECT 1 FROM dbo.ProjectWorkers WHERE UserId IS NULL)
    BEGIN
        THROW 50001, N'ProjectWorkers.UserId still NULL after migration; aborting.', 1;
    END

    ALTER TABLE dbo.ProjectWorkers ALTER COLUMN UserId NVARCHAR(450) NOT NULL;
    ALTER TABLE dbo.ProjectWorkers DROP COLUMN WorkerId;

    COMMIT TRANSACTION;
    PRINT N'Step 5: WorkerId dropped; UserId is NOT NULL.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_ProjectWorkers_Project_User')
   AND COL_LENGTH(N'dbo.ProjectWorkers', N'UserId') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ProjectWorkers
        ADD CONSTRAINT UQ_ProjectWorkers_Project_User UNIQUE (ProjectId, UserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ProjectWorkers_AspNetUsers')
   AND COL_LENGTH(N'dbo.ProjectWorkers', N'UserId') IS NOT NULL
BEGIN
    ALTER TABLE dbo.ProjectWorkers
        ADD CONSTRAINT FK_ProjectWorkers_AspNetUsers
        FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id);
END
GO

------------------------------------------------------------------
-- 6) Drop Workers table
------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Workers', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Workers_Type' AND object_id = OBJECT_ID(N'dbo.Workers'))
        DROP INDEX IX_Workers_Type ON dbo.Workers;

    DROP TABLE dbo.Workers;
    PRINT N'Step 6: Workers table dropped.';
END
GO

------------------------------------------------------------------
-- 7) Index on WorkerType
------------------------------------------------------------------
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.AspNetUsers', N'WorkerType') IS NOT NULL
   AND NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = N'IX_AspNetUsers_WorkerType' AND object_id = OBJECT_ID(N'dbo.AspNetUsers'))
BEGIN
    CREATE INDEX IX_AspNetUsers_WorkerType ON dbo.AspNetUsers(WorkerType)
        WHERE WorkerType IS NOT NULL;
END
GO

PRINT N'006_MergeWorkersIntoUsers completed successfully.';
GO
