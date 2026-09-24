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
import { formatDate, formatDateTime, formatNumber, statusLabel, workerTypeLabel } from '../utils/labels'
import { useAuth } from '../auth/AuthContext'

interface TabPanelProps {
  value: number
  index: number
  children: React.ReactNode
}

function TabPanel({ value, index, children }: TabPanelProps) {
  if (value !== index) return null
  return <Box pt={2}>{children}</Box>
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

  if (loading) return <Typography>Завантаження...</Typography>
  if (!project) return <Alert severity="error">{error ?? 'Проект не знайдено'}</Alert>

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <IconButton onClick={() => navigate('/projects')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h5">{project.name}</Typography>
          <Typography color="text.secondary">{project.address}</Typography>
        </Box>
        <Chip
          label={statusLabel(project.status)}
          color={project.status === 'Completed' ? 'success' : 'primary'}
        />
        <Button variant="outlined" onClick={openEdit}>
          Редагувати
        </Button>
        {project.status === 'InProgress' ? (
          <Button color="success" onClick={() => void changeStatus('Completed')}>
            Завершити
          </Button>
        ) : (
          <Button variant="outlined" onClick={() => void changeStatus('InProgress')}>
            Повернути в роботу
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        <Tab label="Загальна інформація" />
        <Tab label="Матеріали" />
        <Tab label="Працівники" />
        <Tab label="Фото" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box flex={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Опис
            </Typography>
            <Typography mb={2}>{project.description || '—'}</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Клієнт
            </Typography>
            <Typography>
              {project.customerName} · {project.customerPhone}
              {project.customerEmail ? ` · ${project.customerEmail}` : ''}
            </Typography>
          </Box>
          <Box flex={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Дати
            </Typography>
            <Typography>
              Початок: {formatDate(project.startDate)} · Кінець: {formatDate(project.endDate)}
            </Typography>
            <Typography mt={1} color="text.secondary">
              Створено: {formatDateTime(project.createdAt)} · Оновлено: {formatDateTime(project.updatedAt)}
            </Typography>
          </Box>
        </Stack>
        <Typography variant="subtitle1" fontWeight={700} mt={3} mb={1}>
          Додаткові дані
        </Typography>
        {project.customData.length === 0 && <Typography color="text.secondary">Немає</Typography>}
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {project.customData.map((item) => (
            <Chip key={`${item.key}-${item.value}`} label={`${item.key}: ${item.value}`} />
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Матеріали проекту
          </Typography>
          <Button onClick={() => void openAddItem()}>Додати матеріал</Button>
        </Stack>
        <Stack spacing={1.5}>
          {project.items.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
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
          {project.items.length === 0 && <Typography color="text.secondary">Матеріали ще не додано</Typography>}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1" fontWeight={700}>
            Призначені працівники
          </Typography>
          <Button onClick={() => void openAddWorker()}>Призначити</Button>
        </Stack>
        <Stack spacing={1.5}>
          {project.workers.map((worker) => (
            <Box
              key={worker.id}
              sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
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
                    void projectsApi.removeWorker(projectId, worker.id).then(load).catch((err) => {
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
          />
          <Button variant="outlined" component="label" disabled={uploading}>
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
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
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
        {project.photos.length === 0 && <Typography color="text.secondary">Фото ще немає</Typography>}
      </TabPanel>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Редагувати проект</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Назва" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Опис" multiline minRows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <TextField label="Адреса" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            <FormControl>
              <InputLabel>Статус</InputLabel>
              <Select label="Статус" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ProjectStatus })}>
                <MenuItem value="InProgress">У роботі</MenuItem>
                <MenuItem value="Completed">Завершено</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Ім'я клієнта" value={editForm.customerName} onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })} />
            <TextField label="Телефон" value={editForm.customerPhone} onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })} />
            <TextField label="Email" value={editForm.customerEmail} onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })} />
            <TextField type="date" label="Дата початку" InputLabelProps={{ shrink: true }} value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
            <TextField type="date" label="Дата завершення" InputLabelProps={{ shrink: true }} value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
            <TextField
              label="Додаткові дані (ключ=значення, по рядку)"
              multiline
              minRows={3}
              value={editForm.customDataText}
              onChange={(e) => setEditForm({ ...editForm, customDataText: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setEditOpen(false)}>Скасувати</Button>
          <Button onClick={() => void saveEdit()}>Зберегти</Button>
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
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
            />
            <Typography variant="body2" color="text.secondary">
              Якщо на складі недостатньо — система позначить «Потрібно закупіти» і одразу спише доступну кількість.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setItemOpen(false)}>Скасувати</Button>
          <Button onClick={() => void addItem()} disabled={!selectedItemId}>Додати</Button>
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
          <Button variant="text" onClick={() => setWorkerOpen(false)}>Скасувати</Button>
          <Button onClick={() => void addWorker()} disabled={!selectedWorkerId}>Призначити</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
