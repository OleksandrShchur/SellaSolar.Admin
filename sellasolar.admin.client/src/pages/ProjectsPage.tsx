import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import { projectsApi } from '../api'
import type { ProjectListItem, ProjectStatus } from '../api/types'
import { formatDate, statusLabel } from '../utils/labels'

const emptyForm = {
  name: '',
  description: '',
  address: '',
  status: 'InProgress' as ProjectStatus,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await projectsApi.list(status || undefined, search || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити проекти')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [status])

  const columns: GridColDef<ProjectListItem>[] = [
    { field: 'name', headerName: 'Назва', flex: 1.2, minWidth: 180 },
    { field: 'address', headerName: 'Адреса', flex: 1.4, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) => (
        <Chip
          size="small"
          label={statusLabel(params.value)}
          color={params.value === 'Completed' ? 'success' : 'primary'}
          variant="outlined"
        />
      ),
    },
    { field: 'customerName', headerName: 'Клієнт', flex: 1, minWidth: 140 },
    {
      field: 'assignedWorkerCount',
      headerName: 'Працівники',
      width: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'hasPurchaseNeeds',
      headerName: 'Закупівля',
      width: 140,
      renderCell: (params) =>
        params.value ? <Chip size="small" color="warning" label="Потрібно закупіти" /> : '—',
    },
    {
      field: 'createdAt',
      headerName: 'Створено',
      width: 120,
      valueFormatter: (value) => formatDate(value as string),
    },
  ]

  const handleCreate = async () => {
    setSaving(true)
    setError(null)
    try {
      const created = await projectsApi.create({
        ...form,
        customerEmail: form.customerEmail || null,
        customData: [],
      })
      setOpen(false)
      setForm(emptyForm)
      if (created) navigate(`/projects/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити проект')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
        <Typography variant="h5">Проекти</Typography>
        <Button startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Новий проект
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <TextField
          label="Пошук"
          placeholder="Назва, адреса або клієнт"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load()
          }}
          fullWidth
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            label="Статус"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="InProgress">У роботі</MenuItem>
            <MenuItem value="Completed">Завершено</MenuItem>
          </Select>
        </FormControl>
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
          onRowClick={(params) => navigate(`/projects/${params.id}`)}
          sx={{ border: 'none', cursor: 'pointer' }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новий проект</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Назва"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Опис"
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label="Адреса"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <FormControl>
              <InputLabel>Статус</InputLabel>
              <Select
                label="Статус"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                <MenuItem value="InProgress">У роботі</MenuItem>
                <MenuItem value="Completed">Завершено</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ім'я клієнта"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
            <TextField
              label="Телефон клієнта"
              required
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            />
            <TextField
              label="Email клієнта"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={() => void handleCreate()} disabled={saving}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="body2" color="text.secondary" mt={1}>
        Натисніть рядок, щоб відкрити деталі. Також: <RouterLink to="/warehouse">Склад</RouterLink>
      </Typography>
    </Box>
  )
}
