import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { projectsApi } from '../api'
import type { ProjectListItem } from '../api/types'
import { formatDate, statusLabel } from '../utils/labels'
import { useAuth } from '../auth/AuthContext'

export default function MyJobsPage() {
  const { hasRole } = useAuth()
  const canOpenDetail = hasRole('Admin')
  const [rows, setRows] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRows(await projectsApi.mine())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити завдання')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Мої завдання
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">На вас ще не призначено жодного проекту.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {rows.map((row) => (
              <ListItemButton
                key={row.id}
                component={canOpenDetail ? RouterLink : 'div'}
                to={canOpenDetail ? `/projects/${row.id}` : undefined}
                divider
              >
                <ListItemText
                  primary={row.name}
                  secondary={`${row.address} · ${row.customerName} · з ${formatDate(row.startDate)}`}
                />
                <Chip
                  size="small"
                  color={row.status === 'Completed' ? 'default' : 'primary'}
                  label={statusLabel(row.status)}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Stack>
  )
}
