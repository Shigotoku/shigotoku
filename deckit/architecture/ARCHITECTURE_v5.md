# MediToku Slide Studio v5.0 — Long-lived SaaS foundation

## Product rule
The UI and product concepts (Project / Style / Reference / Preview / Generate) should remain stable.
Google-specific implementations are adapters and can be replaced.

## Current beta
- Runtime: Google Apps Script
- Storage: user's Google Drive
- AI: manual Gemini handoff
- Google account subscription SKU is not inferred.

## Commercial target
1. Identity Platform / Google Sign-In
2. Cloud Run control plane
3. Firestore: users, organizations, memberships, subscriptions, usage, audit metadata
4. Google Picker + `drive.file`
5. Drive API + Slides API adapter
6. Optional AppData for user-side preferences
7. GenerationEngine interface:
   - ManualGeminiEngine
   - GeminiApiEngine
   - GeminiSlidesEngine (when usable)
   - future engines
8. Fallbacks and capability-based routing

## Compatibility principles
- Never branch on product names such as “Google AI Pro”.
- Detect actual capabilities where APIs permit.
- Treat unavailable capability as normal, not as an error.
- Use idempotency keys for create operations.
- Retry only idempotent/read operations.
- Keep data formats versioned and migrations additive.
- Keep user content in the user's Drive unless explicitly required elsewhere.
