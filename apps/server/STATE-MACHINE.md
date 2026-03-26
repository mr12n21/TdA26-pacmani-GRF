# Course State Machine

## States

| State       | Description                                          | Editable | Students Can View | Students Can Join SSE |
|-------------|------------------------------------------------------|----------|-------------------|-----------------------|
| `DRAFT`     | Initial/default. Content editing happens here.       | ✅        | ❌                 | ❌                     |
| `SCHEDULED` | Pre-live. Course planned with a start time.          | ❌        | ✅ (limited info)  | ❌                     |
| `LIVE`      | Active teaching. Real-time module delivery via SSE.  | ❌        | ✅                 | ✅ (anonymous)         |
| `PAUSED`    | Temporary interruption during active phase.          | ❌        | ❌                 | ❌                     |
| `ARCHIVED`  | Final, read-only. No further transitions.            | ❌        | ❌                 | ❌                     |

## State Flow (ASCII)

```
             ┌──────────────────────────────────────────────────────────┐
             │                                                          │
    ┌────────▼────────┐      schedule        ┌───────────┐              │
    │                 │ ──────────────────► │ SCHEDULED │              │
    │      DRAFT      │                      │           │              │
    │  (editable)     │ ◄────────────────── │           │              │
    │                 │   cancel / revert    │           │              │
    └────────┬────────┘                      └─────┬─────┘              │
             │                                     │                    │
             │  manual start                       │  auto/manual start │
             │                                     │                    │
             └──────────────┬──────────────────────┘                    │
                            │                                           │
                            ▼                                           │
                    ┌───────────────┐                                    │
                    │               │                                    │
                    │     LIVE      │ ── end/archive ──► ARCHIVED       │
                    │  (teaching)   │                                    │
                    │               │                                    │
                    └───────┬───────┘                                    │
                            │                                           │
                         pause                                          │
                            │                                           │
                    ┌───────▼───────┐                                    │
                    │               │                                    │
                    │    PAUSED     │ ── archive ──────► ARCHIVED       │
                    │               │                                    │
                    │               │ ── reschedule ──► SCHEDULED       │
                    └───────┬───────┘                                    │
                            │                                           │
                         resume                                         │
                            │                                           │
                            └───────────────► LIVE                      │
```

## Transitions Table

| Action          | From State(s)       | To State    | Requirements                             |
|-----------------|---------------------|-------------|------------------------------------------|
| `schedule`      | DRAFT, PAUSED       | SCHEDULED   | name, description, future startTime      |
| `reschedule`    | SCHEDULED           | SCHEDULED   | future startTime                         |
| `cancel`        | SCHEDULED           | DRAFT       | —                                        |
| `revertToDraft` | SCHEDULED           | DRAFT       | —                                        |
| `start`         | DRAFT, SCHEDULED    | LIVE        | name, description                        |
| `pause`         | LIVE                | PAUSED      | —                                        |
| `resume`        | PAUSED              | LIVE        | —                                        |
| `archive`       | LIVE, PAUSED        | ARCHIVED    | —                                        |
| `duplicate`     | any except ARCHIVED | DRAFT (new) | owner only                               |

## Roles

- **Lecturer**: Full control — create, edit, transitions, manage live sessions, deliver modules.
- **Student**: View SCHEDULED info, join LIVE via SSE anonymously, receive module pushes.

## API Endpoints

### State Transitions (all require `LECTURER` auth)

| Method | Path                                | Action         |
|--------|-------------------------------------|----------------|
| POST   | `/api/courses/:id/schedule`         | Schedule       |
| POST   | `/api/courses/:id/reschedule`       | Reschedule     |
| POST   | `/api/courses/:id/revert-to-draft`  | Revert to Draft|
| POST   | `/api/courses/:id/start`            | Manual Start   |
| POST   | `/api/courses/:id/pause`            | Pause          |
| POST   | `/api/courses/:id/resume`           | Resume         |
| POST   | `/api/courses/:id/archive`          | Archive        |
| POST   | `/api/courses/:id/duplicate`        | Duplicate      |

### Modules (CRUD requires `LECTURER` auth; list/get is public)

| Method | Path                                         | Action          |
|--------|----------------------------------------------|-----------------|
| GET    | `/api/courses/:id/modules`                   | List modules    |
| GET    | `/api/courses/:id/modules/:moduleId`         | Get module      |
| POST   | `/api/courses/:id/modules`                   | Create module   |
| PUT    | `/api/courses/:id/modules/:moduleId`         | Update module   |
| DELETE | `/api/courses/:id/modules/:moduleId`         | Delete module   |
| POST   | `/api/courses/:id/modules/:moduleId/deliver` | Deliver via SSE |

### Real-Time & Offline

| Method | Path                             | Description                              |
|--------|----------------------------------|------------------------------------------|
| GET    | `/api/courses/:id/sse`           | SSE stream (anonymous for students)      |
| GET    | `/api/courses/:id/full-data`     | Full course data for offline caching     |
| GET    | `/api/courses/:id/updates?since=`| Changes since timestamp for sync         |

## SSE Events

| Event              | Payload                              | When                                     |
|--------------------|--------------------------------------|------------------------------------------|
| `connected`        | clientId, role, courseState, count    | On SSE connection                        |
| `state_changed`    | courseId, state, extra               | Any state transition                     |
| `module_delivered`  | moduleId, title, content, order      | Lecturer pushes a module                 |
| `student_joined`   | anonymousCount                       | Student connects to SSE                  |
| `student_left`     | anonymousCount                       | Student disconnects from SSE             |
| `new_post`         | feed post data                       | New feed post                            |
| `updated_post`     | feed post data                       | Feed post edited                         |
| `deleted_post`     | { uuid }                             | Feed post deleted                        |
