-- Seed sample data for SellaSolar Admin MVP
-- Run after schema scripts through 008 (001, 004, 006, 007, 008 as applicable).
-- Worker accounts use temp password: TempPass123! (reset via admin UI).
USE SellaSolarAdmin;
GO

-- Clear existing seed-friendly data (safe for local re-runs after schema recreate)
DELETE FROM dbo.ProjectItems;
DELETE FROM dbo.ProjectWorkers;
DELETE FROM dbo.ProjectPhotos;
DELETE FROM dbo.ProjectCustomData;
DELETE FROM dbo.Projects;
DELETE FROM dbo.WarehouseItems;

-- Remove previously seeded demo workers (keep real admins)
DELETE ur
FROM dbo.AspNetUserRoles ur
INNER JOIN dbo.AspNetUsers u ON u.Id = ur.UserId
WHERE u.Id IN (
    N'11111111-1111-1111-1111-111111111101',
    N'11111111-1111-1111-1111-111111111102',
    N'11111111-1111-1111-1111-111111111103',
    N'11111111-1111-1111-1111-111111111104',
    N'11111111-1111-1111-1111-111111111105');

DELETE FROM dbo.AspNetUsers
WHERE Id IN (
    N'11111111-1111-1111-1111-111111111101',
    N'11111111-1111-1111-1111-111111111102',
    N'11111111-1111-1111-1111-111111111103',
    N'11111111-1111-1111-1111-111111111104',
    N'11111111-1111-1111-1111-111111111105');
GO

SET IDENTITY_INSERT dbo.WarehouseItems ON;
INSERT INTO dbo.WarehouseItems (Id, Name, Category, Unit, QuantityInStock, Price, Supplier, Notes, LowStockThreshold)
VALUES
    (1, N'Сонячна панель 400Вт', N'Панелі', N'шт', 48, 5200.00, N'SunPower UA', N'Monofacial', 10),
    (2, N'Інвертор 5кВт', N'Інвертори', N'шт', 12, 18500.00, N'Huawei', NULL, 3),
    (3, N'Монтажна рейка 3м', N'Кріплення', N'шт', 80, 450.00, N'MountTech', NULL, 20),
    (4, N'Кабель PV 6мм²', N'Кабелі', N'м', 500, 45.00, N'ElectroCab', NULL, 100),
    (5, N'Акумулятор LiFePO4 5кВт·год', N'Акумулятори', N'шт', 4, 42000.00, N'Pylontech', N'Низький запас', 5),
    (6, N'MC4 конектор', N'Комплектуючі', N'шт', 200, 25.00, NULL, NULL, 50);
SET IDENTITY_INSERT dbo.WarehouseItems OFF;
GO

-- Ensure Worker role exists
IF NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles WHERE NormalizedName = N'WORKER')
BEGIN
    INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
    VALUES (CONVERT(NVARCHAR(450), NEWID()), N'Worker', N'WORKER', CONVERT(NVARCHAR(MAX), NEWID()));
END
GO

DECLARE @WorkerRoleId NVARCHAR(450) =
    (SELECT TOP (1) Id FROM dbo.AspNetRoles WHERE NormalizedName = N'WORKER');
DECLARE @TempPasswordHash NVARCHAR(MAX) =
    N'AQAAAAIAAYagAAAAEN/x78+bIvRkZUZEeANQITAQxqFB4xWj7pegRksChFRTJj4hZmv75rRfXCqc6y1Z9g=='; -- TempPass123!

-- Demo workers (fixed Ids for ProjectWorkers seed)
INSERT INTO dbo.AspNetUsers
(
    Id, UserName, NormalizedUserName,
    PasswordHash, SecurityStamp, ConcurrencyStamp,
    PhoneNumber, LockoutEnd, LockoutEnabled, AccessFailedCount,
    FullName, IsActive, IsBlocked, BlockedAt, FailedLoginCount, CreatedAt, WorkerType
)
VALUES
    (N'11111111-1111-1111-1111-111111111101', N'0501112233', N'0501112233', @TempPasswordHash, NEWID(), NEWID(), N'0501112233', NULL, 0, 0, N'Іван Петренко', 1, 0, NULL, 0, SYSUTCDATETIME(), N'Assembler'),
    (N'11111111-1111-1111-1111-111111111102', N'0671234567', N'0671234567', @TempPasswordHash, NEWID(), NEWID(), N'0671234567', NULL, 0, 0, N'Олена Коваленко', 1, 0, NULL, 0, SYSUTCDATETIME(), N'Assembler'),
    (N'11111111-1111-1111-1111-111111111103', N'0931112233', N'0931112233', @TempPasswordHash, NEWID(), NEWID(), N'0931112233', NULL, 0, 0, N'Микола Шевченко', 1, 0, NULL, 0, SYSUTCDATETIME(), N'Installer'),
    (N'11111111-1111-1111-1111-111111111104', N'0501234567', N'0501234567', @TempPasswordHash, NEWID(), NEWID(), N'0501234567', NULL, 0, 0, N'Андрій Бондар', 1, 0, NULL, 0, SYSUTCDATETIME(), N'Installer'),
    (N'11111111-1111-1111-1111-111111111105', N'0661112233', N'0661112233', @TempPasswordHash, NEWID(), NEWID(), N'0661112233', NULL, 0, 0, N'Сергій Мельник', 0, 0, NULL, 0, SYSUTCDATETIME(), N'Installer');

INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
SELECT v.Id, @WorkerRoleId
FROM (VALUES
    (N'11111111-1111-1111-1111-111111111101'),
    (N'11111111-1111-1111-1111-111111111102'),
    (N'11111111-1111-1111-1111-111111111103'),
    (N'11111111-1111-1111-1111-111111111104'),
    (N'11111111-1111-1111-1111-111111111105')
) v(Id)
WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUserRoles ur WHERE ur.UserId = v.Id AND ur.RoleId = @WorkerRoleId);
GO

SET IDENTITY_INSERT dbo.Projects ON;
INSERT INTO dbo.Projects (Id, Name, Description, Address, Status, CustomerName, CustomerPhone, CustomerEmail, StartDate, EndDate, CreatedAt, UpdatedAt)
VALUES
    (1,
     N'Будинок на вул. Садовій',
     N'Встановлення системи 5 кВт на приватний будинок',
     N'м. Київ, вул. Садова, 12',
     N'InProgress',
     N'Олександр Іваненко',
     N'+380671112233',
     N'ivanenko@example.com',
     DATEADD(day, -7, SYSUTCDATETIME()),
     NULL,
     SYSUTCDATETIME(),
     SYSUTCDATETIME()),
    (2,
     N'Офіс на Подолі',
     N'Монтаж дахової станції 15 кВт',
     N'м. Київ, вул. Нижній Вал, 5',
     N'Completed',
     N'ТОВ «Сонячний Офіс»',
     N'+380441112233',
     N'office@example.com',
     DATEADD(day, -60, SYSUTCDATETIME()),
     DATEADD(day, -10, SYSUTCDATETIME()),
     SYSUTCDATETIME(),
     SYSUTCDATETIME());
SET IDENTITY_INSERT dbo.Projects OFF;
GO

INSERT INTO dbo.ProjectCustomData (ProjectId, [Key], Value)
VALUES
    (1, N'Потужність', N'5 кВт'),
    (1, N'Тип даху', N'Металочерепиця'),
    (2, N'Потужність', N'15 кВт');
GO

INSERT INTO dbo.ProjectWorkers (ProjectId, UserId, RoleOnProject, AssignedAt)
VALUES
    (1, N'11111111-1111-1111-1111-111111111101', N'Складання панелей', DATEADD(day, -6, SYSUTCDATETIME())),
    (1, N'11111111-1111-1111-1111-111111111103', N'Монтаж на даху', DATEADD(day, -5, SYSUTCDATETIME())),
    (2, N'11111111-1111-1111-1111-111111111102', N'Складання', DATEADD(day, -50, SYSUTCDATETIME())),
    (2, N'11111111-1111-1111-1111-111111111104', N'Монтаж', DATEADD(day, -45, SYSUTCDATETIME()));
GO

INSERT INTO dbo.ProjectItems (ProjectId, WarehouseItemId, QuantityNeeded, QuantityFromStock, QuantityToPurchase, NeedsPurchase)
VALUES
    (1, 1, 12, 12, 0, 0),
    (1, 2, 1, 1, 0, 0),
    (1, 5, 2, 2, 0, 0),
    (2, 1, 36, 36, 0, 0),
    (2, 2, 3, 3, 0, 0);
GO

PRINT N'Seed completed.';
GO
