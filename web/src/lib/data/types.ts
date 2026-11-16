export type UserRole = 'student' | 'teacher' | 'moderator'

export interface Profile {
  id: string
  full_name: string
  username: string | null
  // Given by hand by the teacher (concerts, challenges) - see migration 0024.
  stars: number
  streak: number
  // Earned from graded recordings, drives the level. Kept up to date by a
  // trigger (migration 0024); absent before it is applied.
  xp?: number
  role: UserRole
  // Student registration requires teacher approval; other roles ignore this.
  is_approved: boolean
  // Generic account ban, any role.
  is_banned: boolean
  // Teacher identity verification (spec 5.5). Absent until migration 0003 is
  // applied - treat as unverified if so.
  is_verified?: boolean
  // GDPR consent (spec 1.3). Absent until migration 0006 is applied.
  date_of_birth?: string | null
  consent_given?: boolean
  consent_guardian_name?: string | null
  consent_given_at?: string | null
  // Moderator access, independent of role - a teacher can also hold this.
  // Absent until migration 0012 is applied.
  is_moderator?: boolean
  // Opt-in for a teacher to see this student's non-assigned practice logs
  // (spec 5.3). Absent until migration 0014 is applied.
  share_basic_progress?: boolean
  // Streak freeze bookkeeping (spec 4.3). Absent until migration 0015 is
  // applied.
  streak_freezes_available?: number
  last_practice_date?: string | null
}

export interface Classroom {
  id: string
  teacher_id: string
  name: string
  join_code: string
  created_at: string
}

export interface Assignment {
  id: string
  classroom_id: string
  teacher_id: string
  title: string
  description: string | null
  created_at: string
  // Teacher's real name, filled in client-side for students only
  // (fetchStudentAssignments). Never the username.
  teacher_name?: string | null
  // Optional score (MIDI / MusicXML) for practising in Keyboard Utils: its
  // storage key and its original file name. Absent until migration 0023.
  attachment_path?: string | null
  attachment_name?: string | null
  // Deadline, a day ("YYYY-MM-DD"), or none. Absent until migration 0036.
  due_date?: string | null
}

export interface PracticeLog {
  id: string
  user_id: string
  created_at: string
  // null once the sound was cleared out (migration 0034); the row stays.
  audio_url: string | null
  audio_removed_at?: string | null
  teacher_comment: string | null
  rating: number | null
  feedback_good: string | null
  feedback_improve: string | null
  // Absent until migration 0009 is applied.
  assignment_id?: string | null
  // Absent until migration 0011 is applied; null for anything graded before it.
  graded_by?: string | null
  // Length measured by the app on upload (migration 0024); null for older ones.
  duration_seconds?: number | null
  // Storage paths of the teacher's pictures, at most 3 (migration 0026).
  feedback_images?: string[] | null
  // The teacher's spoken comment, a storage path (migration 0037).
  feedback_audio?: string | null
  // The pupil's own piece this recording is for (migration 0039).
  own_piece_id?: string | null
  // A note from the pupil sent with the recording (migration 0036).
  student_note?: string | null
  // When the pupil opened the grade (migration 0036); null = new for them.
  feedback_seen_at?: string | null
}

// A badge the teacher gave while grading a recording (migration 0025).
export interface AwardedBadge {
  id: string
  student_id: string
  practice_log_id: string | number
  badge_id: 'maly-virtuoz' | 'virtuoz'
  awarded_by: string
  created_at: string
}

export interface ReportedContent {
  id: string
  reporter_id: string
  reported_user_id: string | null
  practice_log_id: string | null
  reason: string
  description: string | null
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_note: string | null
}
