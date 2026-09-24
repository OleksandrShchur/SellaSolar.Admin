import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { projectsApi, warehouseApi, usersApi } from '../api'
import type {
  ProjectDetail,
  ProjectStatus,
  WarehouseItemList,
  UserListItem,
} from '../api/types'
import { formatDate, formatDateTime, formatNumber, workerTypeLabel } from '../utils/labels'
import { useAuth } from '../auth/AuthContext'
import { DetailField, DetailFieldGrid, DetailPanel, DetailSection } from '../components/DetailPanel'
import { ProjectStatusChip } from '../components/StatusChips'

interface TabPanelProps {
  value: number
  index: number
  children: React.ReactNode
}

function TabPanel({ value, index, children }: TabPanelProps) {
  if (value !== index) return null
  return <Box>{children}</Box>
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const canManageUsers = hasRole('Admin')

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [tab, setTab] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    address: '',
    status: 'InProgress' as ProjectStatus,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    startDate: '',
    endDate: '',
    customDataText: '',
  })

  const [itemOpen, setItemOpen] = useState(false)
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItemList[]>([])
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('')
  const [quantityNeeded, setQuantityNeeded] = useState('1')

  const [workerOpen, setWorkerOpen] = useState(false)
  const [workers, setWorkers] = useState<UserListItem[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('')
  const [roleOnProject, setRoleOnProject] = useState('')

  const [photoCaption, setPhotoCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectsApi.get(projectId)
      setProject(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити проект')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(projectId)) return
    void load()
  }, [projectId])

  const availableWorkers = useMemo(() => {
    if (!project) return []
    const assigned = new Set(project.workers.map((w) => w.userId))
    return workers.filter((w) => w.isActive && !assigned.has(w.id))
  }, [workers, project])

  const availableWarehouseItems = useMemo(() => {
    if (!project) return []
    const assigned = new Set(project.items.map((i) => i.warehouseItemId))
    return warehouseItems.filter((w) => !assigned.has(w.id))
  }, [warehouseItems, project])

  const openEdit = () => {
    if (!project) return
    setEditForm({
      name: project.name,
      description: project.description ?? '',
      address: project.address,
      status: project.status,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerEmail: project.customerEmail ?? '',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      customDataText: project.customData.map((c) => `${c.key}=${c.value}`).join('\n'),
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    setError(null)
    try {
      const customData = editForm.customDataText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const idx = line.indexOf('=')
          if (idx < 0) return { key: line, value: '' }
          return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
        })

      const updated = await projectsApi.update(projectId, {
        name: editForm.name,
        description: editForm.description || null,
        address: editForm.address,
        status: editForm.status,
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        customerEmail: editForm.customerEmail || null,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        customData,
      })
      setProject(updated ?? null)
      setEditOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти')
    }
  }

  const changeStatus = async (status: ProjectStatus) => {
    try {
      const updated = await projectsApi.updateStatus(projectId, status)
      setProject(updated ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити статус')
    }
  }

  const openAddItem = async () => {
    setError(null)
    try {
      setWarehouseItems(await warehouseApi.list())
      setSelectedItemId('')
      setQuantityNeeded('1')
      setItemOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити склад')
    }
  }

  const addItem = async () => {
    if (!selectedItemId) return
    try {
      await projectsApi.addItem(projectId, Number(selectedItemId), Number(quantityNeeded))
      setItemOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати матеріал')
    }
  }

  const openAddWorker = async () => {
    setError(null)
    try {
      setWorkers(await usersApi.workersForAssignment())
      setSelectedWorkerId('')
      setRoleOnProject('')
      setWorkerOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити працівників')
    }
  }

  const addWorker = async () => {
    if (!selectedWorkerId) return
    try {
      await projectsApi.assignWorker(projectId, selectedWorkerId, roleOnProject || undefined)
      setWorkerOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося призначити працівника')
    }
  }

  const uploadPhoto = async (file?: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await projectsApi.uploadPhoto(projectId, file, photoCaption || undefined)
      setPhotoCaption('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити фото')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Typography color="text.secondary">Завантаження…</Typography>
      </Stack>
    )
  }
  if (!project) return <Alert severity="error">{error ?? 'Проект не знайдено'}</Alert>

  const statusAction =
    project.status === 'Awaiting' ? (
      <Button variant="contained" color="primary" onClick={() => void changeStatus('InProgress')}>
        Почати роботу
      </Button>
    ) : project.status === 'InProgress' ? (
      <Button variant="contained" color="success" onClick={() => void changeStatus('Completed')}>
        Завершити
      </Button>
    ) : (
      <Button
        variant="outlined"
        color="primary"
        onClick={() => void changeStatus('InProgress')}
      >
        Повернути в роботу
      </Button>
    )

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'flex-start' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <IconButton onClick={() => navigate('/projects')} sx={{ mt: -0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={700} noWrap>
                {project.name}
              </Typography>
              <ProjectStatusChip status={project.status} />
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5} fontWeight={600}>
              {project.address}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <Button variant="outlined" color="primary" onClick={openEdit}>
            Редагувати
          </Button>
          {statusAction}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DetailPanel sx={{ p: 0, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          textColor="inherit"
          sx={{
            px: { xs: 1, sm: 1.5 },
            minHeight: 52,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'transparent',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: 'text.secondary',
              minHeight: 52,
              px: 1.75,
              '&.Mui-selected': {
                color: 'text.primary',
                fontWeight: 700,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              backgroundColor: 'primary.dark',
            },
          }}
        >
          <Tab label="Загальна інформація" />
          <Tab label="Матеріали" />
          <Tab label="Працівники" />
          <Tab label="Фото" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
          <TabPanel value={tab} index={0}>
            <Stack spacing={3}>
              <DetailFieldGrid columns={{ xs: 1, sm: 2 }}>
                <DetailField fullWidth label="Опис" value={project.description || '—'} />
                <DetailField label="Клієнт" value={project.customerName || '—'} />
                <DetailField
                  label="Контакти"
                  value={
                    [project.customerPhone, project.customerEmail].filter(Boolean).join(' · ') ||
                    '—'
                  }
                />
                <DetailField label="Початок" value={formatDate(project.startDate)} />
                <DetailField label="Кінець" value={formatDate(project.endDate)} />
                <DetailField label="Створено" value={formatDateTime(project.createdAt)} />
                <DetailField label="Оновлено" value={formatDateTime(project.updatedAt)} />
              </DetailFieldGrid>

              <DetailSection title="Додаткові дані">
                {project.customData.length === 0 ? (
                  <Typography color="text.secondary">Немає</Typography>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {project.customData.map((item) => (
                      <Chip
                        key={`${item.key}-${item.value}`}
                        size="small"
                        variant="outlined"
                        color="default"
                        label={
                          <Box component="span" sx={{ display: 'inline-flex', gap: 0.75, alignItems: 'baseline' }}>
                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                              {item.key}:
                            </Box>
                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                              {item.value}
                            </Box>
                          </Box>
                        }
                        sx={{
                          height: 'auto',
                          py: 0.75,
                          '& .MuiChip-label': { px: 1.25, py: 0.25 },
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </DetailSection>
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Stack direction="row" justifyContent="space-between" mb={2} alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                Матеріали проекту
              </Typography>
              <Button variant="contained" color="primary" onClick={() => void openAddItem()}>
                Додати матеріал
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {project.items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(243, 235, 220, 0.45)',
                    '&:hover': { boxShadow: 1, borderColor: 'primary.dark' },
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Box flex={1}>
                      <Typography fontWeight={700}>
                        {item.warehouseItemName}{' '}
                        <Typography component="span" color="text.secondary">
                          ({item.category}, {item.unit})
                        </Typography>
                      </Typography>
                      <Typography variant="body2">
                        Потрібно: {formatNumber(item.quantityNeeded)} · Зі складу:{' '}
                        {formatNumber(item.quantityFromStock)} · Закупити:{' '}
                        {formatNumber(item.quantityToPurchase)} · Залишок на складі:{' '}
                        {formatNumber(item.quantityInStock)}
                      </Typography>
                    </Box>
                    {item.needsPurchase && <Chip color="warning" label="Потрібно закупіти" />}
                    <IconButton
                      color="error"
                      onClick={() =>
                        void projectsApi.removeItem(projectId, item.id).then(load).catch((err) => {
                          setError(err instanceof Error ? err.message : 'Помилка видалення')
                        })
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
              {project.items.length === 0 && (
                <Typography color="text.secondary">Матеріали ще не додано</Typography>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Stack direction="row" justifyContent="space-between" mb={2} alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                Призначені працівники
              </Typography>
              <Button variant="contained" color="primary" onClick={() => void openAddWorker()}>
                Призначити
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {project.workers.map((worker) => (
                <Box
                  key={worker.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(243, 235, 220, 0.45)',
                    '&:hover': { boxShadow: 1, borderColor: 'primary.dark' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box flex={1}>
                      <Typography fontWeight={700}>
                        {worker.fullName}
                        {worker.workerType ? ` · ${workerTypeLabel(worker.workerType)}` : ''}
                      </Typography>
                      <Typography variant="body2">
                        {worker.phone || '—'}
                        {worker.roleOnProject ? ` · Роль: ${worker.roleOnProject}` : ''} ·{' '}
                        {formatDateTime(worker.assignedAt)}
                      </Typography>
                    </Box>
                    <IconButton
                      color="error"
                      onClick={() =>
                        void projectsApi
                          .removeWorker(projectId, worker.id)
                          .then(load)
                          .catch((err) => {
                            setError(err instanceof Error ? err.message : 'Помилка видалення')
                          })
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
              {project.workers.length === 0 && (
                <Typography color="text.secondary">Працівників ще не призначено</Typography>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Stack spacing={2} mb={2}>
              <TextField
                label="Підпис до фото"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" color="primary" component="label" disabled={uploading}>
                {uploading ? 'Завантаження...' : 'Завантажити фото'}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => void uploadPhoto(e.target.files?.[0])}
                />
              </Button>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              }}
            >
              {project.photos.map((photo) => (
                <Box
                  key={photo.id}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1.5px solid',
                    borderColor: 'divider',
                    bgcolor: 'rgba(243, 235, 220, 0.45)',
                  }}
                >
                  <Box
                    component="img"
                    src={photo.url}
                    alt={photo.caption ?? 'Фото проекту'}
                    sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                  />
                  <Stack direction="row" alignItems="center" p={1.5} spacing={1}>
                    <Box flex={1}>
                      <Typography variant="body2">{photo.caption || 'Без підпису'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(photo.uploadedAt)}
                      </Typography>
                    </Box>
                    <IconButton
                      color="error"
                      onClick={() =>
                        void projectsApi.removePhoto(projectId, photo.id).then(load).catch((err) => {
                          setError(err instanceof Error ? err.message : 'Помилка видалення')
                        })
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Box>
            {project.photos.length === 0 && (
              <Typography color="text.secondary">Фото ще немає</Typography>
            )}
          </TabPanel>
        </Box>
      </DetailPanel>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагувати проект</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Назва"
              fullWidth
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <TextField
              label="Опис"
              multiline
              minRows={2}
              fullWidth
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <TextField
              label="Адреса"
              fullWidth
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                label="Статус"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}
              >
                <MenuItem value="Awaiting">Очікує</MenuItem>
                <MenuItem value="InProgress">У роботі</MenuItem>
                <MenuItem value="Completed">Завершено</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ім'я клієнта"
              fullWidth
              value={editForm.customerName}
              onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
            />
            <TextField
              label="Телефон"
              fullWidth
              value={editForm.customerPhone}
              onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              value={editForm.customerEmail}
              onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
            />
            <TextField
              type="date"
              label="Дата початку"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={editForm.startDate}
              onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
            />
            <TextField
              type="date"
              label="Дата завершення"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={editForm.endDate}
              onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
            />
            <TextField
              label="Додаткові дані (ключ=значення, по рядку)"
              multiline
              minRows={3}
              fullWidth
              value={editForm.customDataText}
              onChange={(e) => setEditForm({ ...editForm, customDataText: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setEditOpen(false)}>
            Скасувати
          </Button>
          <Button variant="contained" color="primary" onClick={() => void saveEdit()}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={itemOpen} onClose={() => setItemOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Додати матеріал</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Позиція складу</InputLabel>
              <Select
                label="Позиція складу"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value as number)}
              >
                {availableWarehouseItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} (в наявності: {formatNumber(item.quantityInStock)} {item.unit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Потрібна кількість"
              type="number"
              fullWidth
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
            />
            <Typography variant="body2" color="text.secondary">
              Якщо на складі недостатньо — система позначить «Потрібно закупіти» і одразу спише
              доступну кількість.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setItemOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void addItem()}
            disabled={!selectedItemId}
          >
            Додати
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={workerOpen} onClose={() => setWorkerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Призначити працівника</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Працівник</InputLabel>
              <Select
                label="Працівник"
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
              >
                {availableWorkers.map((worker) => (
                  <MenuItem key={worker.id} value={worker.id}>
                    {worker.fullName}
                    {worker.workerType ? ` · ${workerTypeLabel(worker.workerType)}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Роль на проекті"
              fullWidth
              value={roleOnProject}
              onChange={(e) => setRoleOnProject(e.target.value)}
            />
            {canManageUsers && (
              <Typography variant="body2">
                Немає потрібного працівника?{' '}
                <RouterLink to="/users">Керувати співробітниками</RouterLink>
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setWorkerOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void addWorker()}
            disabled={!selectedWorkerId}
          >
            Призначити
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
