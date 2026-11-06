# Tasks

TDD: each domain task starts with failing tests derived from the spec scenarios.

## 1. Domain (pure TypeScript, tests first)

- [x] 1.1 `money`: tests for parsing (comma/dot, 2 decimals, min 0.01, invalid input), cents ↔ API conversion with float rounding, es-AR formatting (ARS/USD/EUR, `−`), totals per currency; then implement
- [x] 1.2 `balances`: tests for settled / in progress / available with and without pending outgoing transfers; then implement
- [x] 1.3 `funds`: tests for `canDebit` (below, equal, above available); then implement
- [ ] 1.4 `editability` and `categories`: tests for editable fields per movement type and selectable categories; then implement
- [ ] 1.5 `transferLabel`: tests for own-account and foreign counterpart; then implement

## 2. API layer

- [ ] 2.1 `client`: tests with a mocked `fetch` for each error kind (field errors, message, HTML body, 401/404/422, network) and the auth header; then implement
- [ ] 2.2 `endpoints`: typed functions for login, me, accounts (list, create), transactions (list with filters, create, patch), pending transfers, categories; DTO → domain mapping tests for amounts

## 3. App wiring

- [ ] 3.1 Session context with `sessionStorage`, logout clearing the query cache, global 401 handling
- [ ] 3.2 `QueryClient` retry policy (no retry on 4xx, mutations never retried)
- [ ] 3.3 Router with protected routes: login, home, movements; URL-backed filters

## 4. Feature hooks

- [ ] 4.1 `useAccounts` combining accounts + pending transfers into account figures (fail closed on unknown available)
- [ ] 4.2 `useMovements(filters)` with debounced search and pagination
- [ ] 4.3 `useCreateMovement`, `useEditMovement`, `useCreateAccount` with invalidations

## 5. UI (blocked until the Claude Design handoff)

- [ ] 5.1 Design tokens into `src/index.css` (`@theme`)
- [ ] 5.2 Login screen with all states
- [ ] 5.3 Home: account cards (available, in progress), recent movements, actions
- [ ] 5.4 Movements screen: filters, search, pagination, empty/error states
- [ ] 5.5 Movement detail/edit, new movement form, new account modal
- [ ] 5.6 Component tests for the critical flows: login error, expense above available blocked

## 6. Verification

- [ ] 6.1 `npm run typecheck && npm run lint && npm test` green
- [ ] 6.2 Manual run against the mock API with `demo@example.com`: every scenario in the specs
