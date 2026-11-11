import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { BottomNavigation, BottomNavigationAction, Box } from '@mui/material'
import { alpha } from '@mui/material/styles'
import LiquidGlass from 'liquid-glass-react'
import { brandColors } from '../theme'
import {
  BOTTOM_NAV_DOCK_HEIGHT,
  BOTTOM_NAV_HEIGHT,
  BOTTOM_NAV_INSET_BOTTOM,
  BOTTOM_NAV_INSET_X,
} from './bottomNav'

export type MobileNavItem = {
  to: string
  label: string
  icon: ReactNode
}

type MobileBottomNavProps = {
  navItems: MobileNavItem[]
  activeIndex: number
}

type IndicatorState = {
  left: number
  width: number
  ready: boolean
}

const SLIDE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SLIDE_MS = 280
const ACTION_HEIGHT = BOTTOM_NAV_HEIGHT - 4

/**
 * liquid-glass-react always applies `translate(-50%, -50%)` and defaults
 * `top`/`left` to 50%. Position the dock by its center point with `fixed`.
 * Inner `.glass` is forced full-width via `.mobile-liquid-nav` in index.css.
 */
export default function MobileBottomNav({ navItems, activeIndex }: MobileBottomNavProps) {
  const halfDock = BOTTOM_NAV_DOCK_HEIGHT / 2
  const navRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<IndicatorState>({
    left: 0,
    width: 0,
    ready: false,
  })

  const updateIndicator = useCallback(() => {
    const root = navRef.current
    if (!root || activeIndex < 0) {
      setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }

    const actions = root.querySelectorAll<HTMLElement>('.MuiBottomNavigationAction-root')
    const action = actions[activeIndex]
    if (!action) {
      setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev))
      return
    }

    const rootRect = root.getBoundingClientRect()
    const actionRect = action.getBoundingClientRect()
    const next = {
      left: actionRect.left - rootRect.left,
      width: actionRect.width,
      ready: true,
    }
    setIndicator((prev) =>
      prev.left === next.left && prev.width === next.width && prev.ready === next.ready
        ? prev
        : next,
    )
  }, [activeIndex])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, navItems.length])

  useEffect(() => {
    const root = navRef.current
    if (!root) return

    const ro = new ResizeObserver(() => updateIndicator())
    ro.observe(root)
    window.addEventListener('resize', updateIndicator)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator])

  return (
    <LiquidGlass
      className="mobile-liquid-nav"
      overLight
      displacementScale={48}
      blurAmount={0.08}
      saturation={120}
      aberrationIntensity={1.5}
      elasticity={0}
      cornerRadius={28}
      padding="6px 8px"
      mode="standard"
      style={{
        position: 'fixed',
        left: '50%',
        top: `calc(100dvh - ${BOTTOM_NAV_INSET_BOTTOM}px - env(safe-area-inset-bottom, 0px) - ${halfDock}px)`,
        width: `calc(100vw - ${BOTTOM_NAV_INSET_X * 2}px)`,
        zIndex: 1100,
      }}
    >
      <Box sx={{ position: 'relative', width: '100%' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            height: ACTION_HEIGHT,
            width: indicator.width,
            borderRadius: 2,
            bgcolor: alpha(brandColors.primary, 0.18),
            transform: `translate3d(${indicator.left}px, -50%, 0)`,
            opacity: indicator.ready ? 1 : 0,
            transition: indicator.ready
              ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}, width ${SLIDE_MS}ms ${SLIDE_EASE}, opacity 160ms ease`
              : 'none',
            pointerEvents: 'none',
            zIndex: 0,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
            },
          }}
        />
        <BottomNavigation
          ref={navRef}
          value={activeIndex === -1 ? false : activeIndex}
          showLabels
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: BOTTOM_NAV_HEIGHT,
            minHeight: BOTTOM_NAV_HEIGHT,
            justifyContent: 'space-evenly',
            backgroundColor: 'transparent',
            overflow: 'hidden',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              maxWidth: 'none',
              flex: '1 1 0',
              height: ACTION_HEIGHT,
              minHeight: 0,
              maxHeight: ACTION_HEIGHT,
              my: 'auto',
              mx: 0.25,
              px: 0.5,
              py: 0.5,
              borderRadius: 2,
              color: 'text.secondary',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              transition: `color ${SLIDE_MS}ms ${SLIDE_EASE}`,
              '&.Mui-selected': {
                color: 'primary.dark',
                backgroundColor: 'transparent',
              },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontWeight: 600,
              lineHeight: 1.2,
              mt: 0.25,
              '&.Mui-selected': {
                fontSize: '0.65rem',
              },
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1.35rem',
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
      </Box>
    </LiquidGlass>
  )
}
