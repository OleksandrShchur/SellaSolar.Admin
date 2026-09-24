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
import { projectsApi } from '../api'
import type { ProjectListItem, ProjectStatus } from '../api/types'
import { formatDate } from '../utils/labels'
import { ProjectStatusChip } from '../components/StatusChips'

type StatusFilter = '' | ProjectStatus

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
  description: '',
  address: '',
  status: 'Awaiting' as ProjectStatus,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
}

function statusChip(status: ProjectStatus) {
  return <ProjectStatusChip status={status} />
}

export default function ProjectsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()

  const [rows, setRows] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await projectsApi.list(statusFilter || undefined, search || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити проекти')
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
  }, [statusFilter, search])

  const columns: GridColDef<ProjectListItem>[] = [
    {
      field: 'name',
      headerName: 'Назва',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {params.row.name}
          </Typography>
        </Box>
      ),
    },
    { field: 'address', headerName: 'Адреса', flex: 1.4, minWidth: 200 },
    {
      field: 'status',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {statusChip(params.value as ProjectStatus)}
        </Box>
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
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1.5}
      >
        <Typography variant="body2" color="text.secondary">
          Монтажні обʼєкти: статуси, клієнти та закупівлі
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Новий проект
        </Button>
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
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          alignItems={{ lg: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            placeholder="Назва, адреса або клієнт"
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

          <ToggleButtonGroup
            exclusive
            size="small"
            value={statusFilter}
            onChange={(_, v) => {
              if (v !== null) setStatusFilter(v as StatusFilter)
            }}
            sx={toggleButtonSx}
          >
            <ToggleButton value="">Усі</ToggleButton>
            <ToggleButton value="Awaiting">Очікує</ToggleButton>
            <ToggleButton value="InProgress">У роботі</ToggleButton>
            <ToggleButton value="Completed">Завершено</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {isMobile ? (
        <Stack spacing={1.5}>
          {loading && <Typography color="text.secondary">Завантаження…</Typography>}
          {!loading && rows.length === 0 && (
            <Typography color="text.secondary">Проектів не знайдено</Typography>
          )}
          {rows.map((row) => (
            <Card key={row.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 } }}>
              <CardActionArea onClick={() => navigate(`/projects/${row.id}`)}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Typography fontWeight={700} noWrap>
                    {row.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap mt={0.5}>
                    {row.address}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                    {statusChip(row.status)}
                    {row.hasPurchaseNeeds && (
                      <Chip size="small" color="warning" label="Потрібно закупіти" />
                    )}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={row.customerName || '—'}
                    />
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
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
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
            onRowClick={(params) => navigate(`/projects/${params.id}`)}
            sx={{
              border: 'none',
              cursor: 'pointer',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 700,
                fontSize: '0.8rem',
              },
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
                borderColor: 'divider',
                py: 0.5,
              },
              '& .MuiDataGrid-row:hover': {
                bgcolor: 'action.hover',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                outline: 'none',
              },
            }}
            localeText={{
              noRowsLabel: 'Проектів не знайдено',
              MuiTablePagination: {
                labelRowsPerPage: 'Рядків на сторінці:',
              },
            }}
          />
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новий проект</DialogTitle>
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
              label="Опис"
              multiline
              minRows={2}
              fullWidth
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label="Адреса"
              required
              fullWidth
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                label="Статус"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
              >
                <MenuItem value="Awaiting">Очікує</MenuItem>
                <MenuItem value="InProgress">У роботі</MenuItem>
                <MenuItem value="Completed">Завершено</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ім'я клієнта"
              required
              fullWidth
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
            <TextField
              label="Телефон клієнта"
              required
              fullWidth
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            />
            <TextField
              label="Email клієнта"
              fullWidth
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void handleCreate()}
            disabled={saving}
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
