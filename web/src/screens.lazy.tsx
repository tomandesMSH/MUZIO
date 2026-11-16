import { lazy, Suspense, type ReactNode } from 'react'
import { Skeleton } from './components/ui/Skeleton'
import { ScreenErrorBoundary } from './components/routing/ScreenErrorBoundary'

// Each screen is its own download: a pupil never fetches the teacher's or the
// admin's screens (the first visit is much lighter on mobile data). Login stays
// in the main file - it's the first thing everyone sees.
export const StudentDashboard = lazy(() => import('./screens/student/Dashboard').then((m) => ({ default: m.StudentDashboard })))
export const Lessons = lazy(() => import('./screens/student/Lessons').then((m) => ({ default: m.Lessons })))
export const Recording = lazy(() => import('./screens/student/Recording').then((m) => ({ default: m.Recording })))
export const Feedback = lazy(() => import('./screens/student/Feedback').then((m) => ({ default: m.Feedback })))
export const Profile = lazy(() => import('./screens/student/Profile').then((m) => ({ default: m.Profile })))
export const TeacherDashboard = lazy(() => import('./screens/teacher/Dashboard').then((m) => ({ default: m.TeacherDashboard })))
export const Students = lazy(() => import('./screens/teacher/Students').then((m) => ({ default: m.Students })))
export const Grading = lazy(() => import('./screens/teacher/Grading').then((m) => ({ default: m.Grading })))
export const Classrooms = lazy(() => import('./screens/teacher/Classrooms').then((m) => ({ default: m.Classrooms })))
export const TeacherProfile = lazy(() => import('./screens/teacher/Profile').then((m) => ({ default: m.Profile })))
export const Classes = lazy(() => import('./screens/student/Classes').then((m) => ({ default: m.Classes })))
export const Settings = lazy(() => import('./screens/student/Settings').then((m) => ({ default: m.Settings })))
export const TeacherSettings = lazy(() => import('./screens/teacher/Settings').then((m) => ({ default: m.Settings })))
export const Queue = lazy(() => import('./screens/moderator/Queue').then((m) => ({ default: m.Queue })))

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScreenErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-md p-5 pt-10">
            <Skeleton rows={3} height="h-20" />
          </div>
        }
      >
        {children}
      </Suspense>
    </ScreenErrorBoundary>
  )
}
