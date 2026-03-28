export interface User {
  id: string
  role: 'STUDENT' | 'LECTURER' | 'ADMIN' // @deprecated - use globalRole and namespaceRole
  name: string
  email: string
  globalRole: 'SUPER_ADMIN' | 'USER'
  activeNamespaceId?: string
  namespaceRole?: 'ORG_ADMIN' | 'LECTURER' | 'STUDENT'
  namespaces?: NamespaceMembership[]
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
  isVisible: boolean
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

// ─── Namespace Types ─────────────────────────────────────────────────

export interface Namespace {
  id: string
  name: string
  slug: string
  description?: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  _count?: {
    members?: number
  }
}

export interface NamespaceMember {
  id: string
  userId: string
  namespaceId: string
  role: 'ORG_ADMIN' | 'LECTURER' | 'STUDENT'
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  joinedAt: string
  approvedAt?: string
  user?: User
}

export interface InviteLink {
  id: string
  courseId: string
  namespaceId: string
  token: string
  type: 'ONE_TIME' | 'PERSISTENT'
  expiresAt?: string
  usedCount: number
  maxUses?: number
  createdById: string
  createdAt: string
}

export interface NamespaceMembership {
  namespace: Namespace
  role: 'ORG_ADMIN' | 'LECTURER' | 'STUDENT'
}
