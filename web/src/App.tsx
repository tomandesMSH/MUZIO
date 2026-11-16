import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './lib/AuthProvider'
import { initTheme } from './lib/theme'

export function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
