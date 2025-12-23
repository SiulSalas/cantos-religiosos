import { Box, Container, Divider, Paper, Stack, Typography } from '@mui/material'

export default function App() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Cantos Catolicos
            </Typography>
            <Typography color="text.secondary">
              Sitio estatico para leer cantos catolicos mexicanos.
            </Typography>
          </Box>

          <Divider />

          <Stack spacing={2}>
            <Typography variant="h6">Secciones sugeridas</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Entrada</Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega aqui tus cantos de entrada.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Ofertorio</Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega aqui tus cantos de ofertorio.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Comunion</Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega aqui tus cantos de comunion.
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1">Salida</Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega aqui tus cantos de salida.
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}
