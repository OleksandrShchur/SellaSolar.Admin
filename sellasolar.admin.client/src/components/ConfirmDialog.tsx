import type { ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

type ConfirmColor = 'error' | 'warning' | 'primary'

type Props = {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  confirmingLabel?: string
  cancelLabel?: string
  confirmColor?: ConfirmColor
  confirming?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Видалити',
  confirmingLabel = 'Видалення…',
  cancelLabel = 'Скасувати',
  confirmColor = 'error',
  confirming = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!confirming) onCancel()
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      {message != null && message !== '' && (
        <DialogContent>
          {typeof message === 'string' ? (
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          ) : (
            message
          )}
        </DialogContent>
      )}
      <DialogActions>
        <Button variant="text" disabled={confirming} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          disabled={confirming}
          onClick={onConfirm}
        >
          {confirming ? confirmingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
