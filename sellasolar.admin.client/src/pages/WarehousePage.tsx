import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import { warehouseApi } from '../api'
import type { WarehouseItemList } from '../api/types'
import { formatNumber } from '../utils/labels'

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
  const navigate = useNavigate()
  const [rows, setRows] = useState<WarehouseItemList[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [items, cats] = await Promise.all([
        warehouseApi.list({
          category: category || undefined,
          search: search || undefined,
          lowStockOnly: lowStockOnly || undefined,
        }),
        warehouseApi.categories(),
      ])
      setRows(items)
      setCategories(cats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити склад')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [category, lowStockOnly])

  const columns: GridColDef<WarehouseItemList>[] = [
    { field: 'name', headerName: 'Назва', flex: 1.3, minWidth: 180 },
    { field: 'category', headerName: 'Категорія', width: 140 },
    {
      field: 'quantityInStock',
      headerName: 'Кількість',
      width: 130,
      valueGetter: (_value, row) => `${formatNumber(row.quantityInStock)} ${row.unit}`,
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
        params.value ? <Chip size="small" color="warning" label="Низький запас" /> : 'OK',
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

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
        <Typography variant="h5">Склад</Typography>
        <Button startIcon={<AddIcon />} onClick={openCreate}>
          Додати позицію
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2} alignItems={{ md: 'center' }}>
        <TextField
          label="Пошук"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load()
          }}
          fullWidth
        />
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Категорія</InputLabel>
          <Select label="Категорія" value={category} onChange={(e) => setCategory(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />}
          label="Лише низький запас"
        />
        <Button variant="outlined" onClick={() => void load()}>
          Знайти
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 520, bgcolor: 'background.paper', borderRadius: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          onRowClick={(params) => navigate(`/warehouse/${params.id}`)}
          sx={{ border: 'none', cursor: 'pointer' }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Нова позиція складу</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Назва" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Категорія" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Одиниця" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <TextField label="Кількість на складі" type="number" required value={form.quantityInStock} onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })} />
            <TextField label="Ціна" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <TextField label="Постачальник" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <TextField label="Поріг низького запасу" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            <TextField label="Примітки" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Скасувати</Button>
          <Button onClick={() => void save()} disabled={saving}>Зберегти</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="body2" color="text.secondary" mt={1}>
        Натисніть рядок, щоб відкрити деталі та список проектів, де використовується позиція.
      </Typography>
    </Box>
  )
}
