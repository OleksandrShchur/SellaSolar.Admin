import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SearchIcon from '@mui/icons-material/Search'
import { warehouseApi } from '../api'
import type { NonCatalogPurchaseRequest, WarehouseItemList } from '../api/types'
import { formatNumber, inventoryLabels, statusLabel } from '../utils/labels'
import AddFab from '../components/AddFab'
import { surfaceSx, panelPad, dataGridSx } from '../components/DetailPanel'
import { CardListSkeleton } from '../components/PageSkeletons'
import RowActionsMenu, { type RowActionItem } from '../components/RowActionsMenu'

type StockFilter = 'all' | 'low' | 'order'

const toggleButtonSx = {
  flexShrink: 0,
  '& .MuiToggleButton-root': {
    px: 1.75,
    textTransform: 'none',
    fontWeight: 600,
  },
} as const

const emptyForm = {
  name: '',
  category: '',
  unit: 'шт',
  quantityInStock: '0',
  unitCost: '',
  supplier: '',
  notes: '',
  lowStockThreshold: '',
}

export default function WarehousePage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isXs = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()

  const [rows, setRows] = useState<WarehouseItemList[]>([])
  const [purchaseRequests, setPurchaseRequests] = useState<NonCatalogPurchaseRequest[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [promotingId, setPromotingId] = useState<number | null>(null)
  const [purchaseRequestsExpanded, setPurchaseRequestsExpanded] = useState(false)

  const togglePurchaseRequests = () => {
    setPurchaseRequestsExpanded((prev) => !prev)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const needsOrder = stockFilter === 'order'
      const loadPurchaseRequests = stockFilter === 'all' || needsOrder
      const [items, cats, requests] = await Promise.all([
        warehouseApi.list({
          category: category || undefined,
          search: search || undefined,
          lowStockOnly: stockFilter === 'low' || undefined,
          needsPurchaseOnly: needsOrder || undefined,
        }),
        warehouseApi.categories(),
        loadPurchaseRequests ? warehouseApi.purchaseRequests() : Promise.resolve([]),
      ])
      setRows(items)
      setCategories(cats)
      setPurchaseRequests(requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити склад')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const trimmed = searchInput.trim()
    const timer = window.setTimeout(() => {
      setSearch(trimmed.length >= 2 ? trimmed : '')
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    void load()
  }, [category, stockFilter, search])

  const columns: GridColDef<WarehouseItemList>[] = [
    {
      field: 'name',
      headerName: 'Назва',
      flex: 1.3,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {params.row.name}
          </Typography>
        </Box>
      ),
    },
    { field: 'category', headerName: 'Категорія', width: 140 },
    {
      field: 'quantityInStock',
      headerName: inventoryLabels.onHand,
      width: 130,
      valueGetter: (_value, row) => `${formatNumber(row.quantityInStock)} ${row.unit}`,
    },
    {
      field: 'quantityAvailable',
      headerName: inventoryLabels.available,
      width: 130,
      valueGetter: (_value, row) => `${formatNumber(row.quantityAvailable)} ${row.unit}`,
    },
    {
      field: 'quantityToOrder',
      headerName: inventoryLabels.toOrder,
      width: 120,
      valueGetter: (_value, row) =>
        row.quantityToOrder > 0 ? `${formatNumber(row.quantityToOrder)} ${row.unit}` : '—',
    },
    {
      field: 'isLowStock',
      headerName: 'Запас',
      width: 140,
      renderCell: (params) =>
        params.row.quantityToOrder > 0 ? (
          <Chip size="small" color="error" label={inventoryLabels.needsOrder} />
        ) : params.value ? (
          <Chip size="small" color="warning" label="Низький" />
        ) : (
          <Chip size="small" color="success" variant="outlined" label="OK" />
        ),
    },
    {
      field: 'usedInProjectsCount',
      headerName: 'У проектах',
      width: 110,
      align: 'center',
      headerAlign: 'center',
    },
  ]

  const openCreate = () => {
    setForm(emptyForm)
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const body = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantityInStock: Number(form.quantityInStock),
      price: form.unitCost === '' ? null : Number(form.unitCost),
      supplier: form.supplier || null,
      notes: form.notes || null,
      lowStockThreshold: form.lowStockThreshold === '' ? null : Number(form.lowStockThreshold),
    }
    try {
      await warehouseApi.create(body)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const addToCatalog = async (projectItemId: number) => {
    setPromotingId(projectItemId)
    setError(null)
    try {
      await warehouseApi.addPurchaseRequestToCatalog(projectItemId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати в каталог')
    } finally {
      setPromotingId(null)
    }
  }

  const showOrderMode = stockFilter === 'order'
  const showPurchaseRequests = stockFilter !== 'low' && purchaseRequests.length > 0

  const searchField = (sx: object) => (
    <TextField
      placeholder="Назва або постачальник"
      size="small"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      sx={sx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: searchInput ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label="Очистити пошук"
              onClick={() => {
                setSearchInput('')
                setSearch('')
              }}
              edge="end"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  )

  return (
    <>
      <AddFab label="Додати позицію" onClick={openCreate} />
      <Stack spacing={2.5}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          p: panelPad,
          ...surfaceSx,
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          alignItems={{ lg: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          {isMobile ? (
            <Box sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {searchField({ flex: 1, minWidth: 0 })}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  aria-expanded={filtersExpanded}
                  aria-label={filtersExpanded ? 'Сховати фільтри' : 'Показати фільтри'}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  }
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  Фільтри
                </Button>
              </Stack>
              <Collapse in={filtersExpanded}>
                <Stack spacing={1.5} sx={{ pt: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Категорія</InputLabel>
                    <Select
                      label="Категорія"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <MenuItem value="">Усі</MenuItem>
                      {categories.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={stockFilter}
                    onChange={(_, v) => {
                      if (v !== null) setStockFilter(v as StockFilter)
                    }}
                    sx={{ ...toggleButtonSx, width: '100%' }}
                  >
                    <ToggleButton value="all" sx={{ flex: 1 }}>
                      Усі
                    </ToggleButton>
                    <ToggleButton value="low" sx={{ flex: 1 }}>
                      Низький
                    </ToggleButton>
                    <ToggleButton value="order" sx={{ flex: 1 }}>
                      {inventoryLabels.toOrder}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Collapse>
            </Box>
          ) : (
            <>
              {searchField({ width: 300, flexShrink: 0 })}

              <FormControl size="small" sx={{ minWidth: 180, flexShrink: 0 }}>
                <InputLabel>Категорія</InputLabel>
                <Select
                  label="Категорія"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="">Усі</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ToggleButtonGroup
                exclusive
                size="small"
                value={stockFilter}
                onChange={(_, v) => {
                  if (v !== null) setStockFilter(v as StockFilter)
                }}
                sx={toggleButtonSx}
              >
                <ToggleButton value="all">Усі</ToggleButton>
                <ToggleButton value="low">Низький</ToggleButton>
                <ToggleButton value="order">{inventoryLabels.toOrder}</ToggleButton>
              </ToggleButtonGroup>
            </>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{
              display: { xs: 'none', lg: 'inline-flex' },
              flexShrink: 0,
              ml: { lg: 'auto' },
            }}
          >
            Додати позицію
          </Button>
        </Stack>
      </Box>

      {showPurchaseRequests && !loading && (
        <Box
          sx={{
            ...surfaceSx,
            overflow: 'hidden',
            borderLeft: '3px solid',
            borderLeftColor: 'error.main',
          }}
        >
          <Stack
            component="button"
            type="button"
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={togglePurchaseRequests}
            aria-expanded={purchaseRequestsExpanded}
            aria-label={
              purchaseRequestsExpanded
                ? inventoryLabels.purchaseRequestsCollapse
                : inventoryLabels.purchaseRequestsExpand
            }
            sx={{
              width: '100%',
              border: 0,
              bgcolor: 'rgba(180, 35, 24, 0.04)',
              cursor: 'pointer',
              textAlign: 'left',
              px: panelPad,
              py: 1.5,
              font: 'inherit',
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(180, 35, 24, 0.08)' },
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} component="span">
              {inventoryLabels.purchaseRequestsTitle}
            </Typography>
            <Chip
              size="small"
              color="error"
              label={purchaseRequests.length}
              sx={{ height: 22, minWidth: 28, fontWeight: 800 }}
            />
            <Box flex={1} />
            <ExpandMoreIcon
              sx={{
                color: 'text.secondary',
                transform: purchaseRequestsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </Stack>
          <Collapse in={purchaseRequestsExpanded}>
            <Stack spacing={1} sx={{ px: panelPad, pb: panelPad, pt: 0.5 }}>
              {purchaseRequests.map((req) => {
                const inCatalog = req.warehouseItemId != null
                const secondaryItems: RowActionItem[] = inCatalog
                  ? [
                      {
                        key: 'warehouse',
                        label: inventoryLabels.openOnWarehouse,
                        icon: <Inventory2OutlinedIcon fontSize="small" />,
                        onClick: () => navigate(`/warehouse/${req.warehouseItemId}`),
                      },
                    ]
                  : [
                      {
                        key: 'catalog',
                        label: inventoryLabels.addToCatalog,
                        icon: <AddIcon fontSize="small" />,
                        onClick: () => void addToCatalog(req.projectItemId),
                        disabled: promotingId === req.projectItemId,
                      },
                    ]
                return (
                  <Box
                    key={req.projectItemId}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderRadius: 1.5,
                      borderLeft: '3px solid',
                      borderLeftColor: 'error.main',
                      bgcolor: 'rgba(243, 235, 220, 0.35)',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box flex={1} sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {req.name}{' '}
                          <Typography component="span" color="text.secondary" fontWeight={600}>
                            · {inventoryLabels.toOrder}: {formatNumber(req.quantityToPurchase)}{' '}
                            {req.unit}
                          </Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {req.projectName} · {statusLabel(req.projectStatus)} · {req.category}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{ flexShrink: 0, mt: { xs: -0.5, sm: 0 } }}
                      >
                        <Button
                          size="small"
                          onClick={() => navigate(`/projects/${req.projectId}`)}
                          sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          {inventoryLabels.openProject}
                        </Button>
                        <RowActionsMenu
                          items={[
                            ...(isXs
                              ? [
                                  {
                                    key: 'project',
                                    label: inventoryLabels.openProject,
                                    icon: <FolderOpenOutlinedIcon fontSize="small" />,
                                    onClick: () => navigate(`/projects/${req.projectId}`),
                                  } satisfies RowActionItem,
                                ]
                              : []),
                            ...secondaryItems,
                          ]}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Collapse>
        </Box>
      )}

      {isMobile ? (
        loading ? (
          <CardListSkeleton lines={1} />
        ) : (
          <Stack spacing={1.5}>
            {rows.length === 0 && !purchaseRequests.length && (
              <Typography color="text.secondary">Позицій не знайдено</Typography>
            )}
            {rows.map((row) => (
              <Card
                key={row.id}
                variant="outlined"
                sx={{
                  '&:hover': { boxShadow: 1 },
                  ...(row.quantityToOrder > 0
                    ? { borderColor: 'error.light', bgcolor: 'rgba(211, 47, 47, 0.03)' }
                    : {}),
                }}
              >
                <CardActionArea onClick={() => navigate(`/warehouse/${row.id}`)}>
                  <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Typography fontWeight={700} noWrap>
                      {row.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {row.category} · {inventoryLabels.onHand}: {formatNumber(row.quantityInStock)}{' '}
                      {row.unit} · {inventoryLabels.available}: {formatNumber(row.quantityAvailable)}{' '}
                      {row.unit}
                      {row.quantityToOrder > 0
                        ? ` · ${inventoryLabels.toOrder}: ${formatNumber(row.quantityToOrder)}`
                        : ''}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                      {row.quantityToOrder > 0 ? (
                        <Chip size="small" color="error" label={inventoryLabels.needsOrder} />
                      ) : row.isLowStock ? (
                        <Chip size="small" color="warning" label="Низький" />
                      ) : (
                        <Chip size="small" color="success" variant="outlined" label="OK" />
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        <Box
          sx={{
            width: '100%',
            ...surfaceSx,
            overflow: 'hidden',
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            disableColumnSelector
            disableColumnMenu
            autoHeight
            rowHeight={52}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowClick={(params) => navigate(`/warehouse/${params.id}`)}
            getRowClassName={(params) =>
              params.row.quantityToOrder > 0 ? 'warehouse-row-order' : ''
            }
            sx={{
              ...dataGridSx,
              cursor: 'pointer',
              '& .warehouse-row-order': {
                bgcolor: 'rgba(211, 47, 47, 0.04)',
              },
            }}
            localeText={{
              noRowsLabel: showOrderMode
                ? purchaseRequests.length > 0
                  ? 'Немає позицій каталогу до замовлення'
                  : 'Немає матеріалів до замовлення'
                : 'Позицій не знайдено',
              MuiTablePagination: {
                labelRowsPerPage: 'Рядків на сторінці:',
              },
            }}
          />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Нова позиція складу</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Назва"
              required
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Autocomplete
              freeSolo
              options={categories}
              inputValue={form.category}
              onInputChange={(_, value) => setForm({ ...form, category: value })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Категорія"
                  required
                  fullWidth
                  helperText="Оберіть існуючу або введіть нову"
                />
              )}
            />
            <TextField
              label="Одиниця"
              required
              fullWidth
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <TextField
              label="Кількість на складі"
              type="number"
              required
              fullWidth
              value={form.quantityInStock}
              onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })}
              helperText="Якщо > 0 — створюється початкова партія"
            />
            <TextField
              label={inventoryLabels.unitCost}
              type="number"
              fullWidth
              value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              helperText="Для початкової партії (необов’язково)"
            />
            <TextField
              label="Постачальник"
              fullWidth
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
            <TextField
              label="Поріг низького запасу"
              type="number"
              fullWidth
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
            <TextField
              label="Примітки"
              multiline
              minRows={2}
              fullWidth
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button variant="contained" color="primary" onClick={() => void save()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
      </Stack>
    </>
  )
}
