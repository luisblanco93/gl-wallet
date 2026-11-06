# Tasks

TDD: each domain task starts with failing tests derived from the spec scenarios.

## 1. Domain (pure TypeScript, tests first)

- [x] 1.1 `money`: tests for parsing (comma/dot, 2 decimals, min 0.01, invalid input), cents ↔ API conversion with float rounding, es-AR formatting (ARS/USD/EUR, `−`), totals per currency; then implement
- [x] 1.2 `balances`: tests for settled / in progress / available with and without pending outgoing transfers; then implement
- [x] 1.3 `funds`: tests for `canDebit` (below, equal, above available); then implement
- [x] 1.4 `editability` and `categories`: tests for editable fields per movement type and selectable categories; then implement
- [x] 1.5 `transferLabel`: tests for own-account and foreign counterpart; then implement

## 2. API layer

- [x] 2.1 `client`: tests with a mocked `fetch` for each error kind (field errors, message, HTML body, 401/404/422, network) and the auth header; then implement
- [x] 2.2 `endpoints`: typed functions for login, accounts (list, create), transactions (list with filters, create, patch) and pending transfers; DTO → domain mapping tests for amounts and for untrustworthy responses (`/auth/me` and `/categories` are not called, see design)

## 3. App wiring

- [x] 3.1 Session context with `sessionStorage`, logout clearing the query cache, global 401 handling
- [x] 3.2 `QueryClient` retry policy (no retry on 4xx, mutations never retried)
- [x] 3.3 Router with protected routes: login, home, movements; URL-backed filters

## 4. Feature hooks

- [x] 4.1 `useAccounts` combining accounts + pending transfers into account figures (fail closed while pending transfers load or fail)
- [x] 4.2 `useMovementList` (URL state, search written 300 ms after typing) and `useMovements(state)` with pagination and `visibleRange`
- [x] 4.3 `useCreateMovement`, `useEditMovement`, `useCreateAccount` with pre-request checks, single submit and invalidations
- [x] 4.4 `useLogin`: validate the fields, sign in and store the session; a 401 here means wrong credentials, not an expired session

## 5. UI (Claude Design handoff)

- [ ] 5.1 Tokens in `src/index.css`, shared UI adapted from the handoff, domain formatting (`formatSignedMoney`, `formatDate`, `categoriesFor`), app shell with navigation, toasts and focus on the page title
- [ ] 5.2 Login screen with all states (field errors, wrong credentials, submitting, session expired)
- [ ] 5.3 Home: account cards (available, in progress, unknown), recent movements, actions, loading/empty/error
- [ ] 5.4 Movements screen: filters, search, chips, pagination, empty/no-results/error states
- [ ] 5.5 Movement detail panel and edit (`/movimientos/:id`, `getMovement`, `transferId` for the receipt)
- [ ] 5.6 New movement form (debit rule blocks) and new account
- [ ] 5.7 Component tests for the critical flows: login error, expense above available blocked, transfer edit blocked

## 6. Verification

- [ ] 6.1 `npm run typecheck && npm run lint && npm test` green
- [ ] 6.2 Manual run against the mock API with `demo@example.com`: every scenario in the specs
