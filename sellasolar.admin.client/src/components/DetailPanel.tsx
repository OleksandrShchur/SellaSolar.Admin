import { Box, Stack, Typography, type BoxProps } from '@mui/material'
import type { ReactNode } from 'react'
import { brandColors } from '../theme'

type DetailPanelProps = {
  children: ReactNode
} & BoxProps

/** Warm info surface — cream on beige, not stark white. */
export function DetailPanel({ children, sx, ...rest }: DetailPanelProps) {
  return (
    <Box
      {...rest}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        border: '1.5px solid',
        borderColor: brandColors.borderStrong,
        bgcolor: brandColors.cream,
        boxShadow: `0 2px 8px -2px ${brandColors.softShadow}`,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

type DetailFieldProps = {
  label: string
  value?: ReactNode
  children?: ReactNode
}

/** Stacked label + bold value for scannable detail content. */
export function DetailField({ label, value, children }: DetailFieldProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        component="div"
        sx={{
          display: 'block',
          mb: 0.6,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          fontSize: '0.68rem',
          lineHeight: 1.3,
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{
          color: 'text.primary',
          fontWeight: 700,
          fontSize: '1rem',
          lineHeight: 1.45,
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
        gap: { xs: 2.25, sm: 2.5 },
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

export function DetailSection({ title, children, spacing = 2 }: DetailSectionProps) {
  return (
    <Stack spacing={spacing}>
      {title ? (
        <Typography
          variant="subtitle1"
          fontWeight={800}
          color="text.primary"
          sx={{ letterSpacing: '-0.01em' }}
        >
          {title}
        </Typography>
      ) : null}
      {children}
    </Stack>
  )
}
