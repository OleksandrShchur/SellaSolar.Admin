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

public record ProjectItemLotAllocationDto(
    int LotId,
    decimal UnitCost,
    decimal Quantity,
    DateTime ReceivedAt,
    /// <summary>Free qty on lot for new/changed allocations (includes this item's current allocation on the lot).</summary>
    decimal? QuantityFreeOnLot);

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
    bool IsNonCatalog,
    IReadOnlyList<ProjectItemLotAllocationDto> Allocations,
    /// <summary>Sum of quantity × unitCost over allocations. Null when no allocations.</summary>
    decimal? CostFromStock);

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

public record ProjectExpenseDto(
    int Id,
    string Category,
    decimal Amount,
    DateTime? ExpenseDate,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

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
    IReadOnlyList<ProjectPhotoDto> Photos,
    IReadOnlyList<ProjectExpenseDto> Expenses);

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

public record ProjectItemLotAllocationInput(int WarehouseStockLotId, decimal Quantity);

public record SetProjectItemAllocationsRequest(IReadOnlyList<ProjectItemLotAllocationInput> Allocations);

public record AssignProjectWorkerRequest(string UserId, string? RoleOnProject);

public record CreateProjectExpenseRequest(
    string Category,
    decimal Amount,
    DateTime? ExpenseDate,
    string? Notes);

public record UpdateProjectExpenseRequest(
    string Category,
    decimal Amount,
    DateTime? ExpenseDate,
    string? Notes);

public record WarehouseItemListDto(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    /// <summary>On-hand minus amounts reserved by open projects.</summary>
    decimal QuantityAvailable,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold,
    bool IsLowStock,
    int UsedInProjectsCount,
    decimal QuantityToOrder);

public record WarehouseStockLotDto(
    int LotId,
    decimal UnitCost,
    decimal QuantityOnHand,
    decimal QuantityReserved,
    decimal QuantityFree,
    DateTime ReceivedAt,
    string? Supplier,
    string? Notes);

public record WarehouseItemDetailDto(
    int Id,
    string Name,
    string Category,
    string Unit,
    decimal QuantityInStock,
    /// <summary>On-hand minus amounts reserved by open projects.</summary>
    decimal QuantityAvailable,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold,
    bool IsLowStock,
    IReadOnlyList<WarehouseStockLotDto> Lots,
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
    /// <summary>Optional initial lot unit cost when QuantityInStock &gt; 0. Also stored as last purchase price.</summary>
    decimal? Price,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold);

public record UpdateWarehouseItemRequest(
    string Name,
    string Category,
    string Unit,
    string? Supplier,
    string? Notes,
    decimal? LowStockThreshold);

public record ReceiveWarehouseStockRequest(
    decimal Quantity,
    decimal UnitCost,
    string? Supplier,
    string? Notes,
    DateTime? ReceivedAt,
    int? AllocateToProjectItemId,
    decimal? AllocateQuantity);

public record NonCatalogPurchaseRequestDto(
    int ProjectItemId,
    int ProjectId,
    string ProjectName,
    string ProjectStatus,
    string Name,
    string Category,
    string Unit,
    decimal QuantityToPurchase);
