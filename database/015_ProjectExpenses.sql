-- Manual project expenses (work, unexpected costs, etc.).
-- Inventory / stock costs stay derived from ProjectItem lot allocations — not stored here.
-- Idempotent via IF OBJECT_ID.

USE SellaSolarAdmin;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.ProjectExpenses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProjectExpenses
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProjectExpenses PRIMARY KEY,
        ProjectId INT NOT NULL,
        Category NVARCHAR(200) NOT NULL,
        Amount DECIMAL(18,2) NOT NULL,
        ExpenseDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProjectExpenses_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_ProjectExpenses_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_ProjectExpenses_Projects
            FOREIGN KEY (ProjectId) REFERENCES dbo.Projects (Id) ON DELETE CASCADE,
        CONSTRAINT CK_ProjectExpenses_Amount CHECK (Amount > 0),
        CONSTRAINT CK_ProjectExpenses_Category CHECK (LEN(LTRIM(RTRIM(Category))) > 0)
    );

    CREATE INDEX IX_ProjectExpenses_ProjectId
        ON dbo.ProjectExpenses (ProjectId);
END
GO
