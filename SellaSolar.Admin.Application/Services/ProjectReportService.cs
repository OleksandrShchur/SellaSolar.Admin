using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SellaSolar.Admin.Application.Common;
using SellaSolar.Admin.Application.DTOs;
using SellaSolar.Admin.Data.Context;
using SellaSolar.Admin.Data.Entities;
using SellaSolar.Admin.Domain.Constants;

namespace SellaSolar.Admin.Application.Services;

public class ProjectReportService
{
    public static readonly string BrandOrange = "#E6670C";

    private static readonly CultureInfo Uk = CultureInfo.GetCultureInfo("uk-UA");
    private static readonly string[] UkMonths =
    [
        "СІЧНЯ", "ЛЮТОГО", "БЕРЕЗНЯ", "КВІТНЯ", "ТРАВНЯ", "ЧЕРВНЯ",
        "ЛИПНЯ", "СЕРПНЯ", "ВЕРЕСНЯ", "ЖОВТНЯ", "ЛИСТОПАДА", "ГРУДНЯ"
    ];

    private readonly SellaSolarAdminContext _db;
    private readonly IHostEnvironment _env;

    public ProjectReportService(SellaSolarAdminContext db, IHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<ProjectReportReadinessDto> GetReadinessAsync(int projectId, CancellationToken ct = default)
    {
        var project = await LoadProjectAsync(projectId, ct);
        if (project is null)
            throw new NotFoundException("Project not found.");

        return EvaluateReadiness(project);
    }

    public async Task<(byte[] Pdf, string FileName)> GenerateAsync(int projectId, CancellationToken ct = default)
    {
        var project = await LoadProjectAsync(projectId, ct);
        if (project is null)
            throw new NotFoundException("Project not found.");

        var readiness = EvaluateReadiness(project);
        if (!readiness.CanGenerate)
            throw new ConflictException(
                readiness.Message
                ?? "Не всі матеріали закуплені та розподілені по партіях.");

        var lines = BuildLines(project);
        var generatedAt = DateTime.Now;
        var logoPath = ResolveLogoPath();
        var pdf = BuildPdf(project, lines, generatedAt, logoPath);
        var safeName = SanitizeFileName(project.Name);
        var fileName = $"kvytantsiya-{safeName}-{generatedAt:yyyyMMdd}.pdf";
        return (pdf, fileName);
    }

    private async Task<Project?> LoadProjectAsync(int projectId, CancellationToken ct) =>
        await _db.Projects
            .AsNoTracking()
            .Include(p => p.ProjectItems).ThenInclude(i => i.WarehouseItem)
            .Include(p => p.ProjectItems).ThenInclude(i => i.ProjectItemLotAllocations)
                .ThenInclude(a => a.WarehouseStockLot)
            .Include(p => p.ProjectExpenses)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

    private static ProjectReportReadinessDto EvaluateReadiness(Project project)
    {
        if (project.Status != ProjectStatuses.InProgress)
        {
            return new ProjectReportReadinessDto(
                false,
                "Квитанцію можна згенерувати лише для проєкту в статусі «У роботі».",
                Array.Empty<string>());
        }

        var blocking = new List<string>();

        foreach (var item in project.ProjectItems.OrderBy(i => i.Id))
        {
            var name = item.WarehouseItem?.Name
                ?? item.RequestedName
                ?? $"#{item.Id}";

            if (item.WarehouseItemId is null)
            {
                if (item.NeedsPurchase || item.QuantityToPurchase > 0)
                    blocking.Add(name);
                continue;
            }

            var allocated = item.ProjectItemLotAllocations?.Sum(a => a.Quantity) ?? 0m;
            if (allocated < item.QuantityNeeded
                || item.QuantityFromStock < item.QuantityNeeded
                || item.NeedsPurchase
                || item.QuantityToPurchase > 0)
            {
                blocking.Add(name);
            }
        }

        if (blocking.Count > 0)
        {
            return new ProjectReportReadinessDto(
                false,
                "Не всі матеріали закуплені та розподілені по партіях. Завершіть закупівлю й розподіл, щоб згенерувати квитанцію.",
                blocking);
        }

        return new ProjectReportReadinessDto(true, null, Array.Empty<string>());
    }

    private static IReadOnlyList<ReportLine> BuildLines(Project project)
    {
        var lines = new List<ReportLine>();

        foreach (var item in project.ProjectItems
                     .Where(i => i.WarehouseItemId is not null)
                     .OrderBy(i => i.Id))
        {
            var qty = item.QuantityNeeded;
            var total = item.ProjectItemLotAllocations is { Count: > 0 }
                ? item.ProjectItemLotAllocations.Sum(a => a.Quantity * a.WarehouseStockLot.UnitCost)
                : item.CostFromStock ?? 0m;
            var unitPrice = qty > 0 ? Math.Round(total / qty, 2, MidpointRounding.AwayFromZero) : 0m;
            var unit = item.WarehouseItem?.Unit ?? string.Empty;
            var name = item.WarehouseItem?.Name ?? item.RequestedName ?? $"#{item.Id}";

            lines.Add(new ReportLine(name, unitPrice, qty, unit, total));
        }

        foreach (var expense in project.ProjectExpenses.OrderBy(e => e.Id))
        {
            lines.Add(new ReportLine(expense.Category, expense.Amount, 1, string.Empty, expense.Amount));
        }

        return lines;
    }

    private string? ResolveLogoPath()
    {
        var path = Path.Combine(_env.ContentRootPath, "wwwroot", "assets", "sella-solar-logo.png");
        return File.Exists(path) ? path : null;
    }

    private static byte[] BuildPdf(
        Project project,
        IReadOnlyList<ReportLine> lines,
        DateTime generatedAt,
        string? logoPath)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var brand = Color.FromHex(BrandOrange);
        var grandTotal = lines.Sum(l => l.Total);
        var dateLabel = FormatUkrainianDate(generatedAt);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(40);
                page.MarginVertical(36);
                page.DefaultTextStyle(x => x.FontFamily("Lato").FontSize(10).FontColor(Colors.Black));

                page.Header().Element(header =>
                {
                    header.Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("INVOICE")
                                .FontSize(28)
                                .Bold()
                                .FontColor(brand);

                            col.Item().PaddingTop(8).Text(text =>
                            {
                                text.Span("ДАТА ВИКОНАНИХ РОБІТ ТА ЗАПУСК СТАНЦІЇ: ")
                                    .FontSize(9)
                                    .FontColor(Colors.Black);
                                text.Span(dateLabel)
                                    .FontSize(9)
                                    .Bold()
                                    .FontColor(brand);
                            });

                            if (!string.IsNullOrWhiteSpace(project.CustomerName)
                                || !string.IsNullOrWhiteSpace(project.Address))
                            {
                                col.Item().PaddingTop(6).Text(project.Name)
                                    .FontSize(9)
                                    .SemiBold();
                                if (!string.IsNullOrWhiteSpace(project.CustomerName))
                                {
                                    col.Item().Text(project.CustomerName)
                                        .FontSize(8)
                                        .FontColor(Colors.Grey.Darken2);
                                }
                                if (!string.IsNullOrWhiteSpace(project.Address))
                                {
                                    col.Item().Text(project.Address)
                                        .FontSize(8)
                                        .FontColor(Colors.Grey.Darken2);
                                }
                            }
                        });

                        row.ConstantItem(90).AlignRight().Column(col =>
                        {
                            if (logoPath is not null)
                            {
                                col.Item().AlignRight().Width(56).Image(logoPath);
                            }

                            col.Item().PaddingTop(4).AlignRight().Text("SELLA SOLAR")
                                .FontSize(9)
                                .Bold()
                                .FontColor(brand);
                        });
                    });
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(28);
                            columns.RelativeColumn(3.2f);
                            columns.RelativeColumn(1.1f);
                            columns.RelativeColumn(0.9f);
                            columns.RelativeColumn(1.2f);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).AlignCenter().Text("№").Bold();
                            header.Cell().Element(HeaderCell).Text("Найменування").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("Ціна").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("К-сть.").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("Сума").Bold();

                            IContainer HeaderCell(IContainer c) => c
                                .Border(0.75f)
                                .BorderColor(Colors.Black)
                                .Background(brand)
                                .PaddingVertical(6)
                                .PaddingHorizontal(4)
                                .DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Black));
                        });

                        var index = 1;
                        foreach (var line in lines)
                        {
                            table.Cell().Element(BodyCell).AlignCenter().Text(index.ToString(Uk));
                            table.Cell().Element(BodyCell).Text(line.Name);
                            table.Cell().Element(BodyCell).AlignCenter().Text(FormatUsd(line.UnitPrice));
                            table.Cell().Element(BodyCell).AlignCenter().Text(FormatQty(line.Quantity, line.Unit));
                            table.Cell().Element(BodyCell).AlignCenter().Text(FormatUsd(line.Total));
                            index++;
                        }

                        static IContainer BodyCell(IContainer c) => c
                            .Border(0.75f)
                            .BorderColor(Colors.Black)
                            .PaddingVertical(5)
                            .PaddingHorizontal(4)
                            .DefaultTextStyle(x => x.FontSize(9));
                    });

                    col.Item().PaddingTop(12).AlignRight().Row(row =>
                    {
                        row.AutoItem().Background(brand).Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(8).PaddingHorizontal(14)
                            .Text("РАЗОМ:")
                            .Bold()
                            .FontSize(11)
                            .FontColor(Colors.Black);

                        row.AutoItem().Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(8).PaddingHorizontal(14)
                            .Text(FormatUsd(grandTotal))
                            .Bold()
                            .FontSize(11)
                            .FontColor(Colors.Black);
                    });
                });
            });
        }).GeneratePdf();
    }

    private static string FormatUsd(decimal value)
    {
        var formatted = value.ToString("0.##", Uk);
        return $"{formatted}$";
    }

    private static string FormatQty(decimal quantity, string unit)
    {
        var qty = quantity.ToString("0.##", Uk);
        if (string.IsNullOrWhiteSpace(unit) || unit.Equals("шт", StringComparison.OrdinalIgnoreCase))
            return qty;
        return unit is "м" or "м." ? $"{qty}{unit}" : $"{qty} {unit}";
    }

    private static string FormatUkrainianDate(DateTime date)
    {
        var month = UkMonths[date.Month - 1];
        return $"{date.Day} {month} — {date.Year}";
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(name.Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "project" : cleaned;
    }

    private sealed record ReportLine(
        string Name,
        decimal UnitPrice,
        decimal Quantity,
        string Unit,
        decimal Total);
}
