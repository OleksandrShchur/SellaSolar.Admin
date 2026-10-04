import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Tab, Tabs, type SxProps, type Theme } from '@mui/material'

type Props = {
  value: number
  onChange: (event: React.SyntheticEvent, value: number) => void
  labels: string[]
  sx?: SxProps<Theme>
}

type FadeState = { left: boolean; right: boolean }

function scrollerMask({ left, right }: FadeState): string | undefined {
  if (left && right) {
    return 'linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%)'
  }
  if (left) {
    return 'linear-gradient(90deg, transparent 0, #000 28px, #000 100%)'
  }
  if (right) {
    return 'linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)'
  }
  return undefined
}

/**
 * Scrollable tab bar with auto chevrons + edge fade masks so overflow is obvious on tablet/mobile.
 */
export default function ScrollableTabs({ value, onChange, labels, sx }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState<FadeState>({ left: false, right: false })

  const updateFades = useCallback(() => {
    const scroller = rootRef.current?.querySelector('.MuiTabs-scroller') as HTMLElement | null
    if (!scroller) {
      setFade({ left: false, right: false })
      return
    }
    const { scrollLeft, clientWidth, scrollWidth } = scroller
    const maxScroll = scrollWidth - clientWidth
    setFade({
      left: scrollLeft > 2,
      right: maxScroll > 2 && scrollLeft < maxScroll - 2,
    })
  }, [])

  useEffect(() => {
    updateFades()
    const scroller = rootRef.current?.querySelector('.MuiTabs-scroller') as HTMLElement | null
    if (!scroller) return

    scroller.addEventListener('scroll', updateFades, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateFades) : null
    ro?.observe(scroller)

    return () => {
      scroller.removeEventListener('scroll', updateFades)
      ro?.disconnect()
    }
  }, [updateFades, labels.length])

  useEffect(() => {
    const id = requestAnimationFrame(updateFades)
    return () => cancelAnimationFrame(id)
  }, [value, updateFades])

  const mask = scrollerMask(fade)

  return (
    <Box
      ref={rootRef}
      sx={[{ position: 'relative', overflow: 'hidden' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Tabs
        value={value}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        textColor="inherit"
        sx={{
          minHeight: { xs: 36, sm: 40 },
          bgcolor: 'transparent',
          '& .MuiTabs-flexContainer': {
            gap: { xs: 2, sm: 2.5 },
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: { xs: '0.875rem', sm: '0.9375rem' },
            color: 'text.secondary',
            minHeight: { xs: 36, sm: 40 },
            minWidth: 0,
            px: 0,
            py: 1,
            '&.Mui-selected': {
              color: 'text.primary',
              fontWeight: 700,
            },
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            backgroundColor: 'primary.dark',
          },
          '& .MuiTabs-scrollButtons': {
            width: 32,
            flexShrink: 0,
            color: 'text.secondary',
            '&.Mui-disabled': {
              display: 'none',
            },
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
          },
          '& .MuiTabs-scroller': {
            maskImage: mask,
            WebkitMaskImage: mask,
          },
        }}
      >
        {labels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
    </Box>
  )
}
