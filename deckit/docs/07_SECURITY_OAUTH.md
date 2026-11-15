# Security / OAuth Requirements

- Google Sign-In
- least privilege
- prefer drive.file + Google Picker in commercial version
- Google product SKU is not authorization
- MediToku organization membership + actual capabilities
- tokens encrypted; never logged
- secrets in Secret Manager
- dev/prod OAuth clients separated
- organization boundary on every action
- document body not copied to Firestore by default
- temporary processing TTL
- audit sensitive actions
- rate limiting / input validation / CSP / session protections
- no secret in browser bundle

Medical/patient-data compliance is a separate scope and must not be implicitly claimed by the generic SaaS MVP.
