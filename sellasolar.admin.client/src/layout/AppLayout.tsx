import { useMemo, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import GroupsIcon from '@mui/icons-material/Groups'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '../auth/AuthContext'
import ChangePasswordDialog from '../components/ChangePasswordDialog'
import { formatPhone } from '../utils/labels'
import { bottomNavClearance } from './bottomNav'
import MobileBottomNav from './MobileBottomNav'

const DRAWER_WIDTH = 260
const DRAWER_WIDTH_COLLAPSED = 72

function sectionTitle(pathname: string): string {
  if (pathname.startsWith('/users')) return 'Співробітники'
  if (pathname.startsWith('/my-jobs')) return 'Мої завдання'
  if (pathname.startsWith('/warehouse')) return 'Склад'
  if (pathname.startsWith('/projects')) return 'Проекти'
  return 'Внутрішня CRM'
}

export default function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const location = useLocation()

  const navItems = useMemo(() => {
    const items = []
    const isFieldWorker = hasRole('Worker') && !hasRole('Admin')
    if (isFieldWorker) {
      items.push({ to: '/my-jobs', label: 'Мої завдання', icon: <AssignmentIndIcon /> })
    } else {
      if (hasRole('Admin')) {
        items.push({ to: '/users', label: 'Співробітники', icon: <GroupsIcon /> })
      }
      items.push(
        { to: '/projects', label: 'Проекти', icon: <FolderSpecialIcon /> },
        { to: '/warehouse', label: 'Склад', icon: <WarehouseIcon /> },
      )
    }
    return items
  }, [hasRole])

  const drawerWidth = desktopCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH
  const isFieldWorker = hasRole('Worker') && !hasRole('Admin')
  const title = useMemo(() => {
    if (isFieldWorker && location.pathname.startsWith('/projects/')) return 'Мої завдання'
    return sectionTitle(location.pathname)
  }, [location.pathname, isFieldWorker])
  const activeIndex = navItems.findIndex((item) => {
    if (item.to === '/my-jobs' && isFieldWorker && location.pathname.startsWith('/projects/')) {
      return true
    }
    return location.pathname.startsWith(item.to)
  })

  const brandBlock = (
    <Toolbar
      sx={{
        gap: 1.5,
        px: desktopCollapsed ? 1.5 : 2,
        minHeight: { xs: 56, sm: 64 },
        justifyContent: desktopCollapsed ? 'center' : 'flex-start',
      }}
    >
      <Box
        component="img"
        src="/sella-solar-sticker.png"
        alt="Sella Solar"
        sx={{ height: 38, width: 'auto', flexShrink: 0, display: 'block' }}
      />
      {!desktopCollapsed && (
        <Typography variant="caption" color="text.secondary" noWrap>
          Адмін-панель
        </Typography>
      )}
    </Toolbar>
  )

  const navList = (compact: boolean) => (
    <List sx={{ px: compact ? 0.75 : 1, py: 1 }}>
      {navItems.map((item) => {
        const selected = location.pathname.startsWith(item.to)
        const button = (
          <ListItemButton
            component={RouterLink}
            to={item.to}
            selected={selected}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              minHeight: 48,
              justifyContent: compact ? 'center' : 'flex-start',
              px: compact ? 1 : 2,
              transition: theme.transitions.create(['background-color', 'padding'], {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: compact ? 0 : 40,
                justifyContent: 'center',
                color: selected ? 'primary.dark' : 'text.secondary',
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!compact && <ListItemText primary={item.label} />}
          </ListItemButton>
        )

        return compact ? (
          <Tooltip key={item.to} title={item.label} placement="right">
            {button}
          </Tooltip>
        ) : (
          <Box key={item.to}>{button}</Box>
        )
      })}
    </List>
  )

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        // Prefer 100% over 100vw — vw includes the scrollbar and can cause a 1-scrollbar-width jump
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            gap: 1,
            px: { xs: 1.5, sm: 2 },
          }}
        >
          {isMobile && (
            <Box
              component="img"
              src="/sella-solar-sticker.png"
              alt="Sella Solar"
              sx={{ height: 36, width: 'auto', flexShrink: 0, display: 'block' }}
            />
          )}
          <Typography
            variant="h6"
            color="text.primary"
            sx={{
              fontSize: { xs: '1.05rem', sm: '1.25rem' },
              fontWeight: 600,
              lineHeight: 1.3,
              flex: 1,
              minWidth: 0,
            }}
            noWrap
          >
            {title}
          </Typography>
          <Tooltip title={user?.fullName ?? 'Обліковий запис'}>
            <IconButton
              aria-label="Меню облікового запису"
              onClick={(e) => setAccountAnchor(e.currentTarget)}
              sx={{ flexShrink: 0 }}
            >
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                elevation: 2,
                sx: {
                  minWidth: 240,
                  mt: 0.75,
                  py: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {user?.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                {formatPhone(user?.username)}
              </Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                setAccountAnchor(null)
                setPasswordOpen(true)
              }}
              sx={{ py: 1.1, mx: 0.5, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                <LockOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Змінити пароль"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAccountAnchor(null)
                void logout().then(() => navigate('/login', { replace: true, state: null }))
              }}
              sx={{ py: 1.1, mx: 0.5, borderRadius: 1.5, color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Вийти"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
          </Menu>
          <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
        </Toolbar>
      </AppBar>

      {/* Desktop / tablet: collapsible side drawer */}
      {!isMobile && (
        <Box
          component="nav"
          aria-label="Основна навігація"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
          }}
        >
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              },
            }}
          >
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {brandBlock}
              {navList(desktopCollapsed)}
              <Box sx={{ mt: 'auto', p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Tooltip
                  title={desktopCollapsed ? 'Розгорнути меню' : 'Згорнути меню'}
                  placement="right"
                >
                  <IconButton
                    onClick={() => setDesktopCollapsed((v) => !v)}
                    aria-label={desktopCollapsed ? 'Розгорнути меню' : 'Згорнути меню'}
                    sx={{
                      width: '100%',
                      minHeight: 44,
                      borderRadius: 2,
                    }}
                  >
                    {desktopCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Drawer>
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          mt: { xs: '56px', sm: '64px' },
          px: { xs: 1.5, sm: 2, md: 3 },
          // Match horizontal padding so the gap under the app bar equals the side gutters.
          pt: { xs: 1.5, sm: 2, md: 3 },
          pb: {
            xs: bottomNavClearance(12),
            md: 3,
          },
          maxWidth: '100%',
          overflowX: 'hidden',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Outlet />
      </Box>

      {isMobile && <MobileBottomNav navItems={navItems} activeIndex={activeIndex} />}
    </Box>
  )
}
