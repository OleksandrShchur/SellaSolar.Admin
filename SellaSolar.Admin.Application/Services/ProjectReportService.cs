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
    private static readonly string[] UkMonthsTitle =
    [
        "Січня", "Лютого", "Березня", "Квітня", "Травня", "Червня",
        "Липня", "Серпня", "Вересня", "Жовтня", "Листопада", "Грудня"
    ];

    private static readonly string[] SellerLines =
    [
        "ФОП Карлічук Я.В.",
        "АТ «УНІВЕРСАЛ БАНК»",
        "IBAN: UA233220010000026000350064724",
        "ЄДРПОУ: 3695303673",
        "МФО: 322001",
        "тел. 068 66 96 774",
        "селище Товсте, вул.С.Наливайка 67",
        "e.mail: sella.solarix@gmail.com",
    ];

    private const string AcceptanceText =
        "Замовник підтверджує, що роботи виконані в повному обсязі, а обладнання передане відповідно до погодженої специфікації. " +
        "Зауважень щодо якості виконаних робіт, комплектності та стану переданого обладнання не має. " +
        "Претензій до Виконавця не висуває.";

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
        var fileName = $"akt-{safeName}-{generatedAt:yyyyMMdd}.pdf";
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
        if (project.Status != ProjectStatuses.InProgress
            && project.Status != ProjectStatuses.Completed)
        {
            return new ProjectReportReadinessDto(
                false,
                "Акт можна згенерувати лише для проєкту в статусі «У роботі» або «Завершено».",
                Array.Empty<string>());
        }

        var blockingAllocation = new List<string>();
        var blockingSellPrice = new List<string>();

        foreach (var item in project.ProjectItems.OrderBy(i => i.Id))
        {
            var name = item.WarehouseItem?.Name
                ?? item.RequestedName
                ?? $"#{item.Id}";

            if (item.WarehouseItemId is null)
            {
                if (item.NeedsPurchase || item.QuantityToPurchase > 0)
                    blockingAllocation.Add(name);
                continue;
            }

            var allocated = item.ProjectItemLotAllocations?.Sum(a => a.Quantity) ?? 0m;
            if (allocated < item.QuantityNeeded
                || item.QuantityFromStock < item.QuantityNeeded
                || item.NeedsPurchase
                || item.QuantityToPurchase > 0)
            {
                blockingAllocation.Add(name);
                continue;
            }

            var missingSell = item.ProjectItemLotAllocations?
                .Any(a => a.Quantity > 0 && a.WarehouseStockLot?.UnitSellPrice is null) == true;
            if (missingSell)
                blockingSellPrice.Add(name);
        }

        if (blockingAllocation.Count > 0)
        {
            return new ProjectReportReadinessDto(
                false,
                "Не всі матеріали закуплені та розподілені по партіях. Завершіть закупівлю й розподіл, щоб згенерувати акт.",
                blockingAllocation);
        }

        if (blockingSellPrice.Count > 0)
        {
            return new ProjectReportReadinessDto(
                false,
                "Не для всіх розподілених партій вказано ціну продажу. Додайте ціну продажу в картці складу, щоб згенерувати акт.",
                blockingSellPrice);
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
                ? item.ProjectItemLotAllocations.Sum(a =>
                    a.Quantity * (a.WarehouseStockLot.UnitSellPrice ?? 0m))
                : item.SellFromStock ?? 0m;
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
        var sectionBg = Colors.Grey.Lighten3;
        var grandTotal = lines.Sum(l => l.Total);
        var commissionDate = ResolveCommissionDate(project, generatedAt);
        var warrantyEnd = commissionDate.AddYears(1);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginHorizontal(36);
                page.MarginVertical(28);
                page.DefaultTextStyle(x => x.FontFamily("Lato").FontSize(9).FontColor(Colors.Black));

                page.Content().Column(col =>
                {
                    // Brand header
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().AlignMiddle().AlignCenter().Column(headerCol =>
                        {
                            headerCol.Item().AlignCenter().Text("SELLA SOLAR")
                                .FontSize(26)
                                .Bold()
                                .FontColor(brand);

                            headerCol.Item().PaddingTop(4).AlignCenter().Text(
                                    $"АКТ ПРИЙМАННЯ-ПЕРЕДАЧІ ОБЛАДНАННЯ\nТА ВИКОНАНИХ РОБІТ №{project.Id}")
                                .FontSize(11)
                                .Bold()
                                .AlignCenter();
                        });

                        if (logoPath is not null)
                        {
                            row.ConstantItem(52).AlignRight().AlignMiddle().Width(48).Image(logoPath);
                        }
                    });

                    col.Item().PaddingTop(6).PaddingBottom(8)
                        .LineHorizontal(1.25f)
                        .LineColor(brand);

                    // 1. Parties
                    col.Item().Element(c => SectionHeader(c, "1. СТОРОНИ ТА ОБ'ЄКТ", sectionBg));

                    col.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem().PaddingRight(8).Column(left =>
                        {
                            left.Item().Text("ПРОДАВЕЦЬ/ВИКОНАВЕЦЬ")
                                .FontSize(9)
                                .Bold()
                                .FontColor(brand);

                            foreach (var line in SellerLines)
                            {
                                left.Item().PaddingTop(1).Text(line).FontSize(8);
                            }
                        });

                        row.RelativeItem().PaddingLeft(8).Column(right =>
                        {
                            right.Item().Text("КЛІЄНТ/ЗАМОВНИК")
                                .FontSize(9)
                                .Bold()
                                .FontColor(brand);

                            right.Item().PaddingTop(1).Text(project.CustomerName).FontSize(8);

                            if (!string.IsNullOrWhiteSpace(project.Address))
                                right.Item().PaddingTop(1).Text(project.Address).FontSize(8);

                            if (!string.IsNullOrWhiteSpace(project.CustomerPhone))
                                right.Item().PaddingTop(1).Text($"тел.{FormatPhone(project.CustomerPhone)}").FontSize(8);
                        });
                    });

                    // 2. Equipment / works table
                    col.Item().PaddingTop(10)
                        .Element(c => SectionHeader(
                            c,
                            "2. ПЕРЕДАНЕ ОБЛАДНАННЯ ТА МАТЕРІАЛИ. ВИКОНАНІ РОБОТИ",
                            sectionBg));

                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(24);
                            columns.RelativeColumn(3.4f);
                            columns.RelativeColumn(1.1f);
                            columns.RelativeColumn(0.85f);
                            columns.RelativeColumn(1.15f);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).AlignCenter().Text("№").Bold();
                            header.Cell().Element(HeaderCell).Text("Найменування").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("Ціна | $").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("К-сть.").Bold();
                            header.Cell().Element(HeaderCell).AlignCenter().Text("Сума | $").Bold();

                            IContainer HeaderCell(IContainer c) => c
                                .Border(0.6f)
                                .BorderColor(Colors.Black)
                                .Background(sectionBg)
                                .PaddingVertical(4)
                                .PaddingHorizontal(3)
                                .DefaultTextStyle(x => x.FontSize(8).FontColor(Colors.Black));
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
                            .Border(0.6f)
                            .BorderColor(Colors.Black)
                            .PaddingVertical(3)
                            .PaddingHorizontal(3)
                            .DefaultTextStyle(x => x.FontSize(8));
                    });

                    // 3. Serials / warranty (hardcoded warranty; serials blank for now)
                    col.Item().PaddingTop(10)
                        .Element(c => SectionHeader(c, "3. СЕРІЙНІ НОМЕРИ ТА ГАРАНТІЯ", sectionBg));

                    col.Item().PaddingTop(6).Column(warranty =>
                    {
                        warranty.Item().Text("Гарантія від виробника на обладнання Deye - 10 років.")
                            .FontSize(8);
                        warranty.Item().PaddingTop(2)
                            .Text("Серійний номер інвертора: ________________")
                            .FontSize(8);
                        warranty.Item().PaddingTop(2)
                            .Text("Серійний номер акумулятора: ________________")
                            .FontSize(8);
                        warranty.Item().PaddingTop(2).Text(
                                $"Гарантія на монтаж 1 рік. ({FormatShortDate(commissionDate)} - {FormatShortDate(warrantyEnd)}) " +
                                $"Введення в експлуатацію СЕС: {FormatCommissionDate(commissionDate)}")
                            .FontSize(8);
                    });

                    // 4. Cost summary (total only)
                    col.Item().PaddingTop(10)
                        .Element(c => SectionHeader(c, "4. ВАРТІСТЬ ТА РОЗРАХУНКИ", sectionBg));

                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(3.2f);
                            columns.RelativeColumn(1.4f);
                        });

                        table.Cell().Element(SummaryLabelCell)
                            .Text("Загальна вартість обладнання та робіт")
                            .FontSize(8);
                        table.Cell().Element(SummaryValueCell)
                            .AlignRight()
                            .Text(FormatUsd(grandTotal))
                            .FontSize(9)
                            .Bold();

                        static IContainer SummaryLabelCell(IContainer c) => c
                            .Border(0.6f)
                            .BorderColor(Colors.Black)
                            .PaddingVertical(5)
                            .PaddingHorizontal(6);

                        static IContainer SummaryValueCell(IContainer c) => c
                            .Border(0.6f)
                            .BorderColor(Colors.Black)
                            .PaddingVertical(5)
                            .PaddingHorizontal(6);
                    });

                    // 5. Acceptance
                    col.Item().PaddingTop(10)
                        .Element(c => SectionHeader(c, "5. ПІДТВЕРДЖЕННЯ ПРИЙМАННЯ", sectionBg));

                    col.Item().PaddingTop(6).Text(AcceptanceText).FontSize(8).LineHeight(1.25f);

                    col.Item().PaddingTop(18).Row(row =>
                    {
                        row.RelativeItem().Text("ПРОДАВЕЦЬ/ВИКОНАВЕЦЬ: ________________")
                            .FontSize(9)
                            .Bold();
                        row.RelativeItem().AlignRight().Text("ЗАМОВНИК: ________________")
                            .FontSize(9)
                            .Bold();
                    });
                });
            });
        }).GeneratePdf();
    }

    private static void SectionHeader(IContainer container, string title, string background)
    {
        container
            .Background(background)
            .Border(0.5f)
            .BorderColor(Colors.Grey.Medium)
            .PaddingVertical(4)
            .PaddingHorizontal(6)
            .Text(title)
            .FontSize(9)
            .Bold();
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

    private static DateTime ResolveCommissionDate(Project project, DateTime today)
    {
        if (project.Status == ProjectStatuses.Completed && project.EndDate is not null)
            return project.EndDate.Value.Date;

        return today.Date;
    }

    private static string FormatShortDate(DateTime date) => date.ToString("dd.MM.yy", Uk);

    private static string FormatCommissionDate(DateTime date)
    {
        var month = UkMonthsTitle[date.Month - 1];
        return $"{date.Day} {month} {date.Year}р.";
    }

    private static string FormatPhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10)
            return $"{digits[..3]} {digits[3..5]} {digits[5..7]} {digits[7..]}";
        if (digits.Length == 12 && digits.StartsWith("38", StringComparison.Ordinal))
            return $"{digits[2..5]} {digits[5..7]} {digits[7..9]} {digits[9..]}";
        return phone;
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
