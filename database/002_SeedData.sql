-- Seed sample data for SellaSolar Admin MVP
USE SellaSolarAdmin;
GO

-- Clear existing seed-friendly data (safe for local re-runs after schema recreate)
DELETE FROM dbo.ProjectItems;
DELETE FROM dbo.ProjectWorkers;
DELETE FROM dbo.ProjectPhotos;
DELETE FROM dbo.ProjectCustomData;
DELETE FROM dbo.Projects;
DELETE FROM dbo.Workers;
DELETE FROM dbo.WarehouseItems;
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

SET IDENTITY_INSERT dbo.Workers ON;
INSERT INTO dbo.Workers (Id, FullName, Type, Phone, IsActive)
VALUES
    (1, N'Іван Петренко', N'Assembler', N'+380501112233', 1),
    (2, N'Олена Коваленко', N'Assembler', N'+380671234567', 1),
    (3, N'Микола Шевченко', N'Installer', N'+380931112233', 1),
    (4, N'Андрій Бондар', N'Installer', N'+380501234567', 1),
    (5, N'Сергій Мельник', N'Installer', N'+380661112233', 0);
SET IDENTITY_INSERT dbo.Workers OFF;
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

INSERT INTO dbo.ProjectWorkers (ProjectId, WorkerId, RoleOnProject, AssignedAt)
VALUES
    (1, 1, N'Складання панелей', DATEADD(day, -6, SYSUTCDATETIME())),
    (1, 3, N'Монтаж на даху', DATEADD(day, -5, SYSUTCDATETIME())),
    (2, 2, N'Складання', DATEADD(day, -50, SYSUTCDATETIME())),
    (2, 4, N'Монтаж', DATEADD(day, -45, SYSUTCDATETIME()));
GO

-- Sample project items WITHOUT deducting again (stock already at seed levels).
-- For demo: project 1 uses small quantities that match current stock narrative.
INSERT INTO dbo.ProjectItems (ProjectId, WarehouseItemId, QuantityNeeded, QuantityFromStock, QuantityToPurchase, NeedsPurchase)
VALUES
    (1, 1, 12, 12, 0, 0),
    (1, 2, 1, 1, 0, 0),
    (1, 5, 2, 2, 0, 0), -- NeedsPurchase would be true if assigned via API with low stock
    (2, 1, 36, 36, 0, 0),
    (2, 2, 3, 3, 0, 0);
GO

PRINT N'Seed completed.';
GO
