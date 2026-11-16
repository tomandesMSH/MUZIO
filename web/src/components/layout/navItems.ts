import type { NavIconName } from './NavIcon'
import type { NavBadgeKey } from '../../lib/navBadges'

export interface NavItem {
  to: string
  label: string
  icon: NavIconName
  // A number on the icon, and what it counts (for screen readers).
  badge?: { key: NavBadgeKey; label: string }
  isActive: (pathname: string, tab: string | null) => boolean
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { to: '/student', label: 'Dashboard', icon: 'home', isActive: (p) => p === '/student' },
  { to: '/student/lessons', label: 'Lekce', icon: 'lessons', isActive: (p) => p === '/student/lessons' },
  { to: '/student/feedback', label: 'Nahrávky', icon: 'recordings', isActive: (p) => p === '/student/feedback' },
  { to: '/student/profile', label: 'Profil', icon: 'profile', isActive: (p) => p === '/student/profile' },
]

export const TEACHER_NAV_ITEMS: NavItem[] = [
  {
    to: '/teacher',
    label: 'Dashboard',
    icon: 'home',
    badge: { key: 'pending-review', label: 'nahrávek ke kontrole' },
    isActive: (p) => p === '/teacher',
  },
  { to: '/teacher/students', label: 'Žáci', icon: 'students', isActive: (p) => p === '/teacher/students' },
  { to: '/teacher/classrooms', label: 'Učebny', icon: 'classrooms', isActive: (p) => p === '/teacher/classrooms' },
  { to: '/teacher/profile', label: 'Profil', icon: 'profile', isActive: (p) => p === '/teacher/profile' },
]

export function navItemsFor(role: 'student' | 'teacher'): NavItem[] {
  return role === 'student' ? STUDENT_NAV_ITEMS : TEACHER_NAV_ITEMS
}
