# Admin Panel Project

## Overview
This project is a full-stack admin platform for managing users, courses, and course content, with role-based access, JWT authentication, dashboard analytics, and user-centric features such as enrollments and favorites.

Over the course of the challenge, the platform evolved from a base CRUD panel into a more production-oriented solution with:
- Manual/interaction-based data refresh (no forced 1-second polling)
- Advanced filtering/sorting/pagination
- Course image upload and edition workflow (drag and drop)
- Course enrollment and favorites for end users
- Role-aware dashboard UX
- Dedicated profile update flow through sidebar settings
- End-to-end audit logging (backend + frontend)

---

## Assumptions
- A user has exactly one role.
- Main domain entities are `Users`, `Courses`, and `Contents`.
- A `Course` can contain multiple `Contents`.
- Auth is cookie + JWT based (access token + refresh token).

---

## Tech Stack
1. **Backend**: NestJS + TypeORM
2. **Frontend**: React + React Query + React Hook Form
3. **Database**: PostgreSQL
4. **Containerization**: Docker + Docker Compose
5. **Testing**: Jest (unit), Newman/Postman collection (API e2e)

---

## Authentication & Session Model
- Access token lifetime: **15 minutes**
- Refresh token lifetime: **1 year**
- Refresh token is stored in an **HTTP-only cookie**
- Refresh flow is protected and validated before issuing new access tokens
- Invalid refresh scenarios are rejected and logged

### First Login Seed
When `SEED_ADMIN_ON_BOOT=true`, the app creates an admin user if it does not exist:
- **username**: `admin`
- **password**: `admin123`

---

## Roles & Permissions
### Admin
| Resource | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | ✓ (all) | ✓ | ✓ (all) | ✓ |
| Courses | ✓ | ✓ | ✓ | ✓ |
| Contents | ✓ | ✓ | ✓ | ✓ |
| Enrollments | ✓ (own action) | ✓ | ✓ (unenroll) | - |
| Favorites | - | - | - | - |
| Audit Logs | ✓ (all users) | - | - | - |

### Editor
| Resource | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | ✓ (list) + self details | - | self only | - |
| Courses | ✓ | ✓ | ✓ | - |
| Contents | ✓ | ✓ | ✓ | - |
| Enrollments | ✓ (own action) | ✓ | ✓ (unenroll) | - |
| Favorites | - | - | - | - |
| Audit Logs | ✓ (own only) | - | - | - |

### User
| Resource | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | self only | - | self only | - |
| Courses | ✓ | - | - | - |
| Contents | ✓ | - | - | - |
| Enrollments | ✓ (own action) | ✓ | ✓ (unenroll) | - |
| Favorites | ✓ (own action) | ✓ | ✓ (unfavorite) | - |
| Audit Logs | ✓ (own only) | - | - | - |

---

## Feature Documentation (Challenge Scope)

## 1) Course Image Management (Add/Edit/Remove)
Implemented for course creation and update.

### UX/UI behavior
- Drag-and-drop image area in course modals
- Image preview before save
- Replace image action
- Remove image action
- Validation hints for accepted formats and size

### Technical behavior
- Supported formats: `JPG`, `PNG`, `WEBP`
- Max file size: `5MB`
- Images are stored under backend uploads and served statically via `/api/uploads/...`
- Update supports:
  - replacing existing image
  - removing existing image (`removeImage=true`)

---

## 2) Favorites (User only)
Users can manage a personal favorites list for courses.

### Endpoints
- `POST /api/courses/:id/favorite`
- `DELETE /api/courses/:id/favorite`

### Data model
- Pivot table: `user_favorites`
- Unique pair enforced: `(userId, courseId)`

### UX/UI
- Heart button per course row
- Visual state for favorited/non-favorited
- Filter option in courses page: `All` / `My Favorites`
- Dashboard section `My Favorites` for users

---

## 3) Enrollments (User + Editor + Admin action)
Users can enroll/unenroll from courses and clearly see enrollment status.

### Endpoints
- `POST /api/courses/:id/enrollment`
- `DELETE /api/courses/:id/enrollment`

### Data model
- Pivot table: `course_enrollment`
- Unique pair enforced: `(userId, courseId)`

### UX/UI
- Per-course CTA toggles between `Enroll` and `Unenroll`
- Status badge in course rows: `Enrolled` / `Not enrolled`
- Dashboard “What’s New” shows enrolled count per course
- Course contents header shows total enrolled users

---

## 4) Filtering, Sorting, Pagination (Users/Courses/Contents)
Implemented in backend queries and frontend controls.

### Capabilities
- Text filters (name/description/username/role depending on page)
- Sort by allowed fields
- Sort order: `ASC` / `DESC`
- Server-side pagination with total count

### UX/UI
- Compact filter controls
- Page navigation (`Prev` / `Next`)
- Consistent footer indicators (`Page X of Y | Total: Z`)

---

## 5) Data Fetch Strategy Improvement
Original behavior with frequent automatic polling was replaced.

### What changed
- Removed continuous 1-second auto-refresh pattern
- Data updates now happen by:
  - explicit refresh button
  - user filter interaction (query key changes)
  - targeted refetch/invalidation after mutations

### Benefit
- Lower backend load
- Better UI stability (reduced flicker)
- More predictable user-driven updates

---

## 6) Dashboard Enhancements by Role
Dashboard now adapts based on role and context.

### Behavior
- User role: cards layout optimized for two primary metrics (`Courses`, `Contents`), plus:
  - `What's New` list
  - `My Favorites` list
- Admin/Editor roles:
  - Global stats cards
  - `What's New` overview

### Additional visual improvements
- Course thumbnails in lists
- Enrollment count badges per course

---

## 7) Profile Update Flow from Sidebar Settings
Credential/personal data editing is now accessible from a dedicated UI entry point.

### UX/UI
- Gear icon in sidebar
- Opens `Update Data` modal
- Inline validation/error feedback

### Functional scope
- User can update own first name, last name, username, and optional password
- Authenticated user state is refreshed after successful update

---

## 8) Audit Logs (Backend + Frontend)
Implemented as a full feature to provide traceability and operational transparency.

### Backend
- New module: `audit-log`
- Entity: `audit_logs`
- Protected endpoints:
  - `GET /api/audit-logs`
  - `GET /api/audit-logs/:id`

### Access control
- `admin`: sees all logs
- `editor` and `user`: see only their own logs

### Logged events (examples)
- Auth: login/logout/refresh/refresh fail
- Users: create/update/delete/role change
- Courses: create/update/delete
- Contents: create/update/delete
- Enrollment: enroll/unenroll
- Favorites: favorite/unfavorite

### Frontend
- Dedicated `Audit Logs` page
- Filters by user, activity, area, status, date range, and reference id
- Pagination and manual refresh
- Human-readable labels for non-technical users
- Metadata section for additional context

---

## Frontend UX/UI Notes
- Brand palette and typography are centralized in `frontend/src/styles/index.css`
- Sidebar and headers were refined for consistency across `Dashboard`, `Users`, `Courses`, and `Contents`
- Main page branding placement was standardized
- Key flows use clear statuses, compact actions, and responsive behavior for desktop/mobile

---

## API Highlights
### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

### Users
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Courses
- `POST /api/courses`
- `GET /api/courses`
- `GET /api/courses/:id`
- `PUT /api/courses/:id`
- `DELETE /api/courses/:id`
- `POST /api/courses/:id/enrollment`
- `DELETE /api/courses/:id/enrollment`
- `POST /api/courses/:id/favorite`
- `DELETE /api/courses/:id/favorite`

### Contents
- `POST /api/courses/:id/contents`
- `GET /api/courses/:id/contents`
- `PUT /api/courses/:id/contents/:contentId`
- `DELETE /api/courses/:id/contents/:contentId`

### Stats
- `GET /api/stats`

### Audit Logs
- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`

---

## Setup
## Deploy with Docker
From project root:
```bash
docker compose up -d --build
```

Application URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Swagger: `http://localhost:5000/api/docs`

## Run Locally
### Backend
```bash
cd backend
yarn
yarn start
```
Backend: `http://localhost:5000`

### Frontend
```bash
cd frontend
yarn
yarn start
```
Frontend: `http://localhost:3000`

Note: for some local Node/OpenSSL combinations, production build may require:
```bash
NODE_OPTIONS=--openssl-legacy-provider yarn build
```

---

## Environment Variables
Use `.env.example` as base and define values in `.env`.
Important keys include:
- Database credentials and host/port
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `SEED_ADMIN_ON_BOOT`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `REACT_APP_API_URL`

---

## Testing
### Unit tests (backend)
```bash
cd backend
yarn test
```

### API e2e (Newman)
```bash
cd backend
yarn test:e2e
```

---

## Deliverable Summary for Evaluation
This challenge implementation now covers:
- Robust authentication/session lifecycle
- Role-based permissions with practical UX
- Rich CRUD plus media upload workflows
- Enrollment and favorites user journeys
- Filter/sort/pagination across core modules
- User-driven refresh strategy (no aggressive polling)
- Role-aware dashboard and profile editing flow
- Production-style audit logging with secure visibility rules
