export interface User {
  id: string
  role: 'STUDENT' | 'LECTURER' | 'ADMIN'
  name: string
  email: string
}

export type CourseState = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'ARCHIVED'

export interface CourseSummary {
  uuid: string
  id?: string
  title: string
  description?: string
  state: CourseState
  scheduledStart?: string | null
  isDuplicate?: boolean
  createdAt?: string
  updatedAt?: string
  ownerId?: string
}

export interface CourseModule {
  id: string
  uuid?: string
  courseId: string
  title: string
  description?: string
  content?: string
  order: number
  isRevealed?: boolean
  materials?: Material[]
  quizzes?: Quiz[]
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: string
  moduleId: string
  type: 'FILE' | 'URL' | 'VIDEO' | 'TEXT'
  title: string
  description?: string
  url?: string
  filePath?: string
  fileMime?: string
  fileSize?: number
  order: number
  createdAt: string
}

export interface Quiz {
  id: string
  moduleId: string
  title: string
  description?: string
  timesTaken: number
  questions?: Question[]
  createdAt: string
}

export interface Question {
  id: string
  text: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TEXT' | 'TRUE_FALSE'
  choices?: string[]
  correctAnswer?: any
}

export interface FeedItem {
  uuid: string
  id?: string
  type: 'MANUAL' | 'AUTO' | 'manual' | 'system'
  message?: string
  content?: string
  edited?: boolean
  createdAt: string
  updatedAt?: string
  author?: { name: string }
}

export interface CourseDetail extends CourseSummary {
  materials?: Material[]
  modules?: CourseModule[]
  quizzes?: Quiz[]
  feed?: FeedItem[]
}

export interface Participant {
  id: string
  courseId: string
  type: 'REGISTERED' | 'ANONYMOUS'
  nickname?: string
  userId?: string
  joinedAt: string
}
