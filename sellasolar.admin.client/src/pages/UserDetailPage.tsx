import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { usersApi } from '../api'
import type { AppRole, UserListItem, WorkerType } from '../api/types'
import { appRoleLabel, workerTypeLabel } from '../utils/labels'

const roles: AppRole[] = ['Admin', 'Worker']

function statusChip(row: UserListItem) {
  if (row.isBlocked) {
    return <Chip size="small" color="error" label="Заблоковано" />
  }
  if (row.isActive) {
    return <Chip size="small" color="success" label="Активний" />
  }
  return <Chip size="small" variant="outlined" label="Деактивовано" />
}

function statusText(row: UserListItem) {
  if (row.isBlocked) return 'Заблоковано'
  if (row.isActive) return 'Активний'
  return 'Деактивовано'
}

function typeLabel(row: UserListItem) {
  if (row.role === 'Admin') return appRoleLabel('Admin')
  return row.workerType ? workerTypeLabel(row.workerType) : '—'
}

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserListItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'Worker' as AppRole,
    phone: '',
    workerType: 'Installer' as WorkerType,
  })

  const [resetOpen, setResetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const load = async () => {
    if (!id) return
    setError(null)
    try {
      setUser(await usersApi.get(id))
    } catch (err) {
      setUser(null)
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити')
    }
  }

  useEffect(() => {
    if (id) void load()
  }, [id])

  const openEdit = () => {
    if (!user) return
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      phone: user.phone ?? '',
      workerType: (user.workerType as WorkerType) || 'Installer',
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const updated = await usersApi.update(user.id, {
        fullName: editForm.fullName,
        role: editForm.role,
        phone: editForm.phone,
        workerType: editForm.role === 'Worker' ? editForm.workerType : null,
      })
      setUser(updated)
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await usersApi.resetPassword(user.id, { newPassword })
      setResetOpen(false)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося скинути пароль')
    } finally {
      setSaving(false)
    }
  }

  const activate = async () => {
    if (!user) return
    try {
      await usersApi.activate(user.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const deactivate = async () => {
    if (!user) return
    try {
      await usersApi.deactivate(user.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  const unblock = async () => {
    if (!user) return
    try {
      await usersApi.unblock(user.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    }
  }

  if (!user && !error) {
    return (
      <Stack spacing={2.5}>
        <Typography color="text.secondary">Завантаження…</Typography>
      </Stack>
    )
  }
  if (!user) return <Alert severity="error">{error}</Alert>

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'flex-start' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <IconButton onClick={() => navigate('/users')} sx={{ mt: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700} noWrap>
                {user.fullName}
              </Typography>
              {statusChip(user)}
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {appRoleLabel(user.role)} · {typeLabel(user)}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button variant="outlined" color="primary" onClick={openEdit}>
            Редагувати
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setNewPassword('')
              setResetOpen(true)
            }}
          >
            Скинути пароль
          </Button>
          {user.isBlocked && (
            <Button color="warning" variant="contained" onClick={() => void unblock()}>
              Розблокувати
            </Button>
          )}
          {user.isActive && user.role === 'Worker' && (
            <Button color="error" variant="outlined" onClick={() => void deactivate()}>
              Деактивувати
            </Button>
          )}
          {!user.isActive && (
            <Button color="success" variant="contained" onClick={() => void activate()}>
              Активувати
            </Button>
          )}
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
              Роль:{' '}
            </Typography>
            {appRoleLabel(user.role)}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Тип:{' '}
            </Typography>
            {typeLabel(user)}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Телефон (логін):{' '}
            </Typography>
            {user.phone || '—'}
          </Typography>
          <Typography>
            <Typography component="span" color="text.secondary">
              Статус:{' '}
            </Typography>
            {statusText(user)}
          </Typography>
        </Stack>
      </Box>

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
            <TextField
              label="Телефон (логін)"
              required
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                }))
              }
              inputMode="numeric"
              placeholder="0982441170"
              helperText="Формат: 0XXXXXXXXX"
              fullWidth
            />
            {editForm.role === 'Worker' ? (
              <FormControl fullWidth>
                <InputLabel>Тип працівника</InputLabel>
                <Select
                  label="Тип працівника"
                  value={editForm.workerType}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, workerType: e.target.value as WorkerType }))
                  }
                >
                  <MenuItem value="Assembler">Складальник</MenuItem>
                  <MenuItem value="Installer">Монтажник</MenuItem>
                </Select>
              </FormControl>
            ) : null}
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
