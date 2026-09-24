import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { projectsApi } from '../api'
import type { ProjectListItem } from '../api/types'
import { formatDate } from '../utils/labels'
import { ProjectStatusChip } from '../components/StatusChips'
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
    <Stack spacing={2.5}>
      <Typography variant="body2" color="text.secondary">
        Проекти, на які вас призначено
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography color="text.secondary">На вас ще не призначено жодного проекту.</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <List disablePadding>
            {rows.map((row) => (
              <ListItemButton
                key={row.id}
                component={canOpenDetail ? RouterLink : 'div'}
                to={canOpenDetail ? `/projects/${row.id}` : undefined}
                divider
              >
                <ListItemText
                  primary={
                    <Typography fontWeight={600} component="span">
                      {row.name}
                    </Typography>
                  }
                  secondary={`${row.address} · ${row.customerName} · з ${formatDate(row.startDate)}`}
                />
                <ProjectStatusChip status={row.status} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}
    </Stack>
  )
}
