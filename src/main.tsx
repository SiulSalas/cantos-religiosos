import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CssBaseline } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import App from './App'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffffff' },
    background: {
      default: '#000000',
      paper: '#000000',
    },
    text: {
      primary: '#ffffff',
      secondary: '#bdbdbd',
    },
    divider: '#3a3a3a',
  },
  typography: {
    fontFamily:
      '"Atkinson Hyperlegible Next", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: 18,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          padding: '10px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.95rem',
          height: 32,
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
