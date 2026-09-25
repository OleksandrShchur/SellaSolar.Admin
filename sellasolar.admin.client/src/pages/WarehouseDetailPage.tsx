import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { warehouseApi } from '../api'
import type { WarehouseItemDetail } from '../api/types'
import { formatDateTime, formatNumber, inventoryLabels } from '../utils/labels'
import { DetailField, DetailFieldGrid, DetailPanel } from '../components/DetailPanel'
import { ProjectStatusChip } from '../components/StatusChips'

export default function WarehouseDetailPage() {
  const { id } = useParams()
  const itemId = Number(id)
  const navigate = useNavigate()
  const [item, setItem] = useState<WarehouseItemDetail | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: '',
    supplier: '',
    notes: '',
    lowStockThreshold: '',
  })
  const [receiveForm, setReceiveForm] = useState({
    quantity: '1',
    unitCost: '',
    supplier: '',
    notes: '',
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

  const openEdit = async () => {
    if (!item) return
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      supplier: item.supplier ?? '',
      notes: item.notes ?? '',
      lowStockThreshold: item.lowStockThreshold?.toString() ?? '',
    })
    setOpen(true)
    try {
      setCategories(await warehouseApi.categories())
    } catch {
      setCategories([])
    }
  }

  const openReceive = () => {
    setReceiveForm({
      quantity: '1',
      unitCost: '',
      supplier: item?.supplier ?? '',
      notes: '',
    })
    setReceiveOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await warehouseApi.update(itemId, {
        name: form.name,
        category: form.category,
        unit: form.unit,
        supplier: form.supplier || null,
        notes: form.notes || null,
        lowStockThreshold: form.lowStockThreshold === '' ? null : Number(form.lowStockThreshold),
      })
      setItem(updated ?? null)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const saveReceive = async () => {
    const quantity = Number(receiveForm.quantity)
    const unitCost = Number(receiveForm.unitCost)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Кількість повинна бути більшою за нуль')
      return
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError('Вкажіть коректну ціну за одиницю')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await warehouseApi.receive(itemId, {
        quantity,
        unitCost,
        supplier: receiveForm.supplier || null,
        notes: receiveForm.notes || null,
      })
      setItem(updated ?? null)
      setReceiveOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати на склад')
    } finally {
      setSaving(false)
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
              {item.isLowStock && <Chip size="small" color="warning" label="Низький" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5} fontWeight={600}>
              {item.category}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button variant="contained" color="primary" onClick={openReceive}>
            {inventoryLabels.receive}
          </Button>
          <Button variant="outlined" color="primary" onClick={openEdit}>
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

      <DetailPanel>
        <DetailFieldGrid>
          <DetailField
            label={inventoryLabels.onHand}
            value={`${formatNumber(item.quantityInStock)} ${item.unit}`}
          />
          <DetailField
            label={inventoryLabels.available}
            value={`${formatNumber(item.quantityAvailable)} ${item.unit}`}
          />
          <DetailField label="Постачальник" value={item.supplier || '—'} />
          <DetailField label="Поріг низького запасу" value={formatNumber(item.lowStockThreshold)} />
          <DetailField fullWidth label="Примітки" value={item.notes || '—'} />
        </DetailFieldGrid>
      </DetailPanel>

      <DetailPanel>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.75} gap={1}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
            {inventoryLabels.lots}
          </Typography>
          <Button size="small" variant="outlined" onClick={openReceive}>
            {inventoryLabels.receive}
          </Button>
        </Stack>
        {item.lots.length === 0 ? (
          <Typography color="text.secondary">{inventoryLabels.noLots}</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата додавання на склад</TableCell>
                  <TableCell align="right">{inventoryLabels.unitCost}</TableCell>
                  <TableCell align="right">{inventoryLabels.onHand}</TableCell>
                  <TableCell align="right">{inventoryLabels.reserved}</TableCell>
                  <TableCell align="right">{inventoryLabels.available}</TableCell>
                  <TableCell>Постачальник</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {item.lots.map((lot) => (
                  <TableRow key={lot.lotId}>
                    <TableCell>{formatDateTime(lot.receivedAt)}</TableCell>
                    <TableCell align="right">{formatNumber(lot.unitCost)}</TableCell>
                    <TableCell align="right">{formatNumber(lot.quantityOnHand)}</TableCell>
                    <TableCell align="right">{formatNumber(lot.quantityReserved)}</TableCell>
                    <TableCell align="right">{formatNumber(lot.quantityFree)}</TableCell>
                    <TableCell>{lot.supplier || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DetailPanel>

      <DetailPanel>
        <Typography variant="subtitle1" fontWeight={800} mb={1.75} sx={{ letterSpacing: '-0.01em' }}>
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
                bgcolor: 'rgba(243, 235, 220, 0.55)',
                border: '1.5px solid',
                borderColor: 'divider',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover': {
                  boxShadow: 1,
                  borderColor: 'primary.dark',
                },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={700} flex={1} sx={{ minWidth: 0 }} noWrap>
                  {p.projectName}
                </Typography>
                <ProjectStatusChip status={p.projectStatus} />
                <Typography variant="body2" fontWeight={600}>
                  Потрібно: {formatNumber(p.quantityNeeded)} · {inventoryLabels.reserved}:{' '}
                  {formatNumber(p.quantityFromStock)}
                </Typography>
                {p.needsPurchase && (
                  <Chip size="small" color="warning" label={inventoryLabels.needsPurchase} />
                )}
              </Stack>
            </Box>
          ))}
          {item.projects.length === 0 && (
            <Typography color="text.secondary">
              Не використовується в активних проектах (очікує / у роботі)
            </Typography>
          )}
        </Stack>
      </DetailPanel>

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
              fullWidth
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
            <Alert severity="info">{inventoryLabels.receiveHint}</Alert>
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
          <Button variant="text" onClick={() => setOpen(false)} disabled={saving}>
            Скасувати
          </Button>
          <Button variant="contained" color="primary" onClick={() => void save()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={receiveOpen} onClose={() => !saving && setReceiveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{inventoryLabels.receiveStock}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              {inventoryLabels.receiveHint}
            </Typography>
            <TextField
              label="Кількість"
              type="number"
              required
              fullWidth
              value={receiveForm.quantity}
              onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
              inputProps={{ min: 0.01, step: 'any' }}
            />
            <TextField
              label={inventoryLabels.unitCost}
              type="number"
              required
              fullWidth
              value={receiveForm.unitCost}
              onChange={(e) => setReceiveForm({ ...receiveForm, unitCost: e.target.value })}
              inputProps={{ min: 0, step: 'any' }}
            />
            <TextField
              label="Постачальник"
              fullWidth
              value={receiveForm.supplier}
              onChange={(e) => setReceiveForm({ ...receiveForm, supplier: e.target.value })}
            />
            <TextField
              label="Примітки"
              multiline
              minRows={2}
              fullWidth
              value={receiveForm.notes}
              onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setReceiveOpen(false)} disabled={saving}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void saveReceive()}
            disabled={saving || !receiveForm.quantity || receiveForm.unitCost === ''}
          >
            {inventoryLabels.receive}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
