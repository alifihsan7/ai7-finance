# Production findings: five fixes

2 November 2026. Follow-up to the authenticated browser review. No production records were created, edited, transferred or deleted during verification.

| Finding | Change | Verification |
| --- | --- | --- |
| Tablet overflow after login | The header can wrap; the period group can shrink and its long label truncates while its accessible name retains the full value. The popup fits narrow viewports. | Browser fixture with a long active-cycle label: header and main content fit at 320, 390, 768 and 1024 px. At 768 px, both header and main content now fit their 490 px container. |
| Negative pocket marked safe | Status uses target, spending and remaining balance. Negative balance, absent target, exhausted budget and near-limit spending have separate labels. Percentage/progress is omitted when no positive target exists. | Browser fixture with zero target, positive spending and negative remainder shows Saldo negatif, with no misleading 0% progress. Pure-function checks also cover exhausted, near-limit and within-budget states. |
| Income categories always empty | The summary API adds income_categories while preserving expense-only categories for existing charts. Each group has its own total, count and denominator. Frontend category matching includes transaction type. | Two isolated SQLite/API tests pass, covering date boundaries, tenant isolation, same-name income/expense categories, transfer exclusion and empty periods. Frontend rendering and browser checks show the income amount and count. |
| Hardcoded allocation percentage | The subscription dialog describes selecting the autodebit account and due date; it no longer asserts a fixed bank allocation. | Browser dialog shows the account instruction and contains no 31.7% claim. |
| Period selector ignores Escape | Escape closes the popup and restores focus to its trigger, including when pressed inside custom date controls. | Browser test opens Custom, presses Escape from the start-date input, then verifies aria-expanded=false and trigger focus. |

## Delivery checks

- Hard Gate: PASS for these changes. Production build, eight frontend regression groups and two backend tests pass. No production fixture data or credentials were copied into the repository.
- Purpose-Gate: PASS. This bounded fix preserves the existing design direction and adds no visual assets, glow or decorative controls.
- Liveliness: PASS. ENERGY 1 / RHYTHM 2 / MOTION 1 remains unchanged; responsiveness preserves the existing balance hierarchy.
- Craftsmanship: PASS for the five listed regressions. Tests exercise populated local fixture data rather than relying on the guest screen. Browser error log was empty during the local verification pass.

The temporary browser fixture server rejects all writes, serves only local static output and local test fixtures, and does not forward requests to production. It lives outside the repository and is not deployed.

## Commands

- Frontend build: `node node_modules/next/dist/bin/next build` from frontend.
- Frontend regressions: `node frontend/scripts/check-overview.cjs` from the repository root.
- API regression: `python -m pytest tests/test_analytics_category_totals.py -q` from backend using the project's dependencies. Tests use in-memory SQLite; the configured application engine is not connected.

Existing hook-dependency and Python dependency deprecation warnings remain. Performance scores were not measured.

## Deployment

The matching frontend build is included in static/. Deploy it together with the updated Python API. The API process must load the new code for income_categories to be returned. This is an additive response field; no database migration is needed. Git push alone does not prove the production deployment has finished.
