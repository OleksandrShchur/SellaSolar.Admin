namespace SellaSolar.Admin.Application.DTOs;

public record CustomDataDto(string Key, string Value);

public record ProjectListItemDto(
    int Id,
    string Name,
    string Address,
    string Status,
    string CustomerName,
    string CustomerPhone,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime CreatedAt,
    int AssignedWorkerCount,
    bool HasPurchaseNeeds);

public record ProjectItemDto(
    int Id,
    int? WarehouseItemId,
    string Name,
    string Category,
    string Unit,
    decimal QuantityNeeded,
    decimal QuantityFromStock,
    decimal QuantityToPurchase,
    bool NeedsPurchase,
    decimal QuantityInStock,
    /// <summary>On-hand stock minus amounts reserved by other open projects.</summary>
    decimal QuantityAvailable,
    bool IsNonCatalog);

public record ProjectWorkerDto(
    int Id,
    string UserId,
    string FullName,
    string? WorkerType,
    string? Phone,
    string? RoleOnProject,
    DateTime AssignedAt);

public record ProjectPhotoDto(
    int Id,
    string Url,
    string? Caption,
    DateTime UploadedAt);

public record ProjectDetailDto(
    int Id,
    string Name,
    string? Description,
    string Address,
    string Status,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<CustomDataDto> CustomData,
    IReadOnlyList<ProjectItemDto> Items,
    IReadOnlyList<ProjectWorkerDto> Workers,
    IReadOnlyList<ProjectPhotoDto> Photos);

public record CreateProjectRequest(
    string Name,
    string? Description,
    string Address,
    string Status,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    DateTime? StartDate,
    DateTime? EndDate,
    IReadOnlyList<CustomDataDto>? CustomData);

public record UpdateProjectRequest(
    string Name,
    string? Description,
    string Address,
    string Status,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    DateTime? StartDate,
    DateTime? EndDate,
    IReadOnlyList<CustomDataDto>? CustomData);

public record UpdateProjectStatusRequest(string Status);

public record AssignProjectItemRequest(
    int? WarehouseItemId,
    decimal QuantityNeeded,
    string? RequestedName,
    string? RequestedCategory,
    string? RequestedUnit);

public record UpdateProjectItemRequest(decimal QuantityNeeded);

public record AssignProjectWorkerRequest(string UserId, string? RoleOnProject);

public record WarehouseItemListDto(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    /// <summary>On-hand minus amounts reserved by open projects.</summary>
    decimal QuantityAvailable,
    decimal? Price,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold,
    bool IsLowStock,
    int UsedInProjectsCount,
    decimal QuantityToOrder);

public record WarehouseItemDetailDto(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    /// <summary>On-hand minus amounts reserved by open projects.</summary>
    decimal QuantityAvailable,
    decimal? Price,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold,
    bool IsLowStock,
    IReadOnlyList<WarehouseItemProjectUsageDto> Projects);

public record WarehouseItemProjectUsageDto(
    int ProjectId,
    string ProjectName,
    string ProjectStatus,
    decimal QuantityNeeded,
    decimal QuantityFromStock,
    bool NeedsPurchase);

public record CreateWarehouseItemRequest(
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    decimal? Price,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold);

public record UpdateWarehouseItemRequest(
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    decimal? Price,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold);

public record NonCatalogPurchaseRequestDto(
    int ProjectItemId,
    int ProjectId,
    string ProjectName,
    string ProjectStatus,
    string Name,
    string Category,
    string Unit,
    decimal QuantityToPurchase);

