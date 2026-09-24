import { Chip, type ChipProps } from '@mui/material'
import type { AppRole, ProjectStatus, UserListItem } from '../api/types'
import { appRoleLabel, statusLabel, workerTypeLabel } from '../utils/labels'

/**
 * Status color language (consistent app-wide):
 * - Positive / done / active → solid green
 * - Neutral ongoing / inactive → gray
 * - Waiting / attention → amber
 * - Blocked / danger → red
 */

const chipBaseSx = {
  fontWeight: 700,
  letterSpacing: '0.01em',
} as const

type StatusChipProps = {
  size?: ChipProps['size']
}

export function ProjectStatusChip({
  status,
  size = 'small',
}: StatusChipProps & { status: ProjectStatus | string }) {
  const config: Record<
    ProjectStatus,
    { color: ChipProps['color']; variant: ChipProps['variant'] }
  > = {
    // Waiting to start — amber so it is not confused with gray "in progress"
    Awaiting: { color: 'warning', variant: 'filled' },
    // Ongoing work — neutral gray
    InProgress: { color: 'default', variant: 'filled' },
    // Done — solid green
    Completed: { color: 'success', variant: 'filled' },
  }

  const key = status as ProjectStatus
  const { color, variant } = config[key] ?? { color: 'default' as const, variant: 'filled' as const }

  return (
    <Chip
      size={size}
      color={color}
      variant={variant}
      label={statusLabel(status)}
      sx={chipBaseSx}
    />
  )
}

export function UserStatusChip({
  user,
  size = 'small',
}: StatusChipProps & { user: Pick<UserListItem, 'isActive' | 'isBlocked'> }) {
  if (user.isBlocked) {
    return <Chip size={size} color="error" variant="filled" label="Заблоковано" sx={chipBaseSx} />
  }
  if (user.isActive) {
    return <Chip size={size} color="success" variant="filled" label="Активний" sx={chipBaseSx} />
  }
  // Deactivated — gray outline so it reads as inactive, not "in progress"
  return (
    <Chip size={size} color="default" variant="outlined" label="Деактивовано" sx={chipBaseSx} />
  )
}

/** Role badges — outlined so they never look like status. */
export function RoleChip({ role, size = 'small' }: StatusChipProps & { role: AppRole | string }) {
  const color: ChipProps['color'] = role === 'Admin' ? 'secondary' : 'primary'
  return (
    <Chip
      size={size}
      color={color}
      variant="outlined"
      label={appRoleLabel(role)}
      sx={chipBaseSx}
    />
  )
}

export function workerTypeDisplay(row: Pick<UserListItem, 'role' | 'workerType'>) {
  if (row.role === 'Admin') return appRoleLabel('Admin')
  return row.workerType ? workerTypeLabel(row.workerType) : '—'
}
