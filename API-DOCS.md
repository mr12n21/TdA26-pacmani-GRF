# TdA Platform — API Documentation

> **Base URL:** `http://localhost:3000/api`  
> **Auth:** Bearer JWT token in `Authorization` header  
> **Namespace context:** `X-Namespace-Id` header (auto-injected by frontend)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Namespaces (Multi-tenancy)](#2-namespaces-multi-tenancy)
3. [Admin (SUPER_ADMIN)](#3-admin-super_admin)
4. [Courses](#4-courses)
5. [Modules](#5-modules)
6. [Materials](#6-materials)
7. [Quizzes](#7-quizzes)
8. [Participants](#8-participants)
9. [Statistics](#9-statistics)
10. [Feed](#10-feed)
11. [Health](#11-health)

---

## Role System

### Global Roles
| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform-wide administrator. Full access to everything. |
| `USER` | Regular user. Must join a namespace to do anything. |

### Namespace Roles
| Role | Description |
|------|-------------|
| `ORG_ADMIN` | Organization administrator. Manages members and settings. |
| `LECTURER` | Can create/manage courses, modules, quizzes. |
| `STUDENT` | Can view courses, take quizzes, join as participant. |

### Permission Hierarchy
`SUPER_ADMIN` bypasses all role checks. Within a namespace: `ORG_ADMIN > LECTURER > STUDENT`.

---

## 1. Authentication

### `POST /api/auth/register`
Create a new user account.

**Body:**
```json
{
  "name": "Jan Novák",
  "email": "jan@example.com",
  "password": "securePassword123"
}
```

**Response `201`:**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "jan@example.com",
    "name": "Jan Novák",
    "role": "STUDENT",
    "globalRole": "USER"
  },
  "message": "User registered successfully. Request membership to a namespace to start."
}
```

---

### `POST /api/auth/login`
Authenticate an existing user.

**Body:**
```json
{
  "email": "jan@example.com",
  "password": "securePassword123"
}
```
> Also accepts `username` or `identifier` instead of `email`.

**Response `200`:**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "jan@example.com",
    "name": "Jan Novák",
    "role": "STUDENT",
    "globalRole": "USER",
    "activeNamespaceId": "ns-uuid",
    "namespaceMemberRole": "LECTURER"
  },
  "namespaces": [
    { "id": "ns-uuid", "name": "Gymnázium Brno", "slug": "gym-brno", "role": "LECTURER" }
  ]
}
```

---

### `POST /api/auth/refresh`
Get a new access token using a refresh token.

**Body:**
```json
{ "refreshToken": "eyJhbG..." }
```

**Response `200`:**
```json
{
  "token": "eyJhbG...(new)",
  "refreshToken": "eyJhbG...(new)"
}
```

> **Note:** Send the old access token in `Authorization` header to preserve active namespace context.

---

### `GET /api/auth/me` 🔐
Get current user info with namespace memberships.

**Response `200`:**
```json
{
  "id": "uuid",
  "email": "jan@example.com",
  "name": "Jan Novák",
  "role": "STUDENT",
  "globalRole": "USER",
  "activeNamespaceId": "ns-uuid",
  "namespaceRole": "LECTURER",
  "namespaces": [
    {
      "namespace": { "id": "ns-uuid", "name": "Gymnázium Brno", "slug": "gym-brno", "status": "ACTIVE" },
      "role": "LECTURER"
    }
  ]
}
```

---

### `POST /api/auth/switch-namespace` 🔐
Switch active namespace. Returns new JWT tokens.

**Body:**
```json
{ "namespaceId": "ns-uuid" }
```

**Response `200`:**
```json
{
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { ... }
}
```

---

## 2. Namespaces (Multi-tenancy)

Namespaces are organizational units (schools, companies) that act as multi-tenant separators. All courses, members, and data are scoped within a namespace.

### `POST /api/namespaces/request` 🔐
Request creation of a new organization. Creates namespace with `PENDING` status — SUPER_ADMIN must approve.

**Body:**
```json
{
  "name": "Gymnázium Brno",
  "slug": "gym-brno",
  "description": "Optional description"
}
```

**Response `201`:**
```json
{
  "message": "Organization request submitted successfully",
  "namespace": { "id": "...", "name": "Gymnázium Brno", "slug": "gym-brno", "status": "PENDING" },
  "membership": { "id": "...", "role": "ORG_ADMIN", "status": "PENDING" }
}
```

---

### `POST /api/namespaces` 🔐 `SUPER_ADMIN`
Directly create an active namespace.

**Body:**
```json
{
  "name": "Nová škola",
  "slug": "nova-skola",
  "description": "Optional"
}
```

---

### `GET /api/namespaces` 🔐
List namespaces. SUPER_ADMIN sees all, regular users see their approved ones.

**Response `200`:**
```json
[
  {
    "id": "ns-uuid",
    "name": "Gymnázium Brno",
    "slug": "gym-brno",
    "status": "ACTIVE",
    "createdAt": "2026-01-15T10:00:00Z",
    "_count": { "members": 15, "courses": 3 }
  }
]
```

---

### `GET /api/namespaces/:namespaceId` 🔐
Get namespace detail with counts.

---

### `PATCH /api/namespaces/:namespaceId` 🔐 `SUPER_ADMIN`
Update namespace properties or status.

**Body:**
```json
{
  "name": "New Name",
  "status": "ACTIVE"
}
```
> Status options: `PENDING`, `ACTIVE`, `SUSPENDED`

---

### `DELETE /api/namespaces/:namespaceId` 🔐 `SUPER_ADMIN`
Delete a namespace and all its data.

---

### `GET /api/namespaces/:namespaceId/members` 🔐 `SUPER_ADMIN|ORG_ADMIN`
List all members of a namespace.

**Response `200`:**
```json
[
  {
    "id": "member-uuid",
    "userId": "user-uuid",
    "role": "LECTURER",
    "status": "APPROVED",
    "joinedAt": "2026-01-15T10:00:00Z",
    "user": { "id": "...", "name": "Jan Novák", "email": "jan@example.com" }
  }
]
```

---

### `POST /api/namespaces/:namespaceId/members` 🔐
Request membership in a namespace.

**Body:**
```json
{ "role": "STUDENT" }
```
> Role options: `ORG_ADMIN`, `LECTURER`, `STUDENT`

---

### `PATCH /api/namespaces/:namespaceId/members/:memberId` 🔐 `SUPER_ADMIN|ORG_ADMIN`
Approve, reject, or change role of a member.

**Body:**
```json
{ "status": "APPROVED" }
```
or
```json
{ "role": "LECTURER" }
```

---

### `DELETE /api/namespaces/:namespaceId/members/:memberId` 🔐 `SUPER_ADMIN|ORG_ADMIN`
Remove a member from namespace.

---

### `POST /api/namespaces/:namespaceId/invite` 🔐 `LECTURER|ORG_ADMIN`
Create an invite link for the organization.

**Body:**
```json
{
  "type": "PERSISTENT",
  "maxUses": 50,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```
> Type options: `ONE_TIME`, `PERSISTENT`

---

### `POST /api/invite/:token` 🔐
Join an organization via invite link. Auto-approves as STUDENT.

**Response `200`:**
```json
{
  "message": "Successfully joined organization",
  "membership": { ... },
  "namespace": { ... }
}
```

---

## 3. Admin (SUPER_ADMIN)

### `GET /api/admin/stats` 🔐 `ADMIN|LECTURER`
Get platform-wide statistics.

**Response `200`:**
```json
{
  "totalUsers": 42,
  "totalCourses": 15,
  "activeCourses": 5,
  "totalModules": 30,
  "totalMaterials": 120,
  "totalParticipants": 200,
  "totalQuizSubmissions": 450,
  "totalNamespaces": 4
}
```

---

### `GET /api/admin/stats/courses` 🔐 `ADMIN|LECTURER`
Advanced course statistics with filtering and sorting.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by title/description |
| `state` | string | Filter by course state (DRAFT/LIVE/etc.) |
| `sortBy` | string | `downloads`, `averageScore`, `successRate`, `linkOpens`, `sseConnected`, `createdAt` |
| `sortOrder` | string | `asc` or `desc` |
| `minDownloads` | number | Minimum download count |
| `minAverageScore` | number | Minimum average score |

**Response `200`:**
```json
{
  "summary": {
    "totalCourses": 15,
    "totalMaterialDownloads": 500,
    "totalLinkOpens": 200,
    "averageScore": 72,
    "averageSuccessRate": 65
  },
  "courses": [
    {
      "courseId": "uuid",
      "title": "Intro to CS",
      "state": "LIVE",
      "owner": { "id": "...", "name": "Lektor" },
      "modulesCount": 5,
      "participantsCount": 30,
      "materialDownloads": 45,
      "averageScore": 78,
      "successRate": 70,
      "linkOpens": 12,
      "sseConnected": 3
    }
  ]
}
```

---

### `GET /api/admin/users` 🔐 `SUPER_ADMIN`
List all users with pagination and filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by name/email |
| `role` | string | Filter: `SUPER_ADMIN` or `USER` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50, max: 100) |

**Response `200`:**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Jan Novák",
      "email": "jan@example.com",
      "globalRole": "USER",
      "createdAt": "2026-01-15T10:00:00Z",
      "_count": { "courses": 3, "namespaceMembers": 1 }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

---

### `GET /api/admin/users/:userId` 🔐 `SUPER_ADMIN`
Get detailed user info with namespace memberships.

---

### `PATCH /api/admin/users/:userId` 🔐 `SUPER_ADMIN`
Update user properties.

**Body:**
```json
{
  "name": "New Name",
  "email": "new@email.com",
  "globalRole": "SUPER_ADMIN",
  "password": "newPassword"
}
```

---

### `DELETE /api/admin/users/:userId` 🔐 `SUPER_ADMIN`
Delete a user. Cannot delete yourself.

---

### `GET /api/admin/documents` 🔐 `ADMIN`
List uploaded admin documents.

### `POST /api/admin/documents` 🔐 `ADMIN`
Upload a document (multipart/form-data, max 50MB). Field: `file`.

---

## 4. Courses

### `GET /api/courses`
List all visible courses. Public endpoint — no auth required.

---

### `POST /api/courses` 🔐
Create a new course. Requires active namespace context.

**Body:**
```json
{
  "title": "Úvod do programování",
  "description": "Základy algoritmů a datových struktur"
}
```

**Response `201`:**
```json
{
  "uuid": "course-uuid",
  "title": "Úvod do programování",
  "state": "DRAFT",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

---

### `GET /api/courses/:courseId`
Get course data. Access varies by role:
- **Lecturer/owner:** Full data including unrevealed modules
- **Student:** Only revealed modules (if LIVE)
- **Anonymous:** Basic info (if LIVE)

---

### `GET /api/courses/:courseId/full-data`
Get complete course data including all modules, materials, quizzes, feed.

---

### `PUT /api/courses/:courseId` 🔐
Update course (only in DRAFT state).

---

### `DELETE /api/courses/:courseId` 🔐 `LECTURER`
Delete a course (must be owner).

---

### State Transitions (all `POST`, 🔐 `LECTURER`)

| Endpoint | From → To | Body |
|----------|-----------|------|
| `/api/courses/:courseId/schedule` | DRAFT/PAUSED → SCHEDULED | `{ "startTime": "ISO 8601" }` |
| `/api/courses/:courseId/reschedule` | SCHEDULED → SCHEDULED | `{ "startTime": "ISO 8601" }` |
| `/api/courses/:courseId/start` | DRAFT/SCHEDULED → LIVE | — |
| `/api/courses/:courseId/pause` | LIVE → PAUSED | — |
| `/api/courses/:courseId/resume` | PAUSED → LIVE | — |
| `/api/courses/:courseId/archive` | LIVE/PAUSED → ARCHIVED | — |
| `/api/courses/:courseId/revert-to-draft` | SCHEDULED → DRAFT | — |
| `/api/courses/:courseId/duplicate` | any → DRAFT (copy) | — |

**State Machine Diagram:**
```
  DRAFT ──schedule──▶ SCHEDULED ──auto/start──▶ LIVE ──pause──▶ PAUSED
    ▲                     │                        │              │
    └──revert-to-draft────┘                        │              │
                                                   ▼              ▼
                                                ARCHIVED ◀──archive──┘
```

---

### `POST /api/courses/:courseId/like` 🔐
### `DELETE /api/courses/:courseId/like` 🔐
Like/unlike a course.

---

### SSE Streams

| Endpoint | Description |
|----------|-------------|
| `GET /api/courses/stream` | Course list changes (state transitions) |
| `GET /api/courses/:courseId/sse` | Course-specific events |

**SSE Events for course stream:**
- `state_changed` — Course state transitioned
- `module_revealed` / `module_hidden` — Module visibility changed
- `participant_joined` — New participant
- `quiz_result_updated` — New quiz submission
- `statistics_updated` — Stats refresh
- `new_post` — New feed post
- `connected` — Initial connection confirmation

---

## 5. Modules

All module endpoints: `/api/courses/:courseId/modules`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Optional | List modules (students see only revealed) |
| `GET` | `/:moduleId` | Optional | Get module detail |
| `POST` | `/` | Lecturer | Create module (DRAFT only) |
| `PUT` | `/:moduleId` | Lecturer | Update module (DRAFT only) |
| `DELETE` | `/:moduleId` | Lecturer | Delete module (DRAFT only) |
| `PATCH` | `/:moduleId/reorder` | Lecturer | Reorder: `{ "order": 2 }` |
| `POST` | `/:moduleId/reveal` | Lecturer | Show to students |
| `POST` | `/:moduleId/hide` | Lecturer | Hide from students |

**Create Module Body:**
```json
{
  "title": "Modul 1: Základy",
  "description": "Úvodní modul",
  "order": 0
}
```

---

## 6. Materials

Path: `/api/courses/:courseId/modules/:moduleId/materials`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | List materials |
| `POST` | `/` | Lecturer | Create material |
| `PUT` | `/:materialId` | Lecturer | Update |
| `DELETE` | `/:materialId` | Lecturer | Delete |
| `PATCH` | `/:materialId/reorder` | Lecturer | Reorder |

**Material Types:** `FILE`, `URL`, `VIDEO`, `TEXT`

**Create URL material:**
```json
{
  "type": "URL",
  "title": "Dokumentace",
  "url": "https://docs.example.com"
}
```

**Create FILE material:** Use `multipart/form-data` with `file` field + `type=FILE` + `title=Name`.

---

## 7. Quizzes

Path: `/api/courses/:courseId/modules/:moduleId/quizzes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | List quizzes |
| `POST` | `/` | Lecturer | Create quiz |
| `GET` | `/:quizId` | Public | Get quiz |
| `PUT` | `/:quizId` | Lecturer | Update quiz |
| `DELETE` | `/:quizId` | Lecturer | Delete quiz |
| `POST` | `/:quizId/submit` | Optional | Submit answers |

**Create Quiz Body:**
```json
{
  "title": "Závěrečný test",
  "description": "Test ze základů",
  "questions": [
    {
      "text": "Kolik je 2+2?",
      "type": "SINGLE_CHOICE",
      "choices": ["3", "4", "5", "6"],
      "correctAnswer": 1
    },
    {
      "text": "Je nebe modré?",
      "type": "TRUE_FALSE",
      "correctAnswer": true
    },
    {
      "text": "Hlavní město ČR?",
      "type": "TEXT",
      "correctAnswer": "Praha"
    },
    {
      "text": "Vyberte prvočísla:",
      "type": "MULTIPLE_CHOICE",
      "choices": ["2", "4", "5", "6", "7"],
      "correctAnswer": [0, 2, 4]
    }
  ]
}
```

**Question Types:**
| Type | `correctAnswer` format |
|------|----------------------|
| `SINGLE_CHOICE` | Index (number) of correct choice |
| `MULTIPLE_CHOICE` | Array of indices |
| `TRUE_FALSE` | boolean |
| `TEXT` | string (case-insensitive comparison) |

**Submit Quiz Body:**
```json
{
  "answers": [
    { "uuid": "question-id", "selectedIndex": 1 },
    { "uuid": "question-id", "selectedAnswer": true },
    { "uuid": "question-id", "textAnswer": "Praha" },
    { "uuid": "question-id", "selectedIndices": [0, 2, 4] }
  ]
}
```

**Submit Response `200`:**
```json
{
  "score": 75,
  "correctPerQuestion": [true, true, true, false],
  "participantId": "uuid"
}
```

---

## 8. Participants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/courses/:courseId/join` | Optional | Join course |
| `GET` | `/api/courses/:courseId/participants` | Lecturer | List participants |
| `PATCH` | `/api/courses/:courseId/participants/:pid` | Optional | Update nickname |

**Join Body:**
```json
{
  "nickname": "Honza",
  "anonymousId": "uuid (optional, for anonymous)"
}
```

**Participant Types:** `REGISTERED` (authenticated user) or `ANONYMOUS`.

---

## 9. Statistics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/courses/:courseId/stats` | Lecturer | Course stats overview |
| `GET` | `/api/courses/:courseId/stats/quiz-dashboard` | Lecturer | Detailed quiz analytics |
| `GET` | `/api/courses/:courseId/stats/leaderboard` | Optional | Participant leaderboard |
| `GET` | `/api/courses/:courseId/stats/participants/:pid` | Lecturer | Single participant progress |
| `GET` | `/api/courses/:courseId/stats/modules/:moduleId` | Lecturer | Module-level stats |

**Leaderboard Response:**
```json
[
  {
    "rank": 1,
    "participantId": "uuid",
    "nickname": "Honza",
    "totalScore": 285,
    "averageScore": 95,
    "quizzesCompleted": 3
  }
]
```

---

## 10. Feed

Path: `/api/courses/:courseId/feed`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | List feed posts |
| `POST` | `/` | — | Create manual post |
| `PUT` | `/:postId` | — | Update post |
| `DELETE` | `/:postId` | — | Delete post |
| `GET` | `/stream` | — | SSE stream for feed updates |

**Post Types:** `MANUAL` (user-created) or `AUTO` (system-generated).

**Create Post Body:**
```json
{ "content": "Vítejte v kurzu! 👋" }
```

**SSE Events:** `new_post`, `updated_post`, `deleted_post`

---

## 11. Health

### `GET /api/health`
Health check endpoint (no auth).

```json
{ "status": "ok", "db": "connected" }
```

### `GET /api`
Root API endpoint.

```json
{ "organization": "Student Cyber Games" }
```

---

## Error Responses

All errors follow this format:
```json
{
  "message": "Error description"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (duplicate, invalid state transition) |
| `500` | Internal server error |

---

## Token Storage (Frontend)

| Key | Storage | Purpose |
|-----|---------|---------|
| `tda_token` | localStorage | JWT access token |
| `tda_refresh_token` | localStorage | JWT refresh token |
| `tda_active_namespace` | localStorage | Active namespace ID |

The frontend auto-injects `Authorization: Bearer <token>` and `X-Namespace-Id` headers on every request. On 401, it transparently refreshes the token and retries.

---

## Backward-Compatible Flat Endpoints

For clients that don't use modules, these flat endpoints auto-create/resolve a default module:

| Method | Path |
|--------|------|
| `GET/POST` | `/api/courses/:courseId/materials` |
| `PUT/DELETE` | `/api/courses/:courseId/materials/:materialId` |
| `GET/POST` | `/api/courses/:courseId/quizzes` |
| `PUT/DELETE` | `/api/courses/:courseId/quizzes/:quizId` |
| `POST` | `/api/courses/:courseId/quizzes/:quizId/submit` |
