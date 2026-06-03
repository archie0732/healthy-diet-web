# Backend Feature Gap Plan

Date: 2026-06-03

This document compares the current frontend implementation in `healthy-diet-web` against the current backend contract in `openapi.yml`.

Purpose:

- show which backend capabilities are already consumed by the frontend
- show which routes the frontend expects but `openapi.yml` does not currently document
- show which routes exist in `openapi.yml` but still have no corresponding frontend flow
- give a practical backend priority list for the next iteration

## Summary

Current integration is in three states:

1. Stable and already wired in frontend
2. Frontend depends on it, but route naming/spec is inconsistent
3. OpenAPI exposes it, but frontend has not built a full flow yet

The most important backend work is not broad new functionality first. The first priority is to close the contract mismatch around chat approval, admin APIs, and system health endpoints so frontend and backend stop drifting.

## A. Frontend Already Uses These Routes

These are actively consumed by the frontend today.

### Auth and Profile

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/admin/login`  
  Note: frontend uses this, but it is not currently present in `openapi.yml`.
- `GET /user/profile`
- `PUT /user/profile`

### Diet and Dashboard

- `GET /diet_record`
- `POST /diet`
- `POST /diet_image`
- `POST /record`
- `GET /month_stats`
- `GET /proxy_chat_check`
- `GET /gemma4/health`  
  Note: frontend uses this, but it is not currently present in `openapi.yml`.

### News and Knowledge

- `GET /api/news`
- `GET /api/news/{id}`
- `GET /api/news-files`
- `POST /api/news/sync`
- `GET /api/rag/search`
- `POST /api/rag/search`

### Chat

- `GET /chat_room_titles`
- `GET /chat_rooms`
- `GET /room_history/{room_id}`
- `POST /api/chat`  
  Note: frontend currently calls `/api/chat`, but `openapi.yml` documents `POST /proxy_chat`.
- `POST /api/approve`  
  Note: frontend currently calls `/api/approve`, but `openapi.yml` documents `POST /agent_approve`.

### Admin

- `GET /admin/me`  
  Not currently present in `openapi.yml`.
- `GET /admin/users`
- `GET /admin/users/{user_id}`
- `GET /admin/route-controls`
- `PATCH /admin/route-controls/{route_key}`
- `GET /admin/announcements`
- `POST /admin/announcements`
- `PATCH /admin/announcements/{id}`
- `POST /admin/announcements/{id}/publish`
- `POST /admin/announcements/{id}/archive`
- `GET /admin/rag/documents`
- `POST /admin/rag/documents`
- `GET /admin/rag/documents/{document_id}`
- `DELETE /admin/rag/documents/{document_id}`
- `POST /admin/rag/documents/{document_id}/reindex`

## B. Frontend Expects These, But OpenAPI Is Missing or Mismatched

These are the highest-value backend/spec alignment items.

### 1. Chat endpoint naming mismatch

Frontend currently sends chat to:

- `POST /api/chat`

But `openapi.yml` documents:

- `POST /proxy_chat`

Backend options:

- add `/api/chat` as the official alias
- or change frontend to use `/proxy_chat`
- or keep both temporarily, but document one canonical route

Recommendation:

- prefer one canonical route
- if keeping legacy compatibility, support both and mark one deprecated in docs

### 2. Approval endpoint naming mismatch

Frontend currently sends approval actions to:

- `POST /api/approve`

But `openapi.yml` documents:

- `POST /agent_approve`

Recommendation:

- backend should expose one stable route
- if frontend compatibility matters, add `/api/approve` alias or change frontend and docs together

### 3. Admin login not documented

Frontend uses:

- `POST /auth/admin/login`

This route is required for the admin console to work, but it is absent from `openapi.yml`.

Recommendation:

- add this route to `openapi.yml`
- clearly document response shape and role requirements

### 4. Admin identity route not documented

Frontend uses:

- `GET /admin/me`

This is needed by the admin home page to confirm admin identity and role.

Recommendation:

- add `GET /admin/me` to backend spec if it is a supported route
- if not supported, either implement it or switch frontend to another documented admin identity route

### 5. Gemma health route not documented

Frontend dashboard uses:

- `GET /gemma4/health`

This route is absent from `openapi.yml`.

Recommendation:

- either implement and document `/gemma4/health`
- or remove the frontend dependency

### 6. Public announcement fallback route mismatch

Frontend dashboard tries:

- `GET /api/announcements/current`
- fallback: `GET /api/notifications/current`

But the current `openapi.yml` snapshot does not document either route.

Recommendation:

- define one canonical public announcement endpoint
- remove the fallback route if it is legacy and no longer supported

### 7. RAG document delete path parameter naming bug in spec

In `openapi.yml`, this path is documented:

- `/api/admin/rag/documents/{document_id}`

But the `delete` operation parameter is named:

- `id`

instead of:

- `document_id`

This is a spec bug even if the runtime route works.

Recommendation:

- fix OpenAPI parameter name to `document_id`

## C. OpenAPI Routes That Exist But Frontend Does Not Fully Use Yet

These are good candidates for backend enhancement or follow-up frontend work.

### 1. RAG document file and preview flow

Documented in `openapi.yml`:

- `GET /api/admin/rag/documents/{document_id}/file`
- `GET /api/admin/rag/documents/{document_id}/preview`
- `GET /api/rag/sources/{document_id}/file`
- `GET /api/rag/sources/{document_id}/preview`

Frontend status:

- admin page now exposes raw links for file and preview
- there is not yet a polished in-app preview experience
- public user-facing source preview flow is not built yet

Backend suggestions:

- ensure preview responses are stable for `pdf`, `txt`, `md`, `docx`
- make preview payloads consistent enough for a dedicated frontend preview modal

### 2. Room history detail by index

Documented:

- `GET /room_history/{room_id}/index/{index}`

Frontend status:

- frontend currently uses room history list
- no dedicated UI yet for single-history detail by index

Backend suggestions:

- keep this route stable
- ensure detail payload is rich enough to support a future “message inspection” UI

### 3. Discord OAuth flow

Documented:

- `GET /auth/discord/login`
- `GET /auth/discord/callbck`

Frontend status:

- no visible frontend flow is currently wired for Discord login

Backend suggestions:

- only prioritize this if Discord auth is still product-relevant

### 4. System informational endpoints

Documented:

- `GET /`
- `GET /ping`
- `GET /health`

Frontend status:

- no dedicated UI page uses these directly

Backend suggestions:

- these are useful for deployment, uptime, and admin diagnostics
- consider adding richer metadata to `/health` if operational monitoring matters

## D. Backend Behavior Gaps, Not Just Route Gaps

These are important because a route can exist but still fail the frontend flow.

### 1. RAG reindex downstream integration is still failing

Observed frontend error:

- `Agent returned 404: Cannot POST /api/rag/process`

Meaning:

- the admin reindex route exists
- but the downstream agent route it depends on is still wrong, missing, or version-mismatched

Backend work needed:

- verify the actual downstream agent endpoint
- align runtime config and OpenAPI expectations
- ensure `reindex` returns structured JSON errors, not HTML passthrough where possible

### 2. Proxy/API consistency

The project currently has a mix of:

- `/api/...`
- `/proxy_chat`
- `/agent_approve`
- plain `/chat_rooms`
- plain `/room_history/...`

This increases integration friction.

Backend work needed:

- normalize route naming strategy
- decide which routes are public app routes vs backend proxy routes
- document the decision clearly in OpenAPI

### 3. Error payload consistency

Frontend already handles JSON error payloads well, but some failures still return HTML or raw text.

Backend work needed:

- standardize error payload shape across proxy/downstream failures
- prefer `{ error, message?, code?, details? }`
- avoid returning raw HTML from downstream failures when possible

## E. Priority Recommendation For Backend

### P0: Fix contract mismatches that currently block flows

- make chat route canonical: `/api/chat` vs `/proxy_chat`
- make approval route canonical: `/api/approve` vs `/agent_approve`
- fix RAG reindex downstream call
- document or implement `/auth/admin/login`
- document or implement `/admin/me`
- document or implement `/gemma4/health`

### P1: Finish admin/public content contract

- define one public announcement endpoint
- decide whether `/api/notifications/current` should exist or be removed
- fix spec bug on RAG delete path parameter name

### P2: Improve RAG usability

- stabilize admin file/preview responses
- stabilize public source file/preview responses
- add richer preview payloads where helpful

### P3: Future enhancements

- room-history detail UI support
- Discord auth
- richer health/ops diagnostics

## F. Concrete Backend Checklist

- [ ] Canonicalize chat route and keep temporary alias if needed
- [ ] Canonicalize approval route and keep temporary alias if needed
- [ ] Add `POST /auth/admin/login` to OpenAPI
- [ ] Add `GET /admin/me` to OpenAPI
- [ ] Add `GET /gemma4/health` to OpenAPI, or remove frontend dependency
- [ ] Define and document public current-announcement endpoint
- [ ] Fix `DELETE /api/admin/rag/documents/{document_id}` parameter naming in OpenAPI
- [ ] Fix downstream agent route used by RAG reindex
- [ ] Standardize downstream/proxy error JSON shape
- [ ] Decide long-term route naming convention for proxy/admin/chat endpoints

## G. Frontend Impact Notes

Once backend completes the P0 items above, frontend can clean up several compatibility shims:

- remove legacy route fallbacks
- remove temporary path assumptions around chat/approve
- make admin and dashboard health/status cards simpler
- build richer RAG preview UI on top of stable preview/file endpoints
