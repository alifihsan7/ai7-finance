# Summary and ledger reliability

## Changes

- Read responses accept legacy zero-amount ledger entries. Create and update inputs still reject zero. Paycheck splitting no longer creates zero-amount entries.
- Transfer edits preserve their type, update both amounts and dates in one commit, and reject edits without a counterpart or with identical source/destination accounts. The regular edit form now preserves transfer types and locks their category.
- Dashboard data is parsed before applying state. Only the latest request can set data, loading or error state. Optional endpoint failures no longer hide a valid transaction/summary response. Primary HTTP failures identify the failing resource and expired sessions reopen sign-in.
- Includes the reviewed Ink & Silver palette in both themes. Component redesign is deferred while core feature behavior is verified.

## Evidence

- Backend: 14 tests pass across `test_ledger_workflow.py`, `test_analytics_category_totals.py` and `test_transaction_api_transfer.py` using in-memory SQLite. The transfer test app imports its router instead of starting the production application's database initialization.
- Frontend: `check-dashboard-data.cjs` passes period filtering, optional network/JSON/HTTP failures, primary HTTP errors and expired sessions. Eight existing overview check groups pass.
- Production build succeeds, with pre-existing hook-dependency warnings.
- Browser against an isolated, in-memory local API: create expense 100,000 -> total 900,000; edit to 150,000 -> total 850,000; record transfer 200,000 -> total unchanged; edit transfer to 300,000 -> balances 550,000 / 300,000 and total 850,000. Refresh preserves those amounts. Delete confirmation was opened and cancelled in the browser; actual deletion and paired deletion are covered by API tests.
- Local race simulation: initial unfiltered transaction request deliberately returns HTTP 500 after the dated request succeeds. The balance remains visible and no overview error appears.

## Limits and deployment

The legacy-zero failure is reproduced locally; production server logs have not confirmed that it is the specific cause of every observed initial-load failure. No production records were changed. Budget allocation, goals and subscription workflows are subsequent review stages. Deploy both backend code and the generated static bundle, then restart and verify production.
