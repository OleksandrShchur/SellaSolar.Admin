import { Box, Stack, Typography, type BoxProps, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'
import { brandColors } from '../theme'

/** Equal inset on all sides for panels, filters, and tabbed sections. */
export const panelPad = { xs: 2, sm: 2.5 } as const

/** Shared cream surface used by panels, filters, and tables. */
export const surfaceSx: SxProps<Theme> = {
  borderRadius: 2.5,
  border: '1.5px solid',
  borderColor: brandColors.borderStrong,
  bgcolor: brandColors.cream,
  boxShadow: `0 2px 8px -2px ${brandColors.softShadow}`,
}

/** Shared DataGrid styles — horizontal cell inset matches panelPad / row breathing room. */
export const dataGridSx: SxProps<Theme> = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: 'action.hover',
    borderBottom: '1px solid',
    borderColor: 'divider',
  },
  '& .MuiDataGrid-columnHeader': {
    px: panelPad,
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  '& .MuiDataGrid-cell': {
    display: 'flex',
    alignItems: 'center',
    borderColor: 'divider',
    py: 0.5,
    px: panelPad,
  },
  '& .MuiDataGrid-row:hover': {
    bgcolor: 'action.hover',
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: '1px solid',
    borderColor: 'divider',
    px: panelPad,
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
    outline: 'none',
  },
}

type DetailPanelProps = {
  children: ReactNode
} & BoxProps

/** Warm info surface — cream on beige, not stark white. */
export function DetailPanel({ children, sx, ...rest }: DetailPanelProps) {
  return (
    <Box
      {...rest}
      sx={[
        surfaceSx,
        { p: panelPad },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  )
}

type DetailFieldProps = {
  label: string
  value?: ReactNode
  children?: ReactNode
  /** Stretch across the full grid width */
  fullWidth?: boolean
}

/** Stacked label + value for scannable detail content. */
export function DetailField({ label, value, children, fullWidth }: DetailFieldProps) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <Typography
        component="div"
        sx={{
          display: 'block',
          mb: 0.75,
          fontWeight: 600,
          color: brandColors.textMuted,
          fontSize: '0.8125rem',
          lineHeight: 1.35,
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          color: brandColors.slateInk,
          fontWeight: 600,
          fontSize: '0.9875rem',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {children ?? value ?? '—'}
      </Typography>
    </Box>
  )
}

type DetailFieldGridProps = {
  children: ReactNode
  columns?: { xs?: number; sm?: number; md?: number }
}

/** Responsive grid of detail fields. */
export function DetailFieldGrid({
  children,
  columns = { xs: 1, sm: 2 },
}: DetailFieldGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2.5, sm: 3 },
        rowGap: { xs: 2.25, sm: 2.75 },
        gridTemplateColumns: {
          xs: `repeat(${columns.xs ?? 1}, minmax(0, 1fr))`,
          sm: `repeat(${columns.sm ?? 2}, minmax(0, 1fr))`,
          ...(columns.md
            ? { md: `repeat(${columns.md}, minmax(0, 1fr))` }
            : {}),
        },
      }}
    >
      {children}
    </Box>
  )
}

type DetailSectionProps = {
  title?: string
  children: ReactNode
  spacing?: number
}

export function DetailSection({ title, children, spacing = 1.75 }: DetailSectionProps) {
  return (
    <Stack
      spacing={spacing}
      sx={{
        pt: 0.5,
        borderTop: `1px solid ${brandColors.border}`,
      }}
    >
      {title ? (
        <Typography
          variant="subtitle1"
          fontWeight={800}
          color="text.primary"
          sx={{ letterSpacing: '-0.01em', pt: 0.5 }}
        >
          {title}
        </Typography>
      ) : null}
      {children}
    </Stack>
  )
}
