import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Dialog,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DownloadIcon from '@mui/icons-material/Download'
import type { ProjectPhoto } from '../api/types'
import { formatDateTime } from '../utils/labels'

type Props = {
  open: boolean
  photos: ProjectPhoto[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const SWIPE_THRESHOLD_PX = 56
const SLIDE_MS = 280

type Point = { x: number; y: number }

function distance(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

function midPoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const path = url.split('?')[0] ?? url
    const last = path.split('/').filter(Boolean).pop()
    if (last && /\.[a-z0-9]+$/i.test(last)) return last
  } catch {
    /* ignore */
  }
  return fallback
}

async function downloadImage(url: string, fileName: string) {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error('download failed')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

function photoCaption(photo: ProjectPhoto) {
  return photo.caption?.trim() || 'Без підпису'
}

export default function PhotoLightbox({ open, photos, index, onClose, onIndexChange }: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))
  const count = photos.length

  // Local slide index so drag reset + photo swap happen in one paint (avoids one-frame glitch).
  const [visualIndex, setVisualIndex] = useState(index)
  const photo = photos[visualIndex] ?? null
  const prevPhoto = count > 1 ? photos[(visualIndex - 1 + count) % count]! : null
  const nextPhoto = count > 1 ? photos[(visualIndex + 1) % count]! : null

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [dragX, setDragX] = useState(0)
  const [slideTransition, setSlideTransition] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const scaleRef = useRef(1)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })
  const dragXRef = useRef(0)
  const slideLockedRef = useRef(false)
  const visualIndexRef = useRef(index)
  const pointersRef = useRef<Map<number, Point>>(new Map())
  const pinchStartRef = useRef<{ distance: number; scale: number; mid: Point; offset: Point } | null>(
    null,
  )
  const panStartRef = useRef<{ point: Point; offset: Point } | null>(null)
  const swipeStartRef = useRef<Point | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)

  const setDrag = (x: number) => {
    dragXRef.current = x
    setDragX(x)
  }

  const resetTransform = useCallback(() => {
    scaleRef.current = 1
    offsetRef.current = { x: 0, y: 0 }
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    if (!open) {
      slideLockedRef.current = false
      setSlideTransition(false)
      setDrag(0)
      return
    }
    if (slideLockedRef.current) return
    visualIndexRef.current = index
    setVisualIndex(index)
    resetTransform()
    setSlideTransition(false)
    setDrag(0)
  }, [open, index, resetTransform])

  const commitSlide = useCallback(
    (direction: 'prev' | 'next') => {
      if (count <= 1 || slideLockedRef.current) return
      const stageWidth = stageRef.current?.clientWidth ?? window.innerWidth
      const target = direction === 'next' ? -stageWidth : stageWidth
      const from = visualIndexRef.current
      const nextIndex =
        direction === 'next' ? (from + 1) % count : (from - 1 + count) % count

      slideLockedRef.current = true
      setSlideTransition(true)
      setDrag(target)

      window.setTimeout(() => {
        // Disable transition, recenter, and swap slides together — never leave
        // the track at ±width with an already-updated index (that flashes the wrong photo).
        setSlideTransition(false)
        dragXRef.current = 0
        setDragX(0)
        visualIndexRef.current = nextIndex
        setVisualIndex(nextIndex)
        resetTransform()
        slideLockedRef.current = false
        onIndexChange(nextIndex)
      }, SLIDE_MS)
    },
    [count, onIndexChange, resetTransform],
  )

  const goPrev = useCallback(() => commitSlide('prev'), [commitSlide])
  const goNext = useCallback(() => commitSlide('next'), [commitSlide])

  const snapBack = () => {
    setSlideTransition(true)
    setDrag(0)
    window.setTimeout(() => {
      setSlideTransition(false)
    }, SLIDE_MS)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (slideLockedRef.current) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, goPrev, goNext])

  const applyScaleAt = (nextScale: number, focal: Point) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const fx = focal.x - rect.left - rect.width / 2
    const fy = focal.y - rect.top - rect.height / 2
    const prev = scaleRef.current
    const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE)
    const ratio = clamped / prev
    const nextOffset = {
      x: fx - (fx - offsetRef.current.x) * ratio,
      y: fy - (fy - offsetRef.current.y) * ratio,
    }
    if (clamped === MIN_SCALE) {
      nextOffset.x = 0
      nextOffset.y = 0
    }
    scaleRef.current = clamped
    offsetRef.current = nextOffset
    setScale(clamped)
    setOffset(nextOffset)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement | null)?.closest?.('button')) return
    if (slideLockedRef.current) return

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const point = { x: e.clientX, y: e.clientY }
    pointersRef.current.set(e.pointerId, point)
    setSlideTransition(false)

    if (pointersRef.current.size === 1) {
      if (scaleRef.current > 1) {
        panStartRef.current = { point, offset: { ...offsetRef.current } }
        swipeStartRef.current = null
      } else {
        swipeStartRef.current = point
        panStartRef.current = null
      }
    } else if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      const a = pts[0]!
      const b = pts[1]!
      pinchStartRef.current = {
        distance: distance(a, b),
        scale: scaleRef.current,
        mid: midPoint(a, b),
        offset: { ...offsetRef.current },
      }
      panStartRef.current = null
      swipeStartRef.current = null
      setDrag(0)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()]
      const a = pts[0]!
      const b = pts[1]!
      const dist = distance(a, b)
      if (pinchStartRef.current.distance > 0) {
        const nextScale =
          pinchStartRef.current.scale * (dist / pinchStartRef.current.distance)
        applyScaleAt(nextScale, midPoint(a, b))
      }
      return
    }

    if (pointersRef.current.size === 1 && panStartRef.current && scaleRef.current > 1) {
      const start = panStartRef.current
      const dx = e.clientX - start.point.x
      const dy = e.clientY - start.point.y
      const next = { x: start.offset.x + dx, y: start.offset.y + dy }
      offsetRef.current = next
      setOffset(next)
      return
    }

    if (
      pointersRef.current.size === 1 &&
      swipeStartRef.current &&
      scaleRef.current === 1 &&
      count > 1
    ) {
      const dx = e.clientX - swipeStartRef.current.x
      const dy = e.clientY - swipeStartRef.current.y
      // Prefer horizontal intent before moving the card.
      if (Math.abs(dx) > 8 || Math.abs(dragXRef.current) > 0) {
        if (Math.abs(dx) >= Math.abs(dy) * 0.85) {
          setDrag(dx)
        }
      }
    }
  }

  const endPointer = (e: React.PointerEvent) => {
    const wasSwipe = swipeStartRef.current
    const point = { x: e.clientX, y: e.clientY }

    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchStartRef.current = null
    if (pointersRef.current.size === 0) {
      panStartRef.current = null

      if (wasSwipe && scaleRef.current === 1 && count > 1 && !slideLockedRef.current) {
        const dx = dragXRef.current || point.x - wasSwipe.x
        const dy = point.y - wasSwipe.y
        swipeStartRef.current = null

        if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.05) {
          if (dx < 0) commitSlide('next')
          else commitSlide('prev')
          lastTapRef.current = null
          return
        }

        if (Math.abs(dragXRef.current) > 0) {
          snapBack()
          lastTapRef.current = null
          return
        }
      } else {
        swipeStartRef.current = null
      }

      const now = Date.now()
      const last = lastTapRef.current
      if (
        last &&
        now - last.time < 280 &&
        Math.hypot(point.x - last.x, point.y - last.y) < 28
      ) {
        if (scaleRef.current > 1) resetTransform()
        else applyScaleAt(2.2, point)
        lastTapRef.current = null
        return
      }
      lastTapRef.current = { time: now, x: point.x, y: point.y }
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (slideLockedRef.current) return
    const delta = -e.deltaY
    const factor = delta > 0 ? 1.12 : 1 / 1.12
    applyScaleAt(scaleRef.current * factor, { x: e.clientX, y: e.clientY })
  }

  const handleDownload = async () => {
    if (!photo || downloading) return
    setDownloading(true)
    try {
      const name = fileNameFromUrl(photo.url, `photo-${photo.id}.jpg`)
      await downloadImage(photo.url, name)
    } catch {
      window.open(photo.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  if (!photo) return null

  const caption = photoCaption(photo)
  const counter = count > 1 ? `${visualIndex + 1} / ${count}` : null
  const showNav = count > 1 && scale === 1 && !slideLockedRef.current
  const trackTransition = slideTransition
    ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
    : 'none'

  const slideSx = {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: { xs: 0.5, sm: 5 },
  }

  const imgSx = {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain' as const,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    borderRadius: 1,
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0C0A08',
          color: '#F8F2E6',
          backgroundImage: 'none',
          ...(fullScreen
            ? { m: 0, display: 'flex', flexDirection: 'column', height: '100%' }
            : {
                height: 'min(88vh, 900px)',
                maxHeight: '88vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
              }),
        },
      }}
      slotProps={{
        backdrop: {
          sx: { bgcolor: 'rgba(12, 10, 8, 0.72)' },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1,
          flexShrink: 0,
          borderBottom: '1px solid rgba(248, 242, 230, 0.12)',
        }}
      >
        <IconButton
          onClick={() => void handleDownload()}
          aria-label="Завантажити"
          disabled={downloading}
          sx={{ color: 'inherit' }}
        >
          <DownloadIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={700} fontSize="0.95rem">
            {caption}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(248, 242, 230, 0.65)' }}>
            {formatDateTime(photo.uploadedAt)}
            {counter ? ` · ${counter}` : ''}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Закрити" sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'hidden',
          cursor: scale > 1 ? 'grab' : count > 1 ? 'grab' : 'default',
          bgcolor: '#0C0A08',
        }}
      >
        {scale > 1 ? (
          <Box
            component="img"
            src={photo.url}
            alt={caption}
            draggable={false}
            sx={{
              position: 'absolute',
              inset: 0,
              m: 'auto',
              ...imgSx,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: pointersRef.current.size > 0 ? 'none' : 'transform 120ms ease-out',
              boxShadow: 'none',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              transform: `translate3d(${dragX}px, 0, 0)`,
              transition: trackTransition,
              willChange: 'transform',
            }}
          >
            {prevPhoto && (
              <Box sx={{ ...slideSx, transform: 'translate3d(-100%, 0, 0)' }}>
                <Box
                  component="img"
                  src={prevPhoto.url}
                  alt={photoCaption(prevPhoto)}
                  draggable={false}
                  sx={imgSx}
                />
              </Box>
            )}
            <Box sx={slideSx}>
              <Box
                component="img"
                src={photo.url}
                alt={caption}
                draggable={false}
                sx={imgSx}
              />
            </Box>
            {nextPhoto && (
              <Box sx={{ ...slideSx, transform: 'translate3d(100%, 0, 0)' }}>
                <Box
                  component="img"
                  src={nextPhoto.url}
                  alt={photoCaption(nextPhoto)}
                  draggable={false}
                  sx={imgSx}
                />
              </Box>
            )}
          </Box>
        )}

        {showNav && (
          <>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              aria-label="Попереднє фото"
              sx={{
                position: 'absolute',
                left: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                color: '#F8F2E6',
                bgcolor: 'rgba(21, 18, 14, 0.45)',
                '&:hover': { bgcolor: 'rgba(21, 18, 14, 0.7)' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              aria-label="Наступне фото"
              sx={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                color: '#F8F2E6',
                bgcolor: 'rgba(21, 18, 14, 0.45)',
                '&:hover': { bgcolor: 'rgba(21, 18, 14, 0.7)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
      </Box>
    </Dialog>
  )
}
