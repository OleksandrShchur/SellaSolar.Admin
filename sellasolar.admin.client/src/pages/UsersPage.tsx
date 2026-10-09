import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import { usersApi } from '../api'
import type { AppRole, UserListItem, WorkerType } from '../api/types'
import {
  appRoleLabel,
  applyCardInputChange,
  applyPhoneInputChange,
  cardInputHelperText,
  digitsOnly,
  formatCardNumberInput,
  formatPhone,
  formatPhoneInput,
  hasInvalidNumericChars,
  isCardNumberValid,
  isPhoneInputValid,
  normalizeCardDigits,
  phoneInputHelperText,
} from '../utils/labels'
import AddFab from '../components/AddFab'
import ConfirmDialog from '../components/ConfirmDialog'
import { CardListSkeleton } from '../components/PageSkeletons'
import RowActionsMenu, { type RowActionItem } from '../components/RowActionsMenu'
import { RoleChip, UserStatusChip, workerTypeDisplay } from '../components/StatusChips'
import { surfaceSx, panelPad, dataGridSx } from '../components/DetailPanel'

type RoleFilter = '' | 'Admin' | 'Worker'
type StatusFilter = 'active' | 'blocked' | 'inactive'
type PendingUserAction =
  | { kind: 'deactivate'; user: UserListItem }
  | { kind: 'unblock'; user: UserListItem }

const roles: AppRole[] = ['Admin', 'Worker']

const toggleButtonSx = {
  flexShrink: 0,
  '& .MuiToggleButton-root': {
    px: 1.75,
    textTransform: 'none',
    fontWeight: 600,
  },
} as const

const emptyCreate = {
  fullName: '',
  password: '',
  role: 'Worker' as AppRole,
  phone: '',
  workerType: 'Installer' as WorkerType,
  cardNumber: '',
}

export default function UsersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()

  const [rows, setRows] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Worker')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserListItem | null>(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'Worker' as AppRole,
    phone: '',
    workerType: 'Installer' as WorkerType,
    cardNumber: '',
  })
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null)
  const [confirmingAction, setConfirmingAction] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(
        await usersApi.list({
          role: roleFilter || undefined,
          isBlocked: statusFilter === 'blocked' ? true : statusFilter === 'active' ? false : undefined,
          isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
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
    const trimmed = searchInput.trim()
    const timer = window.setTimeout(() => {
      setSearch(trimmed.length >= 2 ? trimmed : '')
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    void load()
  }, [roleFilter, statusFilter, search])

  const openEdit = (row: UserListItem) => {
    setEditUser(row)
    setEditForm({
      fullName: row.fullName,
      role: row.role,
      phone: formatPhoneInput(row.phone),
      workerType: (row.workerType as WorkerType) || 'Installer',
      cardNumber: formatCardNumberInput(row.cardNumber),
    })
    setEditOpen(true)
  }

  const cardNumberForApi = (role: AppRole, cardNumber: string) => {
    if (role !== 'Worker') return null
    const digits = normalizeCardDigits(cardNumber)
    return digits.length > 0 ? digits : null
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

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setConfirmingAction(true)
    setError(null)
    try {
      if (pendingAction.kind === 'deactivate') {
        await usersApi.deactivate(pendingAction.user.id)
      } else {
        await usersApi.unblock(pendingAction.user.id)
      }
      setPendingAction(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка')
    } finally {
      setConfirmingAction(false)
    }
  }

  const rowActions = (row: UserListItem): RowActionItem[] => {
    const actions: RowActionItem[] = [
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
    ]

    const statusActions: RowActionItem[] = []

    if (row.isBlocked) {
      statusActions.push({
        key: 'unblock',
        label: 'Розблокувати',
        icon: <LockOpenOutlinedIcon fontSize="small" />,
        onClick: () => setPendingAction({ kind: 'unblock', user: row }),
        tone: 'warning',
      })
    }

    if (row.isActive) {
      if (row.role === 'Worker') {
        statusActions.push({
          key: 'deactivate',
          label: 'Деактивувати',
          icon: <PersonOffOutlinedIcon fontSize="small" />,
          onClick: () => setPendingAction({ kind: 'deactivate', user: row }),
          tone: 'danger',
        })
      }
    } else if (row.role === 'Worker' || row.role === 'Admin') {
      statusActions.push({
        key: 'activate',
        label: 'Активувати',
        icon: <PersonOutlineOutlinedIcon fontSize="small" />,
        onClick: () => void activate(row.id),
      })
    }

    if (statusActions.length > 0) {
      actions.push({ kind: 'divider', key: 'div-1' }, ...statusActions)
    }

    return actions
  }

  const columns: GridColDef<UserListItem>[] = [
    {
      field: 'fullName',
      headerName: 'ПІБ',
      flex: 1.4,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {params.row.fullName}
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
          <RoleChip role={params.value as AppRole} />
        </Box>
      ),
    },
    {
      field: 'workerType',
      headerName: 'Тип',
      width: 130,
      valueGetter: (_value, row) => workerTypeDisplay(row),
    },
    {
      field: 'phone',
      headerName: 'Телефон (логін)',
      width: 160,
      valueFormatter: (v) => formatPhone(v as string | null | undefined),
    },
    {
      field: 'isActive',
      headerName: 'Статус',
      width: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <UserStatusChip user={params.row} />
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
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        phone: digitsOnly(createForm.phone),
        workerType: createForm.role === 'Worker' ? createForm.workerType : null,
        cardNumber: cardNumberForApi(createForm.role, createForm.cardNumber),
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
        phone: digitsOnly(editForm.phone),
        workerType: editForm.role === 'Worker' ? editForm.workerType : null,
        cardNumber: cardNumberForApi(editForm.role, editForm.cardNumber),
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

  const phoneAndWorkerFields = (
    role: AppRole,
    phone: string,
    workerType: WorkerType,
    cardNumber: string,
    onPhone: (v: string) => void,
    onType: (v: WorkerType) => void,
    onCardNumber: (v: string) => void,
  ) => (
    <>
      <TextField
        label="Телефон (логін)"
        required
        value={phone}
        onChange={(e) => onPhone(applyPhoneInputChange(e.target.value))}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="098 244 11 70"
        helperText={phoneInputHelperText(phone)}
        error={hasInvalidNumericChars(phone)}
        fullWidth
        inputProps={{ pattern: '[0-9 ]*' }}
      />
      {role === 'Worker' ? (
        <>
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
          <TextField
            label="Номер картки"
            value={cardNumber}
            onChange={(e) => onCardNumber(applyCardInputChange(e.target.value))}
            type="tel"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="5375 4141 4141 4141"
            helperText={cardInputHelperText(cardNumber)}
            error={!isCardNumberValid(cardNumber)}
            fullWidth
            inputProps={{
              pattern: '[0-9 ]*',
              style: {
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '0.1em',
                fontWeight: 600,
              },
            }}
          />
        </>
      ) : null}
    </>
  )

  const searchField = (sx: object) => (
    <TextField
      placeholder="ПІБ або телефон"
      size="small"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      sx={sx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" color="action" />
          </InputAdornment>
        ),
        endAdornment: searchInput ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              aria-label="Очистити пошук"
              onClick={() => {
                setSearchInput('')
                setSearch('')
              }}
              edge="end"
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  )

  return (
    <>
      <AddFab label="Новий співробітник" onClick={() => setCreateOpen(true)} />
      <Stack spacing={2.5}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          p: panelPad,
          ...surfaceSx,
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          alignItems={{ lg: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          {isMobile ? (
            <Box sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {searchField({ flex: 1, minWidth: 0 })}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setFiltersExpanded((v) => !v)}
                  aria-expanded={filtersExpanded}
                  aria-label={filtersExpanded ? 'Сховати фільтри' : 'Показати фільтри'}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  }
                  sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  Фільтри
                </Button>
              </Stack>
              <Collapse in={filtersExpanded}>
                <Stack spacing={1.5} sx={{ pt: 1.5 }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={roleFilter}
                    onChange={(_, v) => {
                      if (v !== null) setRoleFilter(v as RoleFilter)
                    }}
                    sx={{ ...toggleButtonSx, width: '100%' }}
                  >
                    <ToggleButton value="" sx={{ flex: 1 }}>
                      Усі
                    </ToggleButton>
                    <ToggleButton value="Admin" sx={{ flex: 1 }}>
                      Адміни
                    </ToggleButton>
                    <ToggleButton value="Worker" sx={{ flex: 1 }}>
                      Працівники
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={statusFilter}
                    onChange={(_, v) => {
                      if (v !== null) setStatusFilter(v as StatusFilter)
                    }}
                    sx={{ ...toggleButtonSx, width: '100%' }}
                  >
                    <ToggleButton value="active" sx={{ flex: 1 }}>
                      Активні
                    </ToggleButton>
                    <ToggleButton value="blocked" sx={{ flex: 1 }}>
                      Заблоковані
                    </ToggleButton>
                    <ToggleButton value="inactive" sx={{ flex: 1 }}>
                      Деактивовані
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Collapse>
            </Box>
          ) : (
            <>
              {searchField({ width: 300, flexShrink: 0 })}

              <ToggleButtonGroup
                exclusive
                size="small"
                value={roleFilter}
                onChange={(_, v) => {
                  if (v !== null) setRoleFilter(v as RoleFilter)
                }}
                sx={toggleButtonSx}
              >
                <ToggleButton value="">Усі</ToggleButton>
                <ToggleButton value="Admin">Адміни</ToggleButton>
                <ToggleButton value="Worker">Працівники</ToggleButton>
              </ToggleButtonGroup>

              <ToggleButtonGroup
                exclusive
                size="small"
                value={statusFilter}
                onChange={(_, v) => {
                  if (v !== null) setStatusFilter(v as StatusFilter)
                }}
                sx={toggleButtonSx}
              >
                <ToggleButton value="active">Активні</ToggleButton>
                <ToggleButton value="blocked">Заблоковані</ToggleButton>
                <ToggleButton value="inactive">Деактивовані</ToggleButton>
              </ToggleButtonGroup>
            </>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              display: { xs: 'none', lg: 'inline-flex' },
              flexShrink: 0,
              ml: { lg: 'auto' },
            }}
          >
            Новий співробітник
          </Button>
        </Stack>
      </Box>

      {isMobile ? (
        loading ? (
          <CardListSkeleton lines={0} />
        ) : (
          <Stack spacing={1.5}>
            {rows.length === 0 && (
              <Typography color="text.secondary">Співробітників не знайдено</Typography>
            )}
            {rows.map((row) => (
              <Card key={row.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 }, position: 'relative' }}>
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <RowActionsMenu items={rowActions(row)} />
                </Box>
                <CardActionArea onClick={() => navigate(`/users/${row.id}`)}>
                  <CardContent sx={{ '&:last-child': { pb: 2 }, pr: 6 }}>
                    <Typography fontWeight={700} noWrap>
                      {row.fullName}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                      <RoleChip role={row.role} />
                      {workerTypeDisplay(row) !== '—' && row.role !== 'Admin' && (
                        <Chip size="small" variant="outlined" label={workerTypeDisplay(row)} />
                      )}
                      <UserStatusChip user={row} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        <Box
          sx={{
            width: '100%',
            ...surfaceSx,
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
            disableColumnMenu
            autoHeight
            rowHeight={52}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            onRowClick={(params) => navigate(`/users/${params.id}`)}
            sx={{
              ...dataGridSx,
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
              },
            }}
            localeText={{
              noRowsLabel: 'Співробітників не знайдено',
              MuiTablePagination: {
                labelRowsPerPage: 'Рядків на сторінці:',
              },
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
              required
              fullWidth
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
            {phoneAndWorkerFields(
              createForm.role,
              createForm.phone,
              createForm.workerType,
              createForm.cardNumber,
              (phone) => setCreateForm((f) => ({ ...f, phone })),
              (workerType) => setCreateForm((f) => ({ ...f, workerType })),
              (cardNumber) => setCreateForm((f) => ({ ...f, cardNumber })),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setCreateOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void createUser()}
            disabled={
              saving ||
              !isPhoneInputValid(createForm.phone) ||
              !isCardNumberValid(createForm.cardNumber)
            }
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>

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
            {phoneAndWorkerFields(
              editForm.role,
              editForm.phone,
              editForm.workerType,
              editForm.cardNumber,
              (phone) => setEditForm((f) => ({ ...f, phone })),
              (workerType) => setEditForm((f) => ({ ...f, workerType })),
              (cardNumber) => setEditForm((f) => ({ ...f, cardNumber })),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setEditOpen(false)}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => void saveEdit()}
            disabled={
              saving ||
              !isPhoneInputValid(editForm.phone) ||
              !isCardNumberValid(editForm.cardNumber)
            }
          >
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

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.kind === 'deactivate'
            ? 'Деактивувати співробітника?'
            : 'Розблокувати співробітника?'
        }
        message={
          pendingAction
            ? pendingAction.kind === 'deactivate'
              ? `Деактивувати «${pendingAction.user.fullName}»?`
              : `Розблокувати «${pendingAction.user.fullName}»?`
            : null
        }
        confirmLabel={pendingAction?.kind === 'deactivate' ? 'Деактивувати' : 'Розблокувати'}
        confirmingLabel={
          pendingAction?.kind === 'deactivate' ? 'Деактивація…' : 'Розблокування…'
        }
        confirmColor={pendingAction?.kind === 'deactivate' ? 'error' : 'warning'}
        confirming={confirmingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
      />
      </Stack>
    </>
  )
}
