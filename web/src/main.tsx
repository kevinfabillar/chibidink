import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ApiError } from './api/httpClient'
import App from './App.tsx'
import { useAuth } from './auth/authStore'
import { AppErrorBoundary } from './components/ui/ErrorPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
})

// Signing out (any way: button, sidebar, expired login) drops everything cached for that account,
// so the next person to sign in on this device never sees the previous one's sessions or profile.
useAuth.subscribe((state, prev) => {
  if (prev.token && state.token !== prev.token) queryClient.clear()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
