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
import { usersApi } from '../api'
import type { AppRole, UserListItem } from '../api/types'
import { appRoleLabel } from '../utils/labels'

const roles: AppRole[] = ['Admin', 'Manager', 'Worker']

const emptyCreate = {
  fullName: '',
  username: '',
  password: '',
  role: 'Manager' as AppRole,
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [onlyBlocked, setOnlyBlocked] = useState(false)
  const [onlyInactive, setOnlyInactive] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editForm, setEditForm] = useState({ fullName: '', role: 'Manager' as AppRole })
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
          isBlocked: onlyBlocked ? true : undefined,
          isActive: onlyInactive ? false : undefined,
          search: search || undefined,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити користувачів')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [onlyBlocked, onlyInactive])

  const suggestUsername = async (fullName: string) => {
    if (!fullName.trim()) return
    try {
      const { suggestedUsername } = await usersApi.suggestUsername(fullName)
      setCreateForm((f) => ({ ...f, username: suggestedUsername }))
    } catch {
      // ignore suggest errors
    }
  }

  const columns: GridColDef<UserListItem>[] = [
    { field: 'username', headerName: "Логін", flex: 1, minWidth: 140 },
    { field: 'fullName', headerName: "Повне ім'я", flex: 1.2, minWidth: 180 },
    {
      field: 'role',
      headerName: 'Роль',
      width: 130,
      valueFormatter: (value) => appRoleLabel(value as string),
    },
    {
      field: 'isActive',
      headerName: 'Активність',
      width: 130,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" color="success" label="Активний" />
        ) : (
          <Chip size="small" label="Деактивовано" />
        ),
    },
    {
      field: 'isBlocked',
      headerName: 'Блокування',
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" color="error" label="Заблоковано" />
        ) : (
          <Chip size="small" variant="outlined" label="—" />
        ),
    },
    {
      field: 'id',
      headerName: 'Дії',
      width: 320,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={() => openEdit(row)}>
              Редагувати
            </Button>
            <Button
              size="small"
              onClick={() => {
                setResetUserId(row.id)
                setNewPassword('')
                setResetOpen(true)
              }}
            >
              Пароль
            </Button>
            {row.isBlocked ? (
              <Button size="small" color="warning" onClick={() => void unblock(row.id)}>
                Розблокувати
              </Button>
            ) : row.isActive ? (
              <Button size="small" color="inherit" onClick={() => void deactivate(row.id)}>
                Деактивувати
              </Button>
            ) : (
              <Button size="small" onClick={() => void activate(row.id)}>
                Активувати
              </Button>
            )}
          </Stack>
        )
      },
    },
  ]

  const openEdit = (row: UserListItem) => {
    setEditUser(row)
    setEditForm({ fullName: row.fullName, role: row.role })
    setEditOpen(true)
  }

  const createUser = async () => {
    setSaving(true)
    setError(null)
    try {
      await usersApi.create(createForm)
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити користувача')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    setError(null)
    try {
      await usersApi.update(editUser.id, editForm)
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

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Typography variant="h5" fontWeight={700}>
          Користувачі системи
        </Typography>
        <Button startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Новий користувач
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <TextField
          label="Пошук"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
          sx={{ minWidth: 220 }}
        />
        <FormControlLabel
          control={<Switch checked={onlyBlocked} onChange={(e) => setOnlyBlocked(e.target.checked)} />}
          label="Лише заблоковані"
        />
        <FormControlLabel
          control={<Switch checked={onlyInactive} onChange={(e) => setOnlyInactive(e.target.checked)} />}
          label="Лише деактивовані"
        />
        <Button variant="outlined" onClick={() => void load()}>
          Оновити
        </Button>
      </Stack>

      <Box sx={{ width: '100%', minHeight: 400 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          disableRowSelectionOnClick
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        />
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Новий користувач</DialogTitle>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Скасувати</Button>
          <Button onClick={() => void createUser()} disabled={saving}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагування користувача</DialogTitle>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Скасувати</Button>
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
          <Button onClick={() => setResetOpen(false)}>Скасувати</Button>
          <Button onClick={() => void resetPassword()} disabled={saving}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
