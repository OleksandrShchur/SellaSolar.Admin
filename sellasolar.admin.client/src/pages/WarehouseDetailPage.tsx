import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { warehouseApi } from '../api'
import type { WarehouseItemDetail } from '../api/types'
import { formatNumber, statusLabel } from '../utils/labels'

export default function WarehouseDetailPage() {
  const { id } = useParams()
  const itemId = Number(id)
  const navigate = useNavigate()
  const [item, setItem] = useState<WarehouseItemDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: '',
    quantityInStock: '',
    price: '',
    supplier: '',
    notes: '',
    lowStockThreshold: '',
  })

  const load = async () => {
    setError(null)
    try {
      setItem(await warehouseApi.get(itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити')
    }
  }

  useEffect(() => {
    if (Number.isFinite(itemId)) void load()
  }, [itemId])

  const openEdit = () => {
    if (!item) return
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantityInStock: String(item.quantityInStock),
      price: item.price?.toString() ?? '',
      supplier: item.supplier ?? '',
      notes: item.notes ?? '',
      lowStockThreshold: item.lowStockThreshold?.toString() ?? '',
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const updated = await warehouseApi.update(itemId, {
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantityInStock: Number(form.quantityInStock),
        price: form.price === '' ? null : Number(form.price),
        supplier: form.supplier || null,
        notes: form.notes || null,
        lowStockThreshold: form.lowStockThreshold === '' ? null : Number(form.lowStockThreshold),
      })
      setItem(updated ?? null)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    }
  }

  const remove = async () => {
    if (!window.confirm('Видалити позицію складу?')) return
    try {
      await warehouseApi.remove(itemId)
      navigate('/warehouse')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити')
    }
  }

  if (!item && !error) return <Typography>Завантаження...</Typography>
  if (!item) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <IconButton onClick={() => navigate('/warehouse')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h5">{item.name}</Typography>
          <Typography color="text.secondary">
            {item.category} · {formatNumber(item.quantityInStock)} {item.unit}
          </Typography>
        </Box>
        {item.isLowStock && <Chip color="warning" label="Низький запас" />}
        <Button variant="outlined" onClick={openEdit}>
          Редагувати
        </Button>
        <Button color="error" variant="outlined" onClick={() => void remove()}>
          Видалити
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
        <Typography>Ціна: {formatNumber(item.price)}</Typography>
        <Typography>Постачальник: {item.supplier || '—'}</Typography>
        <Typography>Поріг низького запасу: {formatNumber(item.lowStockThreshold)}</Typography>
        <Typography mt={1}>Примітки: {item.notes || '—'}</Typography>
      </Box>

      <Typography variant="h6" mb={1}>
        Використовується в проектах
      </Typography>
      <Stack spacing={1}>
        {item.projects.map((p) => (
          <Box
            key={p.projectId}
            component={RouterLink}
            to={`/projects/${p.projectId}`}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={700} flex={1}>
                {p.projectName}
              </Typography>
              <Chip size="small" label={statusLabel(p.projectStatus)} />
              <Typography variant="body2">Потрібно: {formatNumber(p.quantityNeeded)}</Typography>
              {p.needsPurchase && <Chip size="small" color="warning" label="Потрібно закупіти" />}
            </Stack>
          </Box>
        ))}
        {item.projects.length === 0 && (
          <Typography color="text.secondary">Ця позиція ще не використовується в проектах</Typography>
        )}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагувати позицію</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Назва" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Категорія" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Одиниця" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <TextField label="Кількість" type="number" value={form.quantityInStock} onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })} />
            <TextField label="Ціна" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <TextField label="Постачальник" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <TextField label="Поріг низького запасу" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            <TextField label="Примітки" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Скасувати</Button>
          <Button onClick={() => void save()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
