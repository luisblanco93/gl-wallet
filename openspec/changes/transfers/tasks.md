# Tasks

Depends on `wallet-core` groups 1–3 (domain money/funds/balances, API client, session). TDD: each domain task starts with failing tests derived from the spec scenarios.

## 1. Domain (pure TypeScript, tests first)

- [x] 1.1 `currency`: tests for same currency, mismatch with reason; then implement `canTransferBetween`
- [x] 1.2 `transferStatus`: tests for poll while pending < 10 s, stop on completed, stop as delayed at 10 s, list refresh cap; then implement
- [x] 1.3 `transferForm`: tests for destination rules (own same-currency, source excluded, P2P id non-empty and not the source), amount above available (including a pending transfer reducing available), unknown available blocks; then implement
- [x] 1.4 `fx`: tests for reference rate (average), ARS↔USD, USD↔EUR through ARS, rounding to the cent, estimated total in ARS; then implement

## 2. API layer

- [x] 2.1 `createTransfer`, `getTransfer` endpoints with DTO → domain mapping (amounts in cents, destination currency kept)
- [x] 2.2 `fx` client for dolarapi with response-shape validation; tests for valid, malformed and failing responses

## 3. Feature hooks

- [x] 3.1 `useCreateTransfer` with the in-flight guard, outcome refetches (201, 422, network, server) and error kinds surfaced for the UI (404, 400; copy in 4.3)
- [x] 3.2 `useTransferStatus(created)`, seeded with the creation response and driven by `nextPoll`
- [x] 3.3 Movement list `refetchInterval` driven by `listShouldRefresh`
- [x] 3.4 `useFxRates` (10-min cache, no retry, `undefined` on failure)

## 4. UI

- [x] 4.1 Transfer form: source, destination tabs (own / P2P) with disabled other-currency accounts and estimate, empty state with "Crear cuenta", amount with available
- [x] 4.2 Review step with P2P warnings
- [x] 4.3 Result states: processing, credited, delayed, failed, insufficient funds, destination not found, currency-mismatch notice, connection error; `aria-live` announcements
- [x] 4.4 Estimated total in ARS on home
- [x] 4.5 Component tests: double click sends one request; 422 shows refreshed available; processing → credited; 404 returns to the destination with its value

## 5. Verification

- [ ] 5.1 `npm run typecheck && npm run lint && npm test` green
- [ ] 5.2 Manual run against the mock API: own transfer (after creating a second ARS account), P2P to `acc-4`, 422, 404 `acc-999`, double click, stuck pending (stop the server within 1.5 s), FX offline (block dolarapi.com in devtools)
