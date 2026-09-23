import { Alert, Paper, Typography } from '@mui/material'

export default function MyJobsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Мої завдання
      </Typography>
      <Alert severity="info" variant="outlined">
        Фільтрація проектів за призначеним виконавцем ще не налаштована: у базі немає зв’язку між
        обліковим записом користувача (AspNetUsers) і записом працівника (Workers / ProjectWorkers).
        Після додавання поля прив’язки (наприклад, WorkerProfileId) тут з’явиться список призначених
        робіт.
      </Alert>
    </Paper>
  )
}
