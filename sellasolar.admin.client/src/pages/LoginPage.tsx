import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Fade,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SolarPowerIcon from '@mui/icons-material/SolarPower'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../auth/AuthContext'
import { brandColors } from '../theme'
import { ensureCsrfToken } from '../api/client'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/projects'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void ensureCsrfToken().catch(() => {
      setError('Не вдалося ініціалізувати захищене з’єднання. Оновіть сторінку.')
    })
  }, [])

  if (user) {
    return <Navigate to={from} replace />
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося увійти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        background: `linear-gradient(160deg, ${brandColors.morningBg} 0%, ${brandColors.surface} 45%, ${brandColors.cream} 100%)`,
      }}
    >
      <Fade in timeout={400}>
        <Card
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 3,
            boxShadow: `0 20px 50px -24px ${brandColors.softShadow}`,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={3} component="form" onSubmit={submit}>
              <Stack spacing={1} alignItems="center" textAlign="center">
                <SolarPowerIcon color="primary" sx={{ fontSize: 40 }} />
                <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Sora", system-ui, sans-serif' }}>
                  SellaSolar Admin
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Увійдіть за іменем користувача та паролем
                </Typography>
              </Stack>

              {error && (
                <Alert severity="error" variant="outlined">
                  {error}
                </Alert>
              )}

              <TextField
                label="Ім'я користувача"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                fullWidth
                disabled={loading}
              />

              <TextField
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                fullWidth
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button type="submit" size="large" disabled={loading}>
                {loading ? 'Вхід…' : 'Увійти'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  )
}
