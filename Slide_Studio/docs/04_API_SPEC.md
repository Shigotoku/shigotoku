# API Spec — Draft

- GET `/api/bootstrap`
- GET/POST `/api/projects`
- GET/PATCH/DELETE `/api/projects/:id`
- POST `/api/projects/:id/sources/picker`
- POST `/api/projects/:id/sources/upload`
- GET/POST `/api/styles`
- PATCH/DELETE `/api/styles/:id`
- GET `/api/styles/:id/effective`
- GET/POST `/api/references`
- PATCH/DELETE `/api/references/:id`
- POST `/api/generation-jobs`
- GET `/api/generation-jobs/:id`
- POST `/api/generation-jobs/:id/outline`
- POST `/api/generation-jobs/:id/generate`
- GET `/api/decks/:id`
- GET `/api/decks/:id/slides`
- POST `/api/decks/:id/reference`
- POST `/api/decks/:id/export/pptx`
- GET `/api/capabilities`
- GET `/api/health`

POST create/generate系はIdempotency-Key必須。

Error shape:
```json
{"error":{"code":"GOOGLE_TRANSIENT","message":"Google側で一時的なエラーが発生しました。","requestId":"req_xxx","retryable":true}}
```
