import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReplayIcon from '@mui/icons-material/Replay'
import { projectsApi } from '../api'
import { formatFileSize } from '../utils/labels'

const MAX_PHOTOS = 10
const MAX_BYTES_PER_FILE = 20_000_000

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error'

type UploadItem = {
  id: string
  file: File
  previewUrl: string
  status: ItemStatus
  progress: number
  error?: string
}

type Props = {
  open: boolean
  projectId: number
  files: File[]
  onClose: () => void
  onComplete: () => void | Promise<void>
}

function createItems(files: File[]): { items: UploadItem[]; truncated: boolean; oversizedNames: string[] } {
  const oversizedNames: string[] = []
  const accepted = files.filter((file) => {
    if (file.size > MAX_BYTES_PER_FILE) {
      oversizedNames.push(file.name)
      return false
    }
    return true
  })
  const truncated = accepted.length > MAX_PHOTOS
  const limited = accepted.slice(0, MAX_PHOTOS)
  return {
    truncated,
    oversizedNames,
    items: limited.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    })),
  }
}

export default function PhotoUploadDialog({ open, projectId, files, onClose, onComplete }: Props) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [caption, setCaption] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [oversizedNames, setOversizedNames] = useState<string[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    const created = createItems(files)
    setItems(created.items)
    setTruncated(created.truncated)
    setOversizedNames(created.oversizedNames)
    setCaption('')
    setBatchError(null)
    setUploading(false)

    return () => {
      created.items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [open, files])

  const isBusy = uploading || items.some((item) => item.status === 'uploading')
  const pendingCount = items.filter((item) => item.status === 'pending' || item.status === 'error').length
  const doneCount = items.filter((item) => item.status === 'done').length
  const totalCount = items.length

  const overallProgress = useMemo(() => {
    if (totalCount === 0) return 0
    const sum = items.reduce((acc, item) => {
      if (item.status === 'done') return acc + 100
      if (item.status === 'uploading') return acc + item.progress
      return acc
    }, 0)
    return Math.round(sum / totalCount)
  }, [items, totalCount])

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    if (isBusy) return
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const uploadOne = async (item: UploadItem, sharedCaption: string) => {
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined })
    try {
      await projectsApi.uploadPhoto(projectId, item.file, sharedCaption || undefined, (progress) => {
        updateItem(item.id, { progress: progress.percent })
      })
      updateItem(item.id, { status: 'done', progress: 100, error: undefined })
      return true
    } catch (err) {
      updateItem(item.id, {
        status: 'error',
        progress: 0,
        error: err instanceof Error ? err.message : 'Не вдалося завантажити фото',
      })
      return false
    }
  }

  const handleUploadAll = async () => {
    if (items.length === 0 || isBusy) return
    setUploading(true)
    setBatchError(null)
    const sharedCaption = caption.trim()
    const queue = items.filter((item) => item.status === 'pending' || item.status === 'error')
    let failed = 0

    for (const item of queue) {
      const ok = await uploadOne(item, sharedCaption)
      if (!ok) failed += 1
    }

    setUploading(false)
    if (failed > 0) {
      setBatchError(`Не вдалося завантажити ${failed} з ${queue.length} фото. Можна повторити.`)
      return
    }
    await onComplete()
  }

  const handleRetry = async (id: string) => {
    const item = items.find((x) => x.id === id)
    if (!item || item.status !== 'error' || isBusy) return
    setUploading(true)
    setBatchError(null)
    const ok = await uploadOne(item, caption.trim())
    setUploading(false)
    if (!ok) {
      setBatchError('Не вдалося завантажити фото. Можна повторити.')
      return
    }
    // Other items were not changed by this retry; stale snapshot is fine here.
    const othersLeft = items.some(
      (x) => x.id !== id && (x.status === 'pending' || x.status === 'error'),
    )
    if (!othersLeft) await onComplete()
  }

  const handleClose = () => {
    if (isBusy) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Завантаження фото</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {truncated && (
            <Alert severity="info">Можна завантажити максимум {MAX_PHOTOS} фото за раз. Взято перші {MAX_PHOTOS}.</Alert>
          )}
          {oversizedNames.length > 0 && (
            <Alert severity="warning">
              Пропущено файли більші за 20 MB: {oversizedNames.join(', ')}
            </Alert>
          )}
          {batchError && <Alert severity="error">{batchError}</Alert>}

          <TextField
            label="Підпис до фото"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            fullWidth
            disabled={isBusy || doneCount > 0}
            helperText="Підпис застосується до всіх вибраних фото"
          />

          {(isBusy || doneCount > 0) && (
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Загальний прогрес
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {doneCount} з {totalCount} · {overallProgress}%
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={overallProgress} />
            </Box>
          )}

          {items.length === 0 ? (
            <Typography color="text.secondary">Немає файлів для завантаження</Typography>
          ) : (
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr auto',
                    gap: 1.5,
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: item.status === 'error' ? 'error.light' : 'divider',
                    bgcolor: 'rgba(243, 235, 220, 0.35)',
                  }}
                >
                  <Box
                    component="img"
                    src={item.previewUrl}
                    alt={item.file.name}
                    sx={{
                      width: 72,
                      height: 72,
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      display: 'block',
                    }}
                  />
                  <Box minWidth={0}>
                    <Typography variant="body2" noWrap title={item.file.name}>
                      {item.file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(item.file.size)}
                      {item.status === 'done' ? ' · Завантажено' : null}
                      {item.status === 'uploading' ? ` · ${item.progress}%` : null}
                      {item.status === 'pending' ? ' · Очікує' : null}
                    </Typography>
                    {(item.status === 'uploading' || item.status === 'done') && (
                      <LinearProgress
                        variant="determinate"
                        value={item.progress}
                        sx={{ mt: 0.75 }}
                        color={item.status === 'done' ? 'success' : 'primary'}
                      />
                    )}
                    {item.status === 'error' && (
                      <Typography variant="caption" color="error" display="block" mt={0.5}>
                        {item.error}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {item.status === 'error' && (
                      <IconButton
                        aria-label="Повторити"
                        onClick={() => void handleRetry(item.id)}
                        disabled={isBusy}
                        size="small"
                      >
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    )}
                    {item.status !== 'done' && item.status !== 'uploading' && (
                      <IconButton
                        aria-label="Прибрати з списку"
                        onClick={() => removeItem(item.id)}
                        disabled={isBusy}
                        size="small"
                        color="error"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={handleClose} disabled={isBusy}>
          Скасувати
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void handleUploadAll()}
          disabled={isBusy || pendingCount === 0}
        >
          {isBusy
            ? 'Завантаження…'
            : pendingCount > 0 && doneCount > 0
              ? `Повторити (${pendingCount})`
              : `Завантажити${totalCount > 0 ? ` (${totalCount})` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
