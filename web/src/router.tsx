import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Login } from './screens/Login'
import { ChoosePanel } from './screens/ChoosePanel'
import { JoinByLink } from './screens/JoinByLink'
import { JoinSchool } from './screens/JoinSchool'
import { RequireRole } from './components/routing/RequireRole'
import { RequireModerator } from './components/routing/RequireModerator'
import { RequireSchoolAdmin } from './components/routing/RequireSchoolAdmin'
import { Screen, StudentDashboard, Lessons, Recording, Feedback, Profile, WorldPicker, TeacherDashboard, Students, Grading, Classrooms, TeacherProfile, Settings, TeacherSettings, Classes, StudentCard, Queue, Playground, SchoolAdmin } from './screens.lazy'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/panel', element: <ChoosePanel /> },
  { path: '/pripojit/:code', element: <JoinByLink /> },
  { path: '/skola/:code', element: <JoinSchool /> },
  {
    path: '/student',
    element: (
      <RequireRole role="student">
        <Screen><StudentDashboard /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/lessons',
    element: (
      <RequireRole role="student">
        <Screen><Lessons /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/recording',
    element: (
      <RequireRole role="student">
        <Screen><Recording /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/feedback',
    element: (
      <RequireRole role="student">
        <Screen><Feedback /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/profile',
    element: (
      <RequireRole role="student">
        <Screen><Profile /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/classes',
    element: (
      <RequireRole role="student">
        <Screen><Classes /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/svet',
    element: (
      <RequireRole role="student">
        <Screen><WorldPicker /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/student/settings',
    element: (
      <RequireRole role="student">
        <Screen><Settings /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher',
    element: (
      <RequireRole role="teacher">
        <Screen><TeacherDashboard /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/students',
    element: (
      <RequireRole role="teacher">
        <Screen><Students /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/students/:id',
    element: (
      <RequireRole role="teacher">
        <Screen><StudentCard /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/grading',
    element: (
      <RequireRole role="teacher">
        <Screen><Grading /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/classrooms',
    element: (
      <RequireRole role="teacher">
        <Screen><Classrooms /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/profile',
    element: (
      <RequireRole role="teacher">
        <Screen><TeacherProfile /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/teacher/settings',
    element: (
      <RequireRole role="teacher">
        <Screen><TeacherSettings /></Screen>
      </RequireRole>
    ),
  },
  {
    path: '/sprava-skoly',
    element: (
      <RequireSchoolAdmin>
        <Screen><SchoolAdmin /></Screen>
      </RequireSchoolAdmin>
    ),
  },
  {
    path: '/moderator',
    element: (
      <RequireModerator>
        <Screen><Queue /></Screen>
      </RequireModerator>
    ),
  },
  {
    path: '/moderator/playground',
    element: (
      <RequireModerator>
        <Screen><Playground /></Screen>
      </RequireModerator>
    ),
  },
  {
    path: '/moderator/students/:id',
    element: (
      <RequireModerator>
        <Screen><StudentCard asAdmin /></Screen>
      </RequireModerator>
    ),
  },
])
