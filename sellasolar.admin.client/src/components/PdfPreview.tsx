import { useEffect, useRef, useState } from 'react'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Must live in the same module as <Document>/<Page> (react-pdf requirement).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const hideScrollbarSx = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const

type Props = {
  /** Blob URL or remote PDF URL. */
  file: string
  title?: string
  /** Fallback height while measuring the container. */
  minHeight?: number
  /** When true, fill the parent instead of using a fixed max height. */
  fill?: boolean
  errorMessage?: string
  loadingLabel?: string
}

export default function PdfPreview({
  file,
  title = 'PDF',
  minHeight = 360,
  fill = false,
  errorMessage = 'Не вдалося відкрити попередній перегляд',
  loadingLabel = 'Завантаження…',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      // Subtract horizontal padding so pages don't overflow and create a horizontal bar.
      const styles = getComputedStyle(el)
      const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
      const next = Math.floor(el.clientWidth - padX)
      if (next > 0) setWidth(next)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setNumPages(0)
    setError(null)
  }, [file])

  const pageWidth = width > 0 ? width : undefined

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        minHeight,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
        overflow: 'auto',
        p: { xs: 1, sm: 1.5 },
        ...hideScrollbarSx,
        ...(fill
          ? { flex: 1, minHeight: 0, height: '100%' }
          : { maxHeight: { xs: 'min(70dvh, 640px)', sm: 640 } }),
      }}
    >
      {error ? (
        <Alert severity="warning">{error}</Alert>
      ) : (
        <Document
          file={file}
          // react-pdf 11 defaults to Suspense; keep classic loading/error for a stable dialog UX.
          suspense={false}
          loading={
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: minHeight - 32, py: 4 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                {loadingLabel}
              </Typography>
            </Stack>
          }
          error={
            <Alert severity="warning">{errorMessage}</Alert>
          }
          onLoadSuccess={({ numPages: pages }) => {
            setNumPages(pages)
            setError(null)
          }}
          onLoadError={() => setError(errorMessage)}
          onSourceError={() => setError(errorMessage)}
        >
          {pageWidth ? (
            <Stack spacing={1.5}>
              {Array.from({ length: numPages }, (_, index) => (
                <Box
                  key={`page-${index + 1}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    borderRadius: 0.5,
                    overflow: 'hidden',
                    '& .react-pdf__Page': { maxWidth: '100%' },
                  }}
                >
                  <Page
                    pageNumber={index + 1}
                    width={pageWidth}
                    suspense={false}
                    renderTextLayer
                    renderAnnotationLayer
                    loading={
                      <Stack alignItems="center" justifyContent="center" sx={{ width: pageWidth, minHeight: 200 }}>
                        <CircularProgress size={22} />
                      </Stack>
                    }
                    aria-label={`${title} · сторінка ${index + 1}`}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: minHeight - 32, py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          )}
        </Document>
      )}
    </Box>
  )
}
