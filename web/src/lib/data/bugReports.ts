import { supabase } from '../supabase'

// "Nahlásit chybu" (migration 0050).

export const BUG_REPORT_MAX = 2000

export interface BugReport {
  id: string
  user_id: string | null
  body: string
  app_version: string | null
  path: string | null
  user_agent: string | null
  status: 'open' | 'resolved'
  created_at: string
  reporter_name?: string | null
}

export async function sendBugReport(userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('bug_reports').insert({
    user_id: userId,
    body: body.trim().slice(0, BUG_REPORT_MAX),
    app_version: __APP_VERSION__,
    path: `${location.pathname}${location.search}`.slice(0, 300),
    user_agent: navigator.userAgent.slice(0, 500),
  })
  if (error) throw error
}

// Open ones first, newest on top, with the reporter's name.
export async function fetchBugReports(): Promise<BugReport[]> {
  const { data, error } = await supabase
    .from('bug_reports')
    .select('*, profiles(full_name)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []).map((row) => {
    const { profiles, ...rest } = row as BugReport & { profiles: { full_name: string | null } | null }
    return { ...rest, reporter_name: profiles?.full_name ?? null }
  })
}

export async function countOpenBugReports(): Promise<number> {
  const { count, error } = await supabase.from('bug_reports').select('id', { count: 'exact', head: true }).eq('status', 'open')
  if (error) throw error
  return count ?? 0
}

export async function setBugReportStatus(id: string, status: BugReport['status']): Promise<void> {
  const { error } = await supabase.from('bug_reports').update({ status }).eq('id', id)
  if (error) throw error
}
