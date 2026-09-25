import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { DetailPanel } from '../components/DetailPanel'

export default function NoAccessPage() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh', px: 2 }}>
      <DetailPanel sx={{ maxWidth: 480, textAlign: 'center', p: 4 }}>
        <LockIcon color="warning" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h5" gutterBottom fontWeight={800}>
          Недостатньо прав
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
          У вашого облікового запису немає доступу до цієї сторінки. Зверніться до адміністратора, якщо
          вважаєте, що це помилка.
        </Typography>
        <Button component={RouterLink} to="/projects" variant="contained" color="primary">
          На головну
        </Button>
      </DetailPanel>
    </Box>
  )
}
