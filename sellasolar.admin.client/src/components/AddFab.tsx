import { Fab, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { bottomNavClearance } from '../layout/bottomNav'

type AddFabProps = {
  label: string
  onClick: () => void
}

/**
 * Mobile / tablet primary "add" action. Hidden from `lg` up —
 * those breakpoints keep the inline header button instead.
 */
export default function AddFab({ label, onClick }: AddFabProps) {
  const theme = useTheme()
  const showFab = useMediaQuery(theme.breakpoints.down('lg'))

  if (!showFab) return null

  return (
    <Tooltip title={label} placement="left">
      <Fab
        color="primary"
        aria-label={label}
        onClick={onClick}
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 20 },
          // Clear floating bottom nav on phone; sit above content padding on tablet.
          bottom: {
            xs: bottomNavClearance(16),
            md: 24,
          },
          zIndex: (t) => t.zIndex.speedDial,
        }}
      >
        <AddIcon />
      </Fab>
    </Tooltip>
  )
}
