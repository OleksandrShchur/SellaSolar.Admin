-- ASP.NET Core Identity + SellaSolar auth extensions (Database-First)
-- Run after 001_CreateSchema.sql against the same database.

USE SellaSolarAdmin;
GO

IF OBJECT_ID(N'dbo.AuthSecurityLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthSecurityLogs
    (
        Id              BIGINT          NOT NULL IDENTITY(1,1) CONSTRAINT PK_AuthSecurityLogs PRIMARY KEY,
        EventType       NVARCHAR(50)    NOT NULL,
        ActorUserId     NVARCHAR(450)   NULL,
        TargetUserId    NVARCHAR(450)   NULL,
        IpAddress       NVARCHAR(45)    NULL,
        CreatedAt       DATETIME2       NOT NULL CONSTRAINT DF_AuthSecurityLogs_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
END
GO

IF OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetRoles
    (
        Id              NVARCHAR(450)   NOT NULL CONSTRAINT PK_AspNetRoles PRIMARY KEY,
        Name            NVARCHAR(256)   NULL,
        NormalizedName  NVARCHAR(256)   NULL,
        ConcurrencyStamp NVARCHAR(MAX)  NULL
    );
    CREATE UNIQUE INDEX UX_AspNetRoles_NormalizedName ON dbo.AspNetRoles(NormalizedName) WHERE NormalizedName IS NOT NULL;
END
GO

IF OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUsers
    (
        Id                      NVARCHAR(450)   NOT NULL CONSTRAINT PK_AspNetUsers PRIMARY KEY,
        UserName                NVARCHAR(256)   NULL,
        NormalizedUserName      NVARCHAR(256)   NULL,
        Email                   NVARCHAR(256)   NULL,
        NormalizedEmail         NVARCHAR(256)   NULL,
        EmailConfirmed          BIT             NOT NULL CONSTRAINT DF_AspNetUsers_EmailConfirmed DEFAULT (0),
        PasswordHash            NVARCHAR(MAX)   NULL,
        SecurityStamp           NVARCHAR(MAX)   NULL,
        ConcurrencyStamp        NVARCHAR(MAX)   NULL,
        PhoneNumber             NVARCHAR(MAX)   NULL,
        PhoneNumberConfirmed    BIT             NOT NULL,
        TwoFactorEnabled        BIT             NOT NULL,
        LockoutEnd              DATETIMEOFFSET  NULL,
        LockoutEnabled          BIT             NOT NULL,
        AccessFailedCount       INT             NOT NULL,
        -- Extended profile (no email fields used)
        FullName                NVARCHAR(200)   NOT NULL CONSTRAINT DF_AspNetUsers_FullName DEFAULT (N''),
        IsActive                BIT             NOT NULL CONSTRAINT DF_AspNetUsers_IsActive DEFAULT (1),
        IsBlocked               BIT             NOT NULL CONSTRAINT DF_AspNetUsers_IsBlocked DEFAULT (0),
        BlockedAt               DATETIMEOFFSET  NULL,
        FailedLoginCount        INT             NOT NULL CONSTRAINT DF_AspNetUsers_FailedLoginCount DEFAULT (0),
        CreatedAt               DATETIMEOFFSET  NOT NULL CONSTRAINT DF_AspNetUsers_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_AspNetUsers_NormalizedUserName ON dbo.AspNetUsers(NormalizedUserName) WHERE NormalizedUserName IS NOT NULL;
END
GO

IF OBJECT_ID(N'dbo.AspNetRoleClaims', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetRoleClaims
    (
        Id          INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_AspNetRoleClaims PRIMARY KEY,
        RoleId      NVARCHAR(450)   NOT NULL,
        ClaimType   NVARCHAR(MAX)   NULL,
        ClaimValue  NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_AspNetRoleClaims_AspNetRoles FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.AspNetUserClaims', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserClaims
    (
        Id          INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_AspNetUserClaims PRIMARY KEY,
        UserId      NVARCHAR(450)   NOT NULL,
        ClaimType   NVARCHAR(MAX)   NULL,
        ClaimValue  NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_AspNetUserClaims_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.AspNetUserLogins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserLogins
    (
        LoginProvider       NVARCHAR(450)   NOT NULL,
        ProviderKey         NVARCHAR(450)   NOT NULL,
        ProviderDisplayName NVARCHAR(MAX)   NULL,
        UserId              NVARCHAR(450)   NOT NULL,
        CONSTRAINT PK_AspNetUserLogins PRIMARY KEY (LoginProvider, ProviderKey),
        CONSTRAINT FK_AspNetUserLogins_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserRoles
    (
        UserId  NVARCHAR(450) NOT NULL,
        RoleId  NVARCHAR(450) NOT NULL,
        CONSTRAINT PK_AspNetUserRoles PRIMARY KEY (UserId, RoleId),
        CONSTRAINT FK_AspNetUserRoles_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE,
        CONSTRAINT FK_AspNetUserRoles_AspNetRoles FOREIGN KEY (RoleId) REFERENCES dbo.AspNetRoles(Id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'dbo.AspNetUserTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AspNetUserTokens
    (
        UserId          NVARCHAR(450) NOT NULL,
        LoginProvider   NVARCHAR(450) NOT NULL,
        Name            NVARCHAR(450) NOT NULL,
        Value           NVARCHAR(MAX) NULL,
        CONSTRAINT PK_AspNetUserTokens PRIMARY KEY (UserId, LoginProvider, Name),
        CONSTRAINT FK_AspNetUserTokens_AspNetUsers FOREIGN KEY (UserId) REFERENCES dbo.AspNetUsers(Id) ON DELETE CASCADE
    );
END
GO
