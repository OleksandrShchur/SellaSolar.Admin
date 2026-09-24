import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { authApi } from '../api'

type Props = {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordDialog({ open, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirm('')
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError('Новий пароль і підтвердження не збігаються.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setSuccess(true)
      setTimeout(handleClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити пароль')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>Зміна пароля</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Пароль успішно змінено.</Alert>}
            <TextField
              label="Поточний пароль"
              type={show ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Новий пароль"
              type={show ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              helperText="Мінімум 8 символів"
            />
            <TextField
              label="Підтвердження нового пароля"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow((v) => !v)} edge="end">
                      {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={handleClose}>
            Скасувати
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={saving}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
