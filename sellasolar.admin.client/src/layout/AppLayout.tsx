import { useMemo, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SolarPowerIcon from '@mui/icons-material/SolarPower'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import GroupsIcon from '@mui/icons-material/Groups'
import { brandColors } from '../theme'

const DRAWER_WIDTH = 260
const DRAWER_WIDTH_COLLAPSED = 72
const BOTTOM_NAV_HEIGHT = 64

const navItems = [
  { to: '/projects', label: 'Проекти', icon: <FolderSpecialIcon /> },
  { to: '/warehouse', label: 'Склад', icon: <WarehouseIcon /> },
  { to: '/workers', label: 'Працівники', icon: <GroupsIcon /> },
] as const

function sectionTitle(pathname: string): string {
  if (pathname.startsWith('/warehouse')) return 'Склад'
  if (pathname.startsWith('/workers')) return 'Працівники'
  if (pathname.startsWith('/projects')) return 'Проекти'
  return 'Внутрішня CRM'
}

export default function AppLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const location = useLocation()

  const drawerWidth = desktopCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH
  const title = useMemo(() => sectionTitle(location.pathname), [location.pathname])
  const activeIndex = navItems.findIndex((item) => location.pathname.startsWith(item.to))

  const brandBlock = (
    <Toolbar
      sx={{
        gap: 1.5,
        px: desktopCollapsed ? 1.5 : 2,
        minHeight: { xs: 56, sm: 64 },
        justifyContent: desktopCollapsed ? 'center' : 'flex-start',
      }}
    >
      <SolarPowerIcon color="primary" sx={{ fontSize: 28, flexShrink: 0 }} />
      {!desktopCollapsed && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            lineHeight={1.2}
            sx={{ fontFamily: '"Sora", system-ui, sans-serif' }}
          >
            SellaSolar
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Адмін-панель
          </Typography>
        </Box>
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
        maxWidth: '100vw',
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
            <SolarPowerIcon color="primary" sx={{ fontSize: 26, flexShrink: 0 }} />
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
            {isMobile ? (
              <>
                <Box component="span" sx={{ fontFamily: '"Sora", system-ui, sans-serif', fontWeight: 800 }}>
                  SellaSolar
                </Box>
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {' · '}
                  {title}
                </Box>
              </>
            ) : (
              title
            )}
          </Typography>
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
          py: { xs: 1.5, sm: 2, md: 3 },
          pb: {
            xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)`,
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

      {/* Mobile: bottom nav for the 3 primary sections */}
      {isMobile && (
        <BottomNavigation
          value={activeIndex === -1 ? false : activeIndex}
          showLabels
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
            pb: 'env(safe-area-inset-bottom, 0px)',
            zIndex: (t) => t.zIndex.appBar,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: brandColors.cream,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              minHeight: 48,
              py: 1,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.dark',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.75rem',
              '&.Mui-selected': {
                fontSize: '0.75rem',
              },
            },
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.to}
              label={item.label}
              icon={item.icon}
              component={RouterLink}
              to={item.to}
            />
          ))}
        </BottomNavigation>
      )}
    </Box>
  )
}
