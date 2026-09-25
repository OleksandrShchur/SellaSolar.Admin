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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { projectsApi, warehouseApi, usersApi } from '../api'
import type {
  ProjectDetail,
  ProjectExpense,
  ProjectItem,
  ProjectStatus,
  WarehouseItemList,
  WarehouseStockLot,
  UserListItem,
} from '../api/types'
import { formatDate, formatDateTime, formatMoney, formatNumber, inventoryLabels, workerTypeLabel } from '../utils/labels'
import { useAuth } from '../auth/AuthContext'
import { DetailField, DetailFieldGrid, DetailPanel, DetailSection, panelPad } from '../components/DetailPanel'
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
  const [itemMode, setItemMode] = useState<'catalog' | 'custom'>('catalog')
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItemList[]>([])
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('')
  const [quantityNeeded, setQuantityNeeded] = useState('1')
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [customUnit, setCustomUnit] = useState('шт')

  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editQuantityNeeded, setEditQuantityNeeded] = useState('1')
  const [editItemSaving, setEditItemSaving] = useState(false)

  const [allocOpen, setAllocOpen] = useState(false)
  const [allocItem, setAllocItem] = useState<ProjectItem | null>(null)
  const [allocLots, setAllocLots] = useState<WarehouseStockLot[]>([])
  const [allocQtyByLot, setAllocQtyByLot] = useState<Record<number, string>>({})
  const [allocSaving, setAllocSaving] = useState(false)

  const [workerOpen, setWorkerOpen] = useState(false)
  const [workers, setWorkers] = useState<UserListItem[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('')
  const [roleOnProject, setRoleOnProject] = useState('')

  const [photoCaption, setPhotoCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ProjectExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    expenseDate: '',
    notes: '',
  })
  const [expenseSaving, setExpenseSaving] = useState(false)

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
    const assigned = new Set(
      project.items.filter((i) => i.warehouseItemId != null).map((i) => i.warehouseItemId as number),
    )
    return warehouseItems.filter((w) => !assigned.has(w.id))
  }, [warehouseItems, project])

  const materialsCostTotal = useMemo(() => {
    if (!project) return 0
    return project.items.reduce((sum, item) => sum + (item.costFromStock ?? 0), 0)
  }, [project])

  const manualExpensesTotal = useMemo(() => {
    if (!project) return 0
    return (project.expenses ?? []).reduce((sum, e) => sum + e.amount, 0)
  }, [project])

  const expensesGrandTotal = materialsCostTotal + manualExpensesTotal

  const stockExpenseItems = useMemo(() => {
    if (!project) return []
    return project.items.filter((item) => !item.isNonCatalog && item.quantityFromStock > 0)
  }, [project])

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
      setItemMode('catalog')
      setSelectedItemId('')
      setQuantityNeeded('1')
      setCustomName('')
      setCustomCategory('')
      setCustomUnit('шт')
      setItemOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити склад')
    }
  }

  const addItem = async () => {
    try {
      if (itemMode === 'catalog') {
        if (!selectedItemId) return
        await projectsApi.addItem(projectId, {
          warehouseItemId: Number(selectedItemId),
          quantityNeeded: Number(quantityNeeded),
        })
      } else {
        if (!customName.trim() || !customCategory.trim() || !customUnit.trim()) return
        await projectsApi.addItem(projectId, {
          quantityNeeded: Number(quantityNeeded),
          requestedName: customName.trim(),
          requestedCategory: customCategory.trim(),
          requestedUnit: customUnit.trim(),
        })
      }
      setItemOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати матеріал')
    }
  }

  const openEditItem = (itemId: number, currentNeeded: number) => {
    setEditingItemId(itemId)
    setEditQuantityNeeded(String(currentNeeded))
    setEditItemOpen(true)
  }

  const openAllocations = async (item: ProjectItem) => {
    if (!item.warehouseItemId) return
    setError(null)
    try {
      const lots = await warehouseApi.lots(item.warehouseItemId)
      setAllocItem(item)
      setAllocLots(lots)
      const initial: Record<number, string> = {}
      for (const lot of lots) {
        const existing = item.allocations?.find((a) => a.lotId === lot.lotId)
        initial[lot.lotId] = existing ? String(existing.quantity) : ''
      }
      setAllocQtyByLot(initial)
      setAllocOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити партії')
    }
  }

  const saveAllocations = async () => {
    if (!allocItem) return
    const allocations = Object.entries(allocQtyByLot)
      .map(([lotId, qty]) => ({
        warehouseStockLotId: Number(lotId),
        quantity: Number(qty),
      }))
      .filter((a) => Number.isFinite(a.quantity) && a.quantity > 0)

    setAllocSaving(true)
    setError(null)
    try {
      await projectsApi.setItemAllocations(projectId, allocItem.id, allocations)
      setAllocOpen(false)
      setAllocItem(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти розподіл')
    } finally {
      setAllocSaving(false)
    }
  }

  const formatCostBreakdown = (item: ProjectItem) => {
    const allocs = item.allocations ?? []
    if (allocs.length === 0) return null
    const parts = allocs.map(
      (a) => `${formatNumber(a.quantity)}×${formatNumber(a.unitCost)}`,
    )
    return parts.join(' + ')
  }

  const saveEditItem = async () => {
    if (editingItemId == null) return
    const qty = Number(editQuantityNeeded)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Кількість повинна бути більшою за нуль')
      return
    }
    setEditItemSaving(true)
    setError(null)
    try {
      await projectsApi.updateItem(projectId, editingItemId, qty)
      setEditItemOpen(false)
      setEditingItemId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося оновити кількість')
    } finally {
      setEditItemSaving(false)
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

  const openAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm({ category: '', amount: '', expenseDate: '', notes: '' })
    setExpenseOpen(true)
  }

  const openEditExpense = (expense: ProjectExpense) => {
    setEditingExpense(expense)
    setExpenseForm({
      category: expense.category,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate ? expense.expenseDate.slice(0, 10) : '',
      notes: expense.notes ?? '',
    })
    setExpenseOpen(true)
  }

  const saveExpense = async () => {
    const category = expenseForm.category.trim()
    const amount = Number(expenseForm.amount.replace(',', '.'))
    if (!category) {
      setError('Категорія обовʼязкова')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Сума повинна бути більшою за нуль')
      return
    }
    setExpenseSaving(true)
    setError(null)
    const body = {
      category,
      amount,
      expenseDate: expenseForm.expenseDate || null,
      notes: expenseForm.notes.trim() || null,
    }
    try {
      if (editingExpense) {
        await projectsApi.updateExpense(projectId, editingExpense.id, body)
      } else {
        await projectsApi.addExpense(projectId, body)
      }
      setExpenseOpen(false)
      setEditingExpense(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти витрату')
    } finally {
      setExpenseSaving(false)
    }
  }

  const removeExpense = async (expenseId: number) => {
    try {
      await projectsApi.removeExpense(projectId, expenseId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити витрату')
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
      <>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => void changeStatus('Awaiting')}
        >
          Повернути в очікування
        </Button>
        <Button variant="contained" color="success" onClick={() => void changeStatus('Completed')}>
          Завершити
        </Button>
      </>
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
        <Box sx={{ px: panelPad, pt: panelPad }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            textColor="inherit"
            sx={{
              minHeight: 40,
              bgcolor: 'transparent',
              '& .MuiTabs-flexContainer': {
                gap: 2.5,
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'text.secondary',
                minHeight: 40,
                minWidth: 0,
                px: 0,
                py: 1,
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
            <Tab label="Витрати" />
            <Tab label="Працівники" />
            <Tab label="Фото" />
          </Tabs>
        </Box>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />

        <Box sx={{ p: panelPad }}>
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
              {project.status !== 'Completed' && (
                <Button variant="contained" color="primary" onClick={() => void openAddItem()}>
                  Додати матеріал
                </Button>
              )}
            </Stack>
            <Stack spacing={1.5}>
              {project.items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: item.needsPurchase
                      ? 'warning.main'
                      : !item.isNonCatalog && item.quantityToPurchase > 0
                        ? 'info.main'
                        : 'divider',
                    bgcolor: item.needsPurchase
                      ? 'rgba(237, 108, 2, 0.06)'
                      : !item.isNonCatalog && item.quantityToPurchase > 0
                        ? 'rgba(2, 136, 209, 0.06)'
                        : 'rgba(243, 235, 220, 0.45)',
                    '&:hover': { boxShadow: 1, borderColor: 'primary.dark' },
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <Box flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography fontWeight={700}>
                          {item.name}{' '}
                          <Typography component="span" color="text.secondary">
                            ({item.category}, {item.unit})
                          </Typography>
                        </Typography>
                        {item.isNonCatalog && (
                          <Chip size="small" color="error" variant="outlined" label={inventoryLabels.notInWarehouse} />
                        )}
                      </Stack>
                      <Typography variant="body2" mt={0.5}>
                        {project.status === 'Completed' ? (
                          <>
                            {inventoryLabels.used}: {formatNumber(item.quantityNeeded)}
                            {item.costFromStock != null && (
                              <>
                                {' '}
                                · {inventoryLabels.costFromStock}: {formatNumber(item.costFromStock)}
                                {formatCostBreakdown(item) && (
                                  <Typography component="span" color="text.secondary">
                                    {' '}
                                    ({formatCostBreakdown(item)})
                                  </Typography>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            {inventoryLabels.needed}: {formatNumber(item.quantityNeeded)} ·{' '}
                            {inventoryLabels.fromStock}: {formatNumber(item.quantityFromStock)} ·{' '}
                            {inventoryLabels.availableStock}: {formatNumber(item.quantityAvailable)}
                            {item.quantityToPurchase > 0 && (
                              <>
                                {' '}
                                ·{' '}
                                <Box
                                  component="span"
                                  sx={{
                                    color: item.needsPurchase ? 'warning.dark' : 'info.dark',
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.needsPurchase
                                    ? inventoryLabels.toOrder
                                    : inventoryLabels.unallocated}
                                  : {formatNumber(item.quantityToPurchase)}
                                </Box>
                              </>
                            )}
                            {!item.isNonCatalog && item.costFromStock != null && (
                              <>
                                {' '}
                                · {inventoryLabels.costFromStock}: {formatNumber(item.costFromStock)}
                                {formatCostBreakdown(item) && (
                                  <Typography component="span" color="text.secondary">
                                    {' '}
                                    ({formatCostBreakdown(item)})
                                  </Typography>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </Typography>
                    </Box>
                    {project.status !== 'Completed' && item.needsPurchase && (
                      <Chip color="warning" label={inventoryLabels.needsPurchase} />
                    )}
                    {project.status !== 'Completed' &&
                      !item.isNonCatalog &&
                      !item.needsPurchase &&
                      item.quantityToPurchase > 0 && (
                        <Chip color="info" label={inventoryLabels.needsAllocation} />
                      )}
                    {project.status !== 'Completed' && !item.isNonCatalog && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void openAllocations(item)}
                      >
                        {inventoryLabels.allocateLots}
                      </Button>
                    )}
                    {project.status !== 'Completed' && (
                      <IconButton
                        color="primary"
                        onClick={() => openEditItem(item.id, item.quantityNeeded)}
                        aria-label="Редагувати кількість"
                      >
                        <EditOutlinedIcon />
                      </IconButton>
                    )}
                    {project.status !== 'Completed' && (
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
                    )}
                  </Stack>
                </Box>
              ))}
              {project.items.length === 0 && (
                <Typography color="text.secondary">Матеріали ще не додано</Typography>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Stack spacing={2.5}>
              <DetailFieldGrid columns={{ xs: 1, sm: 3 }}>
                <DetailField label="Матеріали зі складу" value={formatMoney(materialsCostTotal)} />
                <DetailField label="Інші витрати" value={formatMoney(manualExpensesTotal)} />
                <DetailField label="Разом" value={formatMoney(expensesGrandTotal)} />
              </DetailFieldGrid>

              <DetailSection title="Матеріали зі складу">
                <Stack spacing={1.5}>
                  {stockExpenseItems.map((item) => (
                    <Box
                      key={`stock-${item.id}`}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1.5px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(243, 235, 220, 0.45)',
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                        <Box flex={1}>
                          <Typography fontWeight={700}>
                            {item.name}{' '}
                            <Typography component="span" color="text.secondary">
                              ({item.category}, {item.unit})
                            </Typography>
                          </Typography>
                          <Typography variant="body2" mt={0.5} color="text.secondary">
                            {inventoryLabels.fromStock}: {formatNumber(item.quantityFromStock)}
                            {formatCostBreakdown(item) && <> · {formatCostBreakdown(item)}</>}
                          </Typography>
                        </Box>
                        <Typography fontWeight={800}>{formatMoney(item.costFromStock)}</Typography>
                        <Chip size="small" variant="outlined" label="Склад" />
                      </Stack>
                    </Box>
                  ))}
                  {stockExpenseItems.length === 0 && (
                    <Typography color="text.secondary">
                      Немає вартості зі складу. Розподіліть партії на вкладці «Матеріали».
                    </Typography>
                  )}
                </Stack>
              </DetailSection>

              <DetailSection>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                    Інші витрати
                  </Typography>
                  {project.status !== 'Completed' && (
                    <Button variant="contained" color="primary" onClick={openAddExpense}>
                      Додати витрату
                    </Button>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  {(project.expenses ?? []).map((expense) => (
                    <Box
                      key={expense.id}
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
                          <Typography fontWeight={700}>{expense.category}</Typography>
                          <Typography variant="body2" mt={0.5} color="text.secondary">
                            {expense.expenseDate
                              ? formatDate(expense.expenseDate)
                              : 'Дата не вказана'}
                            {expense.notes ? ` · ${expense.notes}` : ''}
                          </Typography>
                        </Box>
                        <Typography fontWeight={800}>{formatMoney(expense.amount)}</Typography>
                        {project.status !== 'Completed' && (
                          <>
                            <IconButton
                              color="primary"
                              onClick={() => openEditExpense(expense)}
                              aria-label="Редагувати витрату"
                            >
                              <EditOutlinedIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => void removeExpense(expense.id)}
                              aria-label="Видалити витрату"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    </Box>
                  ))}
                  {(project.expenses ?? []).length === 0 && (
                    <Typography color="text.secondary">Інших витрат ще немає</Typography>
                  )}
                </Stack>
              </DetailSection>
            </Stack>
          </TabPanel>

          <TabPanel value={tab} index={3}>
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

          <TabPanel value={tab} index={4}>
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
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={itemMode}
              onChange={(_, v) => {
                if (v !== null) setItemMode(v as 'catalog' | 'custom')
              }}
            >
              <ToggleButton value="catalog" sx={{ textTransform: 'none', fontWeight: 600 }}>
                Зі складу
              </ToggleButton>
              <ToggleButton value="custom" sx={{ textTransform: 'none', fontWeight: 600 }}>
                Новий матеріал
              </ToggleButton>
            </ToggleButtonGroup>

            {itemMode === 'catalog' ? (
              <FormControl fullWidth>
                <InputLabel>Позиція складу</InputLabel>
                <Select
                  label="Позиція складу"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value as number)}
                >
                  {availableWarehouseItems.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name} ({inventoryLabels.available}:{' '}
                      {formatNumber(item.quantityAvailable)} {item.unit})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <>
                <TextField
                  label="Назва"
                  required
                  fullWidth
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <TextField
                  label="Категорія"
                  required
                  fullWidth
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
                <TextField
                  label="Одиниця"
                  required
                  fullWidth
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                />
              </>
            )}

            <TextField
              label="Потрібна кількість"
              type="number"
              fullWidth
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
            />
            <Typography variant="body2" color="text.secondary">
              {itemMode === 'catalog'
                ? 'Після додавання розподіліть партії вручну («Розподілити партії»). Без розподілу весь обсяг буде «Потрібно закупіти». Списання зі складу — лише після завершення проекту.'
                : 'Матеріал поза каталогом буде повністю позначено як «Потрібно закупіти» і з’явиться на складі у фільтрі «Потрібно замовити».'}
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
            disabled={
              itemMode === 'catalog'
                ? !selectedItemId
                : !customName.trim() || !customCategory.trim() || !customUnit.trim()
            }
          >
            Додати
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editItemOpen}
        onClose={() => !editItemSaving && setEditItemOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Змінити кількість</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Потрібна кількість"
              type="number"
              fullWidth
              value={editQuantityNeeded}
              onChange={(e) => setEditQuantityNeeded(e.target.value)}
              inputProps={{ min: 0.01, step: 'any' }}
            />
            <Typography variant="body2" color="text.secondary">
              {inventoryLabels.editQtyBlockedHint} Нестача позначається як «Потрібно закупіти».
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setEditItemOpen(false)} disabled={editItemSaving}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void saveEditItem()}
            disabled={editItemSaving || !editQuantityNeeded || Number(editQuantityNeeded) <= 0}
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={allocOpen}
        onClose={() => !allocSaving && setAllocOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {inventoryLabels.allocateLots}
          {allocItem ? ` — ${allocItem.name}` : ''}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
              {inventoryLabels.allocationHint}
            </Typography>
            {allocItem && (
              <Typography variant="body2" fontWeight={600}>
                {inventoryLabels.needed}: {formatNumber(allocItem.quantityNeeded)} {allocItem.unit}
              </Typography>
            )}
            {allocLots.length === 0 && (
              <Alert severity="info">
                {inventoryLabels.noLots}{' '}
                {allocItem?.warehouseItemId && (
                  <RouterLink to={`/warehouse/${allocItem.warehouseItemId}`}>
                    Відкрити склад
                  </RouterLink>
                )}
              </Alert>
            )}
            {allocLots.map((lot) => {
              const current = Number(allocQtyByLot[lot.lotId] || 0) || 0
              const maxForLot = lot.quantityFree + (allocItem?.allocations?.find((a) => a.lotId === lot.lotId)?.quantity ?? 0)
              return (
                <Box
                  key={lot.lotId}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                  >
                    <Box flex={1}>
                      <Typography fontWeight={600}>
                        {formatDateTime(lot.receivedAt)} · {inventoryLabels.unitCost}:{' '}
                        {formatNumber(lot.unitCost)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {inventoryLabels.onHand}: {formatNumber(lot.quantityOnHand)} ·{' '}
                        {inventoryLabels.freeOnLot}: {formatNumber(maxForLot)}
                        {lot.supplier ? ` · ${lot.supplier}` : ''}
                      </Typography>
                    </Box>
                    <TextField
                      label="Кількість"
                      type="number"
                      size="small"
                      sx={{ width: { xs: '100%', sm: 140 } }}
                      value={allocQtyByLot[lot.lotId] ?? ''}
                      onChange={(e) =>
                        setAllocQtyByLot({ ...allocQtyByLot, [lot.lotId]: e.target.value })
                      }
                      inputProps={{ min: 0, max: maxForLot, step: 'any' }}
                      helperText={
                        current > maxForLot
                          ? `Макс. ${formatNumber(maxForLot)}`
                          : undefined
                      }
                      error={current > maxForLot}
                    />
                  </Stack>
                </Box>
              )
            })}
            {allocItem && (
              <Typography variant="body2">
                Розподілено:{' '}
                {formatNumber(
                  Object.values(allocQtyByLot).reduce((sum, v) => sum + (Number(v) || 0), 0),
                )}{' '}
                / {formatNumber(allocItem.quantityNeeded)}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setAllocOpen(false)} disabled={allocSaving}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void saveAllocations()}
            disabled={allocSaving}
          >
            Зберегти розподіл
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

      <Dialog
        open={expenseOpen}
        onClose={() => {
          if (!expenseSaving) setExpenseOpen(false)
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingExpense ? 'Редагувати витрату' : 'Додати витрату'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Категорія"
              placeholder="Роботи, непередбачені витрати…"
              fullWidth
              required
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            />
            <TextField
              label="Сума (₴)"
              fullWidth
              required
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            />
            <TextField
              type="date"
              label="Дата"
              InputLabelProps={{ shrink: true }}
              fullWidth
              value={expenseForm.expenseDate}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
            />
            <TextField
              label="Нотатки"
              multiline
              minRows={2}
              fullWidth
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" disabled={expenseSaving} onClick={() => setExpenseOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={expenseSaving}
            onClick={() => void saveExpense()}
          >
            {expenseSaving ? 'Збереження…' : 'Зберегти'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
