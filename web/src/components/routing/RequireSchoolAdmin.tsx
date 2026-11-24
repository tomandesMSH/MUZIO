import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import { isSchoolAdmin } from '../../lib/roles'
import { BannedScreen } from '../../screens/BannedScreen'
import { ConnectionProblem } from '../../screens/ConnectionProblem'
import { roleHome } from './RequireRole'

// The school admin panel (/sprava-skoly): a teacher with is_school_admin.
// Like RequireModerator, it's a capability on top of the teacher role.
export function RequireSchoolAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading, profileError } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return profileError ? <ConnectionProblem /> : <Navigate to="/login" replace />
  if (profile.is_banned) return <BannedScreen />
  if (!isSchoolAdmin(profile)) return <Navigate to={roleHome(profile.role)} replace />
  return <>{children}</>
}
