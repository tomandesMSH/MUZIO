import { Badge } from '../../components/ui/Badge'
import { SettingsRow } from '../../components/ui/SettingsRow'
import { AppShell } from '../../components/layout/AppShell'
import { useAuth } from '../../lib/AuthProvider'

// The teacher's profile; settings are on their own page (Nastavení).
export function Profile() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <AppShell role="teacher">
      <div className="space-y-6 flex-1">
        <div className="text-center">
          <h1 className="text-xl">{profile.full_name}</h1>
          <p className="text-text-muted text-sm">Učitel{profile.is_moderator ? ' · moderátor' : ''}</p>
        </div>

        <div>
          <SettingsRow
            label="Ověření identity"
            right={
              profile.is_verified ? (
                <Badge tone="success">Ověřeno</Badge>
              ) : (
                <Badge tone="pending">Čeká na ověření</Badge>
              )
            }
          />
        </div>
      </div>
    </AppShell>
  )
}
