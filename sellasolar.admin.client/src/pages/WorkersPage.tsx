import { useEffect, useState } from 'react'
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
import { workersApi } from '../api'
import type { Worker, WorkerType } from '../api/types'
import { workerTypeLabel } from '../utils/labels'

const emptyForm = {
  fullName: '',
  type: 'Installer' as WorkerType,
  phone: '',
  isActive: true,
}

export default function WorkersPage() {
  const [rows, setRows] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await workersApi.list({
          type: (type as WorkerType) || '',
          isActive: onlyActive ? true : '',
          search: search || undefined,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити працівників')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [type, onlyActive])

  const columns: GridColDef<Worker>[] = [
    { field: 'fullName', headerName: "Ім'я", flex: 1.2, minWidth: 180 },
    {
      field: 'type',
      headerName: 'Тип',
      width: 150,
      valueFormatter: (value) => workerTypeLabel(value as string),
    },
    { field: 'phone', headerName: 'Телефон', width: 160 },
    {
      field: 'isActive',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" color="success" label="Активний" />
        ) : (
          <Chip size="small" label="Неактивний" />
        ),
    },
  ]

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (row: Worker) => {
    setEditingId(row.id)
    setForm({
      fullName: row.fullName,
      type: row.type,
      phone: row.phone,
      isActive: row.isActive,
    })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editingId) await workersApi.update(editingId, form)
      else await workersApi.create(form)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editingId) return
    if (!window.confirm('Видалити працівника? Якщо він призначений на проекти — деактивуйте його.')) return
    try {
      await workersApi.remove(editingId)
      setOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити')
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
        <Typography variant="h5">Працівники</Typography>
        <Button startIcon={<AddIcon />} onClick={openCreate}>
          Додати працівника
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
          <InputLabel>Тип</InputLabel>
          <Select label="Тип" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="Assembler">Складальник</MenuItem>
            <MenuItem value="Installer">Монтажник</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />}
          label="Лише активні"
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
          onRowClick={(params) => openEdit(params.row)}
          sx={{ border: 'none', cursor: 'pointer' }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Редагувати працівника' : 'Новий працівник'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="ПІБ"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <FormControl>
              <InputLabel>Тип</InputLabel>
              <Select
                label="Тип"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as WorkerType })}
              >
                <MenuItem value="Assembler">Складальник</MenuItem>
                <MenuItem value="Installer">Монтажник</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Телефон"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              }
              label="Активний"
            />
            {editingId && (
              <Button color="error" variant="outlined" onClick={() => void remove()}>
                Видалити
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
