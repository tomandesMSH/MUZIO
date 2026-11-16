import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './lib/AuthProvider'
import { initTheme } from './lib/theme'
import { UpdateBanner } from './components/ui/UpdateBanner'

export function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateBanner />
    </AuthProvider>
  )
}
