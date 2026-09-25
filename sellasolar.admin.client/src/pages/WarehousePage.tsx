import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
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
import SearchIcon from '@mui/icons-material/Search'
import { warehouseApi } from '../api'
import type { NonCatalogPurchaseRequest, WarehouseItemList } from '../api/types'
import { formatNumber, inventoryLabels, statusLabel } from '../utils/labels'
import { surfaceSx, panelPad, dataGridSx } from '../components/DetailPanel'

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
  price: '',
  supplier: '',
  notes: '',
  lowStockThreshold: '',
}

export default function WarehousePage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const needsOrder = stockFilter === 'order'
      const [items, cats, requests] = await Promise.all([
        warehouseApi.list({
          category: category || undefined,
          search: search || undefined,
          lowStockOnly: stockFilter === 'low' || undefined,
          needsPurchaseOnly: needsOrder || undefined,
        }),
        warehouseApi.categories(),
        needsOrder ? warehouseApi.purchaseRequests() : Promise.resolve([]),
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
      field: 'price',
      headerName: 'Ціна',
      width: 110,
      valueFormatter: (value) => formatNumber(value as number | null),
    },
    { field: 'supplier', headerName: 'Постачальник', flex: 1, minWidth: 140 },
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
      price: form.price === '' ? null : Number(form.price),
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

  const showOrderMode = stockFilter === 'order'

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1.5}
      >
        <Typography variant="body2" color="text.secondary">
          Матеріали, залишки та постачальники
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ flexShrink: 0 }}
        >
          Додати позицію
        </Button>
      </Stack>

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
          <TextField
            placeholder="Назва або постачальник"
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 }, flexShrink: 0 }}
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
            <ToggleButton value="order">{inventoryLabels.needsOrder}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {showOrderMode && purchaseRequests.length > 0 && (
        <Box sx={{ p: panelPad, ...surfaceSx }}>
          <Typography variant="subtitle1" fontWeight={800} mb={1.5}>
            Запити поза каталогом
          </Typography>
          <Stack spacing={1.25}>
            {purchaseRequests.map((req) => (
              <Box
                key={req.projectItemId}
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: 'error.light',
                  bgcolor: 'rgba(211, 47, 47, 0.04)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {req.name}{' '}
                      <Typography component="span" color="text.secondary">
                        ({req.category}, {req.unit})
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Проект: {req.projectName} · {statusLabel(req.projectStatus)} ·{' '}
                      {inventoryLabels.toOrder}: {formatNumber(req.quantityToPurchase)} {req.unit}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" color="error" label={inventoryLabels.notInWarehouse} />
                    <Button size="small" onClick={() => navigate(`/projects/${req.projectId}`)}>
                      Відкрити проект
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {isMobile ? (
        <Stack spacing={1.5}>
          {loading && <Typography color="text.secondary">Завантаження…</Typography>}
          {!loading && rows.length === 0 && !purchaseRequests.length && (
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
                    {row.supplier && (
                      <Chip size="small" variant="outlined" label={row.supplier} />
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
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
            <TextField
              label="Категорія"
              required
              fullWidth
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            />
            <TextField
              label="Ціна"
              type="number"
              fullWidth
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
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
  )
}
