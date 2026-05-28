# Frontend Integration Handoff

## Purpose

This document is for web frontend integration with the current backend state.

## Auth and Roles

- Login endpoint:
  - `POST /auth/login`
- Admin login endpoint:
  - `POST /auth/admin/login`
- Both responses include:
  - `token`
  - `refreshToken`
  - `expiresIn`
  - `user.role`

Recommended frontend behavior:

- Show admin UI only when `user.role` is `operator` or `super_admin`.
- Always rely on backend authorization as final source of truth.

## Admin APIs

All admin APIs require:

- `Authorization: Bearer <admin_token>`

### Admin Identity

- `GET /admin/me`
- `POST /admin/agent-token` (super admin only)
  - Optional body:
    - `{ "expiresInSeconds": 3600 }`
  - Range:
    - `300..86400`

### User Management

- `GET /admin/users?limit=50&offset=0`
- `GET /admin/users/{user_id}`

Use case:

- List page uses `/admin/users`
- Detail drawer/page uses `/admin/users/{user_id}`

### Route Controls

- `GET /admin/route-controls`
- `PATCH /admin/route-controls/{route_key}`
  - body:
    - `{ "isEnabled": false, "reason": "maintenance" }`

Response includes:

- `routeKey`
- `isEnabled`
- `reason`
- `isProtected`
- `updatedBy`
- `updatedAt`

If a controlled route is disabled, that route returns:

- `503 Service Unavailable`

### Announcements

- `GET /admin/announcements?limit=50&offset=0`
- `POST /admin/announcements`
- `PATCH /admin/announcements/{id}`
- `POST /admin/announcements/{id}/publish`
- `POST /admin/announcements/{id}/archive`

Public display endpoint:

- `GET /announcements/current`

### RAG Documents

- `POST /admin/rag/documents` (multipart)
  - file field name:
    - `file`
  - optional:
    - `embeddingModel`
- `GET /admin/rag/documents?limit=50&offset=0`
- `GET /admin/rag/documents/{id}`
- `POST /admin/rag/documents/{id}/reindex`
- `DELETE /admin/rag/documents/{id}`

Upload constraints:

- extensions:
  - `pdf`, `txt`, `md`, `docx`
- size limit:
  - 20MB

RAG status fields for UI:

- `status`
- `retryCount`
- `nextRetryAt`
- `processingStartedAt`
- `lastErrorAt`
- `errorMessage`

Recommended UI states:

- uploaded: waiting in queue
- processing: currently being handled
- ready: completed
- failed: retry exhausted or hard failure

## Chat Proxy

- Endpoint:
  - `POST /chat` (same as proxy chat)
- Frontend must send user JWT.
- Backend forwards the same `Authorization` header to agent service.

## Error Handling Baseline

Common statuses:

- `401` missing/invalid token
- `403` permission denied
- `404` resource not found
- `422` invalid input
- `500` internal error
- `503` route disabled by admin control

## Frontend Checklist

1. Persist `token`, `refreshToken`, `expiresIn`, `user.role` after login.
2. Add admin route guard by role.
3. Build admin user list and user detail views.
4. Build route-control toggle UI with disabled state for protected keys.
5. Build announcement CRUD + publish/archive controls.
6. Build RAG upload/list/detail/reindex/delete views.
7. Show retry/timeout metadata on RAG job cards.
8. Use `/announcements/current` for public banner/notice area.
