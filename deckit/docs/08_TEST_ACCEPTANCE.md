# Test & Acceptance

## UX
- Shell renders without Drive API
- Guide/Settings/New Project open immediately
- API error never whites out app
- every click receives visible feedback
- 1366×768 and 1920×1080 usable

## Functional
Project → Source → Style → Outline → DeckPlan → Slides → thumbnails → Open Slides → Reference → PPTX。

## Reliability
Idempotent create/generate, safe retry, transient Google recovery, permission errors, deterministic job state。

## Organization
Cross-org access denied, company Style shared, locked rule protected, personal Style private by default。

## Automation
Unit + integration + Playwright E2E in CI before production deploy。
