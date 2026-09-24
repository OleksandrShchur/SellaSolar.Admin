import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import { usersApi } from '../api'
import type { AppRole, UserListItem, WorkerType } from '../api/types'
import { appRoleLabel, workerTypeLabel } from '../utils/labels'
import RowActionsMenu, { type RowActionItem } from '../components/RowActionsMenu'

type RoleFilter = '' | 'Admin' | 'Worker'

const roles: AppRole[] = ['Admin', 'Manager', 'Worker']

const emptyCreate = {
  fullName: '',
  username: '',
  password: '',
  role: 'Worker' as AppRole,
  phone: '',
  workerType: 'Installer' as WorkerType,
}

function statusChip(row: UserListItem) {
  if (row.isBlocked) {
    return <Chip size="small" color="error" label="Заблоковано" />
  }
  if (row.isActive) {
    return <Chip size="small" color="success" label="Активний" />
  }
  return <Chip size="small" variant="outlined" label="Деактивовано" />
}

function roleChip(role: AppRole) {
  const color = role === 'Admin' ? 'secondary' : role === 'Manager' ? 'info' : 'primary'
  return <Chip size="small" color={color} label={appRoleLabel(role)} />
}

export default function UsersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [rows, setRows] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [onlyBlocked, setOnlyBlocked] = useState(false)
  const [onlyInactive, setOnlyInactive] = useState(false)

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
          isBlocked: onlyBlocked ? true : undefined,
          isActive: onlyInactive ? false : undefined,
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
    void load()
  }, [roleFilter, onlyBlocked, onlyInactive])

  const suggestUsername = async (fullName: string) => {
    if (!fullName.trim()) return
    try {
      const { suggestedUsername } = await usersApi.suggestUsername(fullName)
      setCreateForm((f) => ({ ...f, username: suggestedUsername }))
    } catch {
      // ignore suggest errors
    }
  }

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

  const block = async (id: string) => {
    try {
      await usersApi.block(id)
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

  const rowActions = (row: UserListItem): RowActionItem[] => [
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
    { kind: 'divider', key: 'div-1' },
    row.isBlocked
      ? {
          key: 'unblock',
          label: 'Розблокувати',
          icon: <LockOpenOutlinedIcon fontSize="small" />,
          onClick: () => void unblock(row.id),
          tone: 'warning',
        }
      : {
          key: 'block',
          label: 'Заблокувати',
          icon: <BlockOutlinedIcon fontSize="small" />,
          onClick: () => void block(row.id),
          tone: 'warning',
        },
    row.isActive
      ? {
          key: 'deactivate',
          label: 'Деактивувати',
          icon: <PersonOffOutlinedIcon fontSize="small" />,
          onClick: () => void deactivate(row.id),
          tone: 'danger',
        }
      : {
          key: 'activate',
          label: 'Активувати',
          icon: <PersonOutlineOutlinedIcon fontSize="small" />,
          onClick: () => void activate(row.id),
        },
  ]

  const columns: GridColDef<UserListItem>[] = [
    {
      field: 'fullName',
      headerName: 'ПІБ',
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ lineHeight: 1.35, py: 0.5, overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {params.row.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            @{params.row.username}
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
          {roleChip(params.value as AppRole)}
        </Box>
      ),
    },
    {
      field: 'workerType',
      headerName: 'Тип',
      width: 130,
      valueFormatter: (value) => (value ? workerTypeLabel(value as string) : '—'),
    },
    {
      field: 'phone',
      headerName: 'Телефон',
      width: 140,
      valueFormatter: (v) => v || '—',
    },
    {
      field: 'isActive',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {statusChip(params.row)}
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
        ...createForm,
        phone: createForm.role === 'Worker' ? createForm.phone : null,
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
        phone: editForm.role === 'Worker' ? editForm.phone : null,
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

  const workerFields = (
    role: AppRole,
    phone: string,
    workerType: WorkerType,
    onPhone: (v: string) => void,
    onType: (v: WorkerType) => void,
  ) =>
    role === 'Worker' ? (
      <>
        <TextField label="Телефон" required value={phone} onChange={(e) => onPhone(e.target.value)} fullWidth />
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
      </>
    ) : null

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1.5}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Співробітники
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Облікові записи адміністраторів, менеджерів і виконавців
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ flexShrink: 0 }}>
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
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={1.5}
            alignItems={{ lg: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              placeholder="Пошук за ПІБ, логіном або телефоном"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
              sx={{ flex: { lg: '1 1 260px' }, minWidth: { xs: '100%', sm: 240 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <ToggleButtonGroup
              exclusive
              size="small"
              value={roleFilter}
              onChange={(_, v) => {
                if (v !== null) setRoleFilter(v as RoleFilter)
              }}
              sx={{
                flexShrink: 0,
                '& .MuiToggleButton-root': {
                  px: 1.75,
                  textTransform: 'none',
                  fontWeight: 600,
                },
              }}
            >
              <ToggleButton value="">Усі</ToggleButton>
              <ToggleButton value="Admin">Адміни</ToggleButton>
              <ToggleButton value="Worker">Працівники</ToggleButton>
            </ToggleButtonGroup>

            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ ml: { lg: 'auto' } }}
            >
              <FormControlLabel
                sx={{ mr: 1, ml: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={onlyBlocked}
                    onChange={(e) => setOnlyBlocked(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">Заблоковані</Typography>}
              />
              <FormControlLabel
                sx={{ mr: 1, ml: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={onlyInactive}
                    onChange={(e) => setOnlyInactive(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">Деактивовані</Typography>}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => void load()}
                sx={{ minWidth: 0 }}
              >
                Оновити
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {isMobile ? (
        <Stack spacing={1.5}>
          {loading && <Typography color="text.secondary">Завантаження…</Typography>}
          {!loading && rows.length === 0 && (
            <Typography color="text.secondary">Співробітників не знайдено</Typography>
          )}
          {rows.map((row) => (
            <Card key={row.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 } }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} noWrap>
                      {row.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      @{row.username}
                      {row.phone ? ` · ${row.phone}` : ''}
                    </Typography>
                  </Box>
                  <RowActionsMenu items={rowActions(row)} />
                </Stack>
                <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                  {roleChip(row.role)}
                  {row.workerType && (
                    <Chip size="small" variant="outlined" label={workerTypeLabel(row.workerType)} />
                  )}
                  {statusChip(row)}
                </Stack>
              </CardContent>
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
            getRowId={(r) => r.id}
            loading={loading}
            disableRowSelectionOnClick
            disableColumnSelector
            autoHeight
            rowHeight={64}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
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
              onBlur={() => void suggestUsername(createForm.fullName)}
              required
              fullWidth
            />
            <TextField
              label="Ім'я користувача (логін)"
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              required
              fullWidth
              helperText="Латинські літери, цифри, .-_"
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
            {workerFields(
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
          <Button onClick={() => void createUser()} disabled={saving}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагування співробітника</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Логін" value={editUser?.username ?? ''} disabled fullWidth />
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
            {workerFields(
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
          <Button onClick={() => void saveEdit()} disabled={saving}>
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
          <Button onClick={() => void resetPassword()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
