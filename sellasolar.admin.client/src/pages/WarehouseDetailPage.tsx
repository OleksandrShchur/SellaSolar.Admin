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
import { formatNumber, statusChipColor, statusLabel } from '../utils/labels'

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

  if (!item && !error) {
    return (
      <Stack spacing={2.5}>
        <Typography color="text.secondary">Завантаження…</Typography>
      </Stack>
    )
  }
  if (!item) return <Alert severity="error">{error}</Alert>

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'flex-start' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <IconButton onClick={() => navigate('/warehouse')} sx={{ mt: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700} noWrap>
                {item.name}
              </Typography>
              {item.isLowStock && <Chip size="small" color="warning" label="Низький запас" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {item.category} · {formatNumber(item.quantityInStock)} {item.unit}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button variant="outlined" onClick={openEdit}>
            Редагувати
          </Button>
          <Button color="error" variant="outlined" onClick={() => void remove()}>
            Видалити
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.25}>
          <Typography>
            <Typography component="span" color="text.secondary">
              Ціна:{' '}
            </Typography>
            {formatNumber(item.price)}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Постачальник:{' '}
            </Typography>
            {item.supplier || '—'}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Поріг низького запасу:{' '}
            </Typography>
            {formatNumber(item.lowStockThreshold)}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Примітки:{' '}
            </Typography>
            {item.notes || '—'}
          </Typography>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
          Використовується в проектах
        </Typography>
        <Stack spacing={1.5}>
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
                '&:hover': { boxShadow: 1 },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={700} flex={1} sx={{ minWidth: 0 }} noWrap>
                  {p.projectName}
                </Typography>
                <Chip
                  size="small"
                  label={statusLabel(p.projectStatus)}
                  color={statusChipColor(p.projectStatus)}
                  variant={p.projectStatus === 'Completed' ? 'outlined' : 'filled'}
                />
                <Typography variant="body2">Потрібно: {formatNumber(p.quantityNeeded)}</Typography>
                {p.needsPurchase && (
                  <Chip size="small" color="warning" label="Потрібно закупіти" />
                )}
              </Stack>
            </Box>
          ))}
          {item.projects.length === 0 && (
            <Typography color="text.secondary">
              Ця позиція ще не використовується в проектах
            </Typography>
          )}
        </Stack>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагувати позицію</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Назва"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Категорія"
              fullWidth
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <TextField
              label="Одиниця"
              fullWidth
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <TextField
              label="Кількість"
              type="number"
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
          <Button onClick={() => void save()}>Зберегти</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
