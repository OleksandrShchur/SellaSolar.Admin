import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { CustomData } from '../api/types'

export type CustomDataRow = CustomData

export const emptyCustomDataRow = (): CustomDataRow => ({ key: '', value: '' })

/** True when every row has non-empty trimmed key and value (or there are no rows). */
export const isCustomDataValid = (rows: CustomDataRow[]) =>
  rows.every((row) => row.key.trim().length > 0 && row.value.trim().length > 0)

export const normalizeCustomData = (rows: CustomDataRow[]): CustomDataRow[] =>
  rows.map((row) => ({ key: row.key.trim(), value: row.value.trim() }))

const INVALID_ROW_MESSAGE = 'Заповніть ключ і значення або видаліть рядок'

type CustomDataEditorProps = {
  rows: CustomDataRow[]
  onChange: (rows: CustomDataRow[]) => void
  /** When true, highlight incomplete rows. */
  showErrors?: boolean
  disabled?: boolean
}

export default function CustomDataEditor({
  rows,
  onChange,
  showErrors = false,
  disabled = false,
}: CustomDataEditorProps) {
  const updateRow = (index: number, patch: Partial<CustomDataRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index))
  }

  const addRow = () => {
    onChange([...rows, emptyCustomDataRow()])
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" fontWeight={700}>
        Додаткові дані
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Немає рядків. Додайте пару ключ–значення за потреби.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row, index) => {
            const keyEmpty = row.key.trim().length === 0
            const valueEmpty = row.value.trim().length === 0
            const rowInvalid = showErrors && (keyEmpty || valueEmpty)

            return (
              <Stack
                key={index}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'flex-start' }}
              >
                <TextField
                  label="Ключ"
                  required
                  fullWidth
                  value={row.key}
                  onChange={(e) => updateRow(index, { key: e.target.value })}
                  disabled={disabled}
                  error={showErrors && keyEmpty}
                  helperText={showErrors && keyEmpty ? INVALID_ROW_MESSAGE : undefined}
                />
                <TextField
                  label="Значення"
                  required
                  fullWidth
                  value={row.value}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                  disabled={disabled}
                  error={showErrors && valueEmpty}
                  helperText={
                    showErrors && valueEmpty && !keyEmpty ? INVALID_ROW_MESSAGE : undefined
                  }
                />
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    pt: { sm: rowInvalid ? 0.5 : 0.75 },
                    alignSelf: { xs: 'flex-end', sm: 'flex-start' },
                  }}
                >
                  <IconButton
                    aria-label="Видалити рядок"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    size="small"
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              </Stack>
            )
          })}
        </Stack>
      )}

      <Box>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<AddIcon />}
          onClick={addRow}
          disabled={disabled}
        >
          Додати рядок
        </Button>
      </Box>
    </Stack>
  )
}
