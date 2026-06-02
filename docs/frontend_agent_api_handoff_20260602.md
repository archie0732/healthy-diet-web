# Frontend Integration Handoff: News + RAG Search

Last updated: 2026-06-02

## Purpose

This document is for frontend integration of the 6 newly added Rust routes that proxy to the downstream agent service.

Frontend should call the Rust backend, not the Node service directly.

Recommended base URL:

```text
http://localhost:3000
```

## Route Summary

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/news/sync` | Trigger FDA news sync |
| `GET` | `/api/news?page=1&pageSize=10` | Get paginated news list |
| `GET` | `/api/news/{id}` | Get a single news article |
| `GET` | `/api/news-files` | Get local markdown filenames for debug |
| `GET` | `/api/rag/search` | Simple query-only RAG search |
| `POST` | `/api/rag/search` | RAG search with `source_types` filter |

## Auth

- These 6 routes currently do not require JWT at the Rust layer.
- If your frontend already has a bearer token, it is still fine to send it.
- Recommended UI behavior:
  - show `news sync` button only in admin/debug pages
  - show `news files` only in debug/admin pages

## 1) News Sync

### `POST /api/news/sync`

No request body.

Success response:

```json
{
  "ok": true,
  "total": 42,
  "newCount": 3,
  "updatedCount": 1,
  "generatedAt": "2026-06-02T02:10:15.123Z"
}
```

Recommended UI:

- use this as a manual sync action
- disable the sync button while request is in flight
- after success, refresh the news list

Recommended success message:

- `Sync complete: {newCount} new, {updatedCount} updated`

## 2) News List

### `GET /api/news?page=1&pageSize=10`

Query params:

| Name | Type | Default | Notes |
|---|---|---|---|
| `page` | integer | `1` | minimum `1` |
| `pageSize` | integer | `10` | minimum `1`, maximum `100` |

Success response:

```json
{
  "ok": true,
  "page": 1,
  "pageSize": 10,
  "total": 42,
  "totalPages": 5,
  "items": [
    {
      "id": "86333",
      "title": "Example title",
      "publishedDate": "2026-05-12"
    }
  ]
}
```

Recommended UI mapping:

- list page uses `items`
- pagination uses `page`, `pageSize`, `total`, `totalPages`
- card/list row fields:
  - `title`
  - `publishedDate`

## 3) News Detail

### `GET /api/news/{id}`

Success response:

```json
{
  "ok": true,
  "item": {
    "id": "86333",
    "title": "Example title",
    "publishedDate": "2026-05-12",
    "sourceUrl": "https://www.fda.gov.tw/TC/newsContent.aspx?id=86333",
    "content": "# Example title\n\n..."
  }
}
```

Not found cases:

```json
{
  "ok": false,
  "error": "news_not_found"
}
```

or:

```json
{
  "ok": false,
  "error": "news_file_not_found"
}
```

Recommended UI:

- render `content` as Markdown
- show `sourceUrl` as an external link
- use `title` as page title
- show fallback empty state for `news_not_found`

## 4) News Files

### `GET /api/news-files`

Success response:

```json
{
  "ok": true,
  "files": [
    "2026-05-12_86333.md",
    "2026-05-05_86279.md"
  ]
}
```

Recommended UI:

- use only for debug/admin tools
- simple table or list is enough

## 5) RAG Search (GET)

### `GET /api/rag/search`

Use this only for simple query-only search.

Query params:

| Name | Type | Default | Notes |
|---|---|---|---|
| `query` | string | - | required, cannot be empty |
| `top_k` | integer | `5` | range `1..12` |
| `force_refresh` | boolean | `false` | optional |

Success response:

```json
{
  "ok": true,
  "query": "奶粉過甜謠言",
  "total_hits": 2,
  "hits": [
    {
      "id": "mohw_news:2025-08-28_83629.md:0",
      "source_type": "mohw_news",
      "title": "Example title",
      "source_path": "knowledge_base/mohw_clarifications/articles/2025-08-28_83629.md",
      "published_date": "2025-08-28",
      "score": 12,
      "snippet": "..."
    }
  ]
}
```

Recommended UI:

- use for simple search box
- debounce input before sending request
- display:
  - `title`
  - `snippet`
  - `published_date`
  - `source_type`

## 6) RAG Search (POST)

### `POST /api/rag/search`

Use this when frontend needs source filtering.

Request body:

```json
{
  "query": "奶粉過甜謠言",
  "top_k": 5,
  "source_types": ["mohw_news", "uploaded_knowledge"],
  "force_refresh": false
}
```

Allowed `source_types`:

- `nutrition_rules`
- `mohw_news`
- `uploaded_knowledge`

Validation error:

```json
{
  "ok": false,
  "error": "invalid_payload",
  "details": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

Recommended UI:

- checkbox or multi-select for `source_types`
- default can be:
  - `mohw_news`
  - `uploaded_knowledge`
- show validation error near the search form if backend returns `invalid_payload`

## Suggested TypeScript Types

```ts
export interface NewsListItem {
  id: string
  title: string
  publishedDate?: string | null
}

export interface NewsListResponse {
  ok: boolean
  page: number
  pageSize: number
  total: number
  totalPages: number
  items: NewsListItem[]
}

export interface NewsDetailItem {
  id: string
  title: string
  publishedDate?: string | null
  sourceUrl: string
  content: string
}

export interface NewsDetailResponse {
  ok: boolean
  item: NewsDetailItem
}

export interface RagHit {
  id: string
  source_type: string
  title: string
  source_path: string
  published_date?: string | null
  score: number
  snippet: string
}

export interface RagSearchResponse {
  ok: boolean
  query: string
  total_hits: number
  hits: RagHit[]
}
```

## Suggested Fetch Examples

### News list

```ts
export async function getNews(page = 1, pageSize = 10) {
  const res = await fetch(`/api/news?page=${page}&pageSize=${pageSize}`)
  if (!res.ok) throw new Error('Failed to fetch news list')
  return res.json()
}
```

### News detail

```ts
export async function getNewsDetail(id: string) {
  const res = await fetch(`/api/news/${id}`)
  if (!res.ok) throw new Error('Failed to fetch news detail')
  return res.json()
}
```

### RAG search with filters

```ts
export async function searchRag(payload: {
  query: string
  top_k?: number
  source_types?: string[]
  force_refresh?: boolean
}) {
  const res = await fetch(`/api/rag/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Failed to search knowledge')
  return data
}
```

## Frontend Checklist

1. Add news list page using `GET /api/news`.
2. Add news detail page using `GET /api/news/{id}`.
3. Render article `content` as Markdown.
4. Add optional admin/debug sync button using `POST /api/news/sync`.
5. Add optional debug file list using `GET /api/news-files`.
6. Add RAG search UI using `POST /api/rag/search`.
7. Add loading, empty, and error states for all 6 routes.
