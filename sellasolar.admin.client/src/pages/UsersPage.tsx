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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import { usersApi } from '../api'
import type { AppRole, UserListItem, WorkerType } from '../api/types'
import { appRoleLabel } from '../utils/labels'
import RowActionsMenu, { type RowActionItem } from '../components/RowActionsMenu'
import { RoleChip, UserStatusChip, workerTypeDisplay } from '../components/StatusChips'
import { surfaceSx } from '../components/DetailPanel'

type RoleFilter = '' | 'Admin' | 'Worker'
type StatusFilter = 'active' | 'blocked' | 'inactive'

const roles: AppRole[] = ['Admin', 'Worker']

const toggleButtonSx = {
  flexShrink: 0,
  '& .MuiToggleButton-root': {
    px: 1.75,
    textTransform: 'none',
    fontWeight: 600,
  },
} as const

const emptyCreate = {
  fullName: '',
  password: '',
  role: 'Worker' as AppRole,
  phone: '',
  workerType: 'Installer' as WorkerType,
}

export default function UsersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()

  const [rows, setRows] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Worker')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'Worker' as AppRole,
    phone: '',
    workerType: 'Installer' as WorkerType,
  })
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await usersApi.list({
          role: roleFilter || undefined,
          isBlocked: statusFilter === 'blocked' ? true : statusFilter === 'active' ? false : undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
          search: search || undefined,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити співробітників')
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
  }, [roleFilter, statusFilter, search])

  const openEdit = (row: UserListItem) => {
    setEditUser(row)
    setEditForm({
      fullName: row.fullName,
      role: row.role,
      phone: row.phone ?? '',
      workerType: (row.workerType as WorkerType) || 'Installer',
    })
    setEditOpen(true)
  }

  const openReset = (row: UserListItem) => {
    setResetUserId(row.id)
    setNewPassword('')
    setResetOpen(true)
  }

  const activate = async (id: string) => {
    try {
      await usersApi.activate(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const deactivate = async (id: string) => {
    try {
      await usersApi.deactivate(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const unblock = async (id: string) => {
    try {
      await usersApi.unblock(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const rowActions = (row: UserListItem): RowActionItem[] => {
    const actions: RowActionItem[] = [
      {
        key: 'edit',
        label: 'Редагувати',
        icon: <EditOutlinedIcon fontSize="small" />,
        onClick: () => openEdit(row),
      },
      {
        key: 'password',
        label: 'Скинути пароль',
        icon: <LockResetOutlinedIcon fontSize="small" />,
        onClick: () => openReset(row),
      },
    ]

    const statusActions: RowActionItem[] = []

    if (row.isBlocked) {
      statusActions.push({
        key: 'unblock',
        label: 'Розблокувати',
        icon: <LockOpenOutlinedIcon fontSize="small" />,
        onClick: () => void unblock(row.id),
        tone: 'warning',
      })
    }

    if (row.isActive) {
      if (row.role === 'Worker') {
        statusActions.push({
          key: 'deactivate',
          label: 'Деактивувати',
          icon: <PersonOffOutlinedIcon fontSize="small" />,
          onClick: () => void deactivate(row.id),
          tone: 'danger',
        })
      }
    } else if (row.role === 'Worker' || row.role === 'Admin') {
      statusActions.push({
        key: 'activate',
        label: 'Активувати',
        icon: <PersonOutlineOutlinedIcon fontSize="small" />,
        onClick: () => void activate(row.id),
      })
    }

    if (statusActions.length > 0) {
      actions.push({ kind: 'divider', key: 'div-1' }, ...statusActions)
    }

    return actions
  }

  const columns: GridColDef<UserListItem>[] = [
    {
      field: 'fullName',
      headerName: 'ПІБ',
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {params.row.fullName}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Роль',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <RoleChip role={params.value as AppRole} />
        </Box>
      ),
    },
    {
      field: 'workerType',
      headerName: 'Тип',
      width: 130,
      valueGetter: (_value, row) => workerTypeDisplay(row),
    },
    {
      field: 'phone',
      headerName: 'Телефон (логін)',
      width: 150,
      valueFormatter: (v) => v || '—',
    },
    {
      field: 'isActive',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <UserStatusChip user={params.row} />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <RowActionsMenu items={rowActions(params.row)} />
        </Box>
      ),
    },
  ]

  const createUser = async () => {
    setSaving(true)
    setError(null)
    try {
      await usersApi.create({
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        phone: createForm.phone,
        workerType: createForm.role === 'Worker' ? createForm.workerType : null,
      })
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити співробітника')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    setError(null)
    try {
      await usersApi.update(editUser.id, {
        fullName: editForm.fullName,
        role: editForm.role,
        phone: editForm.phone,
        workerType: editForm.role === 'Worker' ? editForm.workerType : null,
      })
      setEditOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!resetUserId) return
    setSaving(true)
    setError(null)
    try {
      await usersApi.resetPassword(resetUserId, { newPassword })
      setResetOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося скинути пароль')
    } finally {
      setSaving(false)
    }
  }

  const phoneAndWorkerFields = (
    role: AppRole,
    phone: string,
    workerType: WorkerType,
    onPhone: (v: string) => void,
    onType: (v: WorkerType) => void,
  ) => (
    <>
      <TextField
        label="Телефон (логін)"
        required
        value={phone}
        onChange={(e) => onPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
        inputMode="numeric"
        placeholder="0982441170"
        helperText="Формат: 0XXXXXXXXX"
        fullWidth
      />
      {role === 'Worker' ? (
        <FormControl fullWidth>
          <InputLabel>Тип працівника</InputLabel>
          <Select
            label="Тип працівника"
            value={workerType}
            onChange={(e) => onType(e.target.value as WorkerType)}
          >
            <MenuItem value="Assembler">Складальник</MenuItem>
            <MenuItem value="Installer">Монтажник</MenuItem>
          </Select>
        </FormControl>
      ) : null}
    </>
  )

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1.5}
      >
        <Typography variant="body2" color="text.secondary">
          Облікові записи адміністраторів і виконавців
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Новий співробітник
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
            placeholder="ПІБ або телефон"
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
            value={roleFilter}
            onChange={(_, v) => {
              if (v !== null) setRoleFilter(v as RoleFilter)
            }}
            sx={toggleButtonSx}
          >
            <ToggleButton value="">Усі</ToggleButton>
            <ToggleButton value="Admin">Адміни</ToggleButton>
            <ToggleButton value="Worker">Працівники</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={statusFilter}
            onChange={(_, v) => {
              if (v !== null) setStatusFilter(v as StatusFilter)
            }}
            sx={toggleButtonSx}
          >
            <ToggleButton value="active">Активні</ToggleButton>
            <ToggleButton value="blocked">Заблоковані</ToggleButton>
            <ToggleButton value="inactive">Деактивовані</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {isMobile ? (
        <Stack spacing={1.5}>
          {loading && <Typography color="text.secondary">Завантаження…</Typography>}
          {!loading && rows.length === 0 && (
            <Typography color="text.secondary">Співробітників не знайдено</Typography>
          )}
          {rows.map((row) => (
            <Card key={row.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 }, position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                <RowActionsMenu items={rowActions(row)} />
              </Box>
              <CardActionArea onClick={() => navigate(`/users/${row.id}`)}>
                <CardContent sx={{ '&:last-child': { pb: 2 }, pr: 6 }}>
                  <Typography fontWeight={700} noWrap>
                    {row.fullName}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                    <RoleChip role={row.role} />
                    {workerTypeDisplay(row) !== '—' && row.role !== 'Admin' && (
                      <Chip size="small" variant="outlined" label={workerTypeDisplay(row)} />
                    )}
                    <UserStatusChip user={row} />
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
            getRowId={(r) => r.id}
            loading={loading}
            disableRowSelectionOnClick
            disableColumnSelector
            disableColumnMenu
            autoHeight
            rowHeight={52}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowClick={(params) => navigate(`/users/${params.id}`)}
            sx={{
              border: 'none',
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
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
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
              noRowsLabel: 'Співробітників не знайдено',
              MuiTablePagination: {
                labelRowsPerPage: 'Рядків на сторінці:',
              },
            }}
          />
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новий співробітник</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Повне ім'я"
              value={createForm.fullName}
              onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Пароль"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              required
              fullWidth
              helperText="Мінімум 8 символів"
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as AppRole }))}
              >
                {roles.map((r) => (
                  <MenuItem key={r} value={r}>
                    {appRoleLabel(r)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {phoneAndWorkerFields(
              createForm.role,
              createForm.phone,
              createForm.workerType,
              (phone) => setCreateForm((f) => ({ ...f, phone })),
              (workerType) => setCreateForm((f) => ({ ...f, workerType })),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setCreateOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void createUser()}
            disabled={saving}
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагування співробітника</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Повне ім'я"
              value={editForm.fullName}
              onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as AppRole }))}
              >
                {roles.map((r) => (
                  <MenuItem key={r} value={r}>
                    {appRoleLabel(r)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {phoneAndWorkerFields(
              editForm.role,
              editForm.phone,
              editForm.workerType,
              (phone) => setEditForm((f) => ({ ...f, phone })),
              (workerType) => setEditForm((f) => ({ ...f, workerType })),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setEditOpen(false)}>
            Скасувати
          </Button>
          <Button variant="contained" color="primary" onClick={() => void saveEdit()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Скидання пароля</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            label="Новий пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            helperText="Мінімум 8 символів"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setResetOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void resetPassword()}
            disabled={saving}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
