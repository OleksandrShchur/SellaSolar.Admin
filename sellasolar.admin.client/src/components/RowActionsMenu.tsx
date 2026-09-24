import { useId, useState, type ReactNode } from 'react'
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'

export type RowActionItem =
  | {
      kind?: 'item'
      key: string
      label: string
      icon?: ReactNode
      onClick: () => void
      disabled?: boolean
      /** Visual tone for destructive / caution actions */
      tone?: 'default' | 'warning' | 'danger'
    }
  | { kind: 'divider'; key: string }

type Props = {
  label?: string
  items: RowActionItem[]
  size?: 'small' | 'medium'
}

export default function RowActionsMenu({
  label = 'Дії',
  items,
  size = 'small',
}: Props) {
  const menuId = useId()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const open = Boolean(anchor)

  const close = () => setAnchor(null)

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size={size}
          aria-label={label}
          aria-controls={open ? menuId : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={(e) => {
            e.stopPropagation()
            setAnchor(e.currentTarget)
          }}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 2,
            sx: { minWidth: 200, mt: 0.5 },
          },
        }}
      >
        {items.map((item) => {
          if (item.kind === 'divider') {
            return <Divider key={item.key} sx={{ my: 0.5 }} />
          }

          const color =
            item.tone === 'danger'
              ? 'error.main'
              : item.tone === 'warning'
                ? 'warning.dark'
                : 'text.primary'

          return (
            <MenuItem
              key={item.key}
              disabled={item.disabled}
              onClick={() => {
                close()
                item.onClick()
              }}
              sx={{ color, py: 1 }}
            >
              {item.icon && (
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
