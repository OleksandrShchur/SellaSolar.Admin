import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material'
import { DetailPanel, panelPad, surfaceSx } from './DetailPanel'

type CardListSkeletonProps = {
  count?: number
  /** Secondary text lines under the title */
  lines?: 0 | 1 | 2
  showChips?: boolean
}

/** Mobile card list placeholder — matches Projects / Warehouse / Users cards. */
export function CardListSkeleton({
  count = 5,
  lines = 1,
  showChips = true,
}: CardListSkeletonProps) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="outlined">
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Skeleton variant="text" width="58%" height={24} />
            {lines >= 1 && <Skeleton variant="text" width="82%" sx={{ mt: 0.5 }} />}
            {lines >= 2 && <Skeleton variant="text" width="48%" />}
            {showChips && (
              <Stack direction="row" spacing={1} mt={1.25}>
                <Skeleton variant="rounded" width={72} height={24} />
                <Skeleton variant="rounded" width={96} height={24} />
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

/** My Jobs list placeholder — cream surface with list rows. */
export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Box sx={{ ...surfaceSx, overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: panelPad,
            py: 1.75,
            borderBottom: i < count - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="42%" height={22} />
            <Skeleton variant="text" width="78%" />
          </Box>
          <Skeleton variant="rounded" width={72} height={24} sx={{ flexShrink: 0 }} />
        </Box>
      ))}
    </Box>
  )
}

type DetailPageSkeletonProps = {
  /** `tabbed` matches Project detail; `simple` matches User / Warehouse detail */
  variant?: 'simple' | 'tabbed'
  panels?: number
  fieldsPerPanel?: number
}

function FieldSkeleton({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <Skeleton variant="text" width={88} height={16} />
      <Skeleton variant="text" width="68%" height={24} sx={{ mt: 0.75 }} />
    </Box>
  )
}

const fieldGridSx = {
  display: 'grid',
  gap: { xs: 2.5, sm: 3 },
  rowGap: { xs: 2.25, sm: 2.75 },
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
  },
} as const

/** Detail page placeholder — back/header chrome + panel field shapes. */
export function DetailPageSkeleton({
  variant = 'simple',
  panels = 1,
  fieldsPerPanel = 4,
}: DetailPageSkeletonProps) {
  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {variant === 'tabbed' ? (
            <>
              <Skeleton variant="text" width="38%" height={32} sx={{ minWidth: 120 }} />
              <Skeleton variant="rounded" width={72} height={24} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Skeleton variant="text" width="38%" height={32} sx={{ minWidth: 120 }} />
                <Skeleton variant="rounded" width={72} height={24} />
              </Stack>
              <Skeleton variant="text" width="52%" sx={{ mt: 0.5, minWidth: 140 }} />
            </>
          )}
        </Box>
        <Skeleton
          variant="rounded"
          width={108}
          height={36}
          sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0, borderRadius: 999 }}
        />
      </Stack>

      {variant === 'tabbed' ? (
        <DetailPanel sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ px: panelPad, pt: panelPad }}>
            <Stack direction="row" spacing={2.5} sx={{ overflow: 'hidden', pb: 1 }}>
              {[96, 88, 72, 100, 64].map((w, i) => (
                <Skeleton key={i} variant="text" width={w} height={36} sx={{ flexShrink: 0 }} />
              ))}
            </Stack>
          </Box>
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />
          <Box sx={{ p: panelPad }}>
            <Box sx={fieldGridSx}>
              <FieldSkeleton fullWidth />
              {Array.from({ length: 5 }, (_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </Box>
          </Box>
        </DetailPanel>
      ) : (
        Array.from({ length: panels }, (_, p) => (
          <DetailPanel key={p}>
            {p > 0 && (
              <Skeleton variant="text" width={168} height={28} sx={{ mb: 1.75 }} />
            )}
            <Box sx={fieldGridSx}>
              {Array.from({ length: fieldsPerPanel }, (_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </Box>
          </DetailPanel>
        ))
      )}
    </Stack>
  )
}
