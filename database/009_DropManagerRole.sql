-- Remove obsolete Manager role. Roles are Admin and Worker only.
-- Any users still in Manager are moved to Admin.
-- Idempotent: safe to re-run. Apply after 001–008 on existing databases.

USE SellaSolarAdmin;
GO

DECLARE @ManagerRoleId NVARCHAR(450) =
    (SELECT TOP (1) Id FROM dbo.AspNetRoles WHERE NormalizedName = N'MANAGER');

DECLARE @AdminRoleId NVARCHAR(450) =
    (SELECT TOP (1) Id FROM dbo.AspNetRoles WHERE NormalizedName = N'ADMIN');

IF @ManagerRoleId IS NOT NULL AND @AdminRoleId IS NOT NULL
BEGIN
    -- Move Manager users to Admin when they are not already Admin
    INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
    SELECT ur.UserId, @AdminRoleId
    FROM dbo.AspNetUserRoles ur
    WHERE ur.RoleId = @ManagerRoleId
      AND NOT EXISTS (
          SELECT 1
          FROM dbo.AspNetUserRoles existing
          WHERE existing.UserId = ur.UserId
            AND existing.RoleId = @AdminRoleId);

    DELETE FROM dbo.AspNetUserRoles WHERE RoleId = @ManagerRoleId;
    DELETE FROM dbo.AspNetRoles WHERE Id = @ManagerRoleId;
END
ELSE IF @ManagerRoleId IS NOT NULL
BEGIN
    -- No Admin role yet: drop Manager assignments and role
    DELETE FROM dbo.AspNetUserRoles WHERE RoleId = @ManagerRoleId;
    DELETE FROM dbo.AspNetRoles WHERE Id = @ManagerRoleId;
END
GO
