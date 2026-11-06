# Design

## Context

Greenfield React app over a mock API we cannot change. The API's verified quirks force the client to own several money rules. The architecture rule from `openspec/config.yaml` applies: `src/domain` is pure TypeScript and is lint-enforced to import nothing from React, TanStack, `api`, `features`, `app`, `shared` or `config`.

## Goals / Non-Goals

**Goals:**
- Every money rule lives in `src/domain` and is unit-tested without React or the API.
- The UI only renders values the domain computed and errors the client normalized.

**Non-Goals:**
- Transfers, status polling and FX (change `transfers`).
- Visual design: UI tasks wait for the Claude Design handoff.

## Decisions

### Layering and data flow
`api` (fetch + DTO → domain types, errors) → TanStack Query hooks in `features/*` → components. Hooks call domain functions; components receive ready-to-render props. Domain types are the contract between layers; API DTO shapes never leave `src/api`.

### Domain modules (`src/domain`)
| Module | Contents |
|---|---|
| `money.ts` | `Cents` type, `parseAmount(input) → Result<Cents, AmountError>`, `toCents(apiNumber)`, `toApiAmount(cents)`, `formatMoney(cents, currency)`, `totalsByCurrency(items)` |
| `balances.ts` | `accountFigures(balance, pendingOutgoing[]) → { settled, inProgress, available }` |
| `funds.ts` | `canDebit(amount, available) → { ok: true } \| { ok: false, available }` |
| `editability.ts` | `editableFields(movement) → ('category' \| 'description')[]`, `editBlockReason(movement)` |
| `categories.ts` | category ids, Spanish labels, `selectableCategories` (excludes `transfer`) |
| `transferLabel.ts` | `transferLabel(movement, ownAccounts) → "Transferencia a/desde …"` |

`Result` is a small discriminated union; no exceptions for expected validation outcomes.

### API layer (`src/api`)
- `client.ts`: `request<T>(method, path, body?)`. Adds the token, sets JSON content type, parses JSON only when `content-type` is JSON, and throws an `ApiError` with a `kind` (see the `api-client` spec). The token is read from a session getter injected at startup, so `api` does not depend on React.
- `endpoints.ts`: one typed function per endpoint, mapping DTOs to domain types (amounts to cents at this boundary).

### Server state (TanStack Query)
- Query keys: `['accounts']`, `['pendingTransfers']`, `['movements', filters]`, `['categories']`.
- `QueryClient` defaults: `retry` returns false for 4xx `ApiError`s and allows 1 retry otherwise; mutations `retry: 0`. A global `onError` for `unauthorized` ends the session (session spec).
- Mutations invalidate `['accounts']`, `['pendingTransfers']` and `['movements']` on success.
- Accounts screen combines `['accounts']` + `['pendingTransfers']` through `accountFigures`. If `['pendingTransfers']` fails, available is unknown and debits are blocked (fail closed: with money, an unknown available is not "the full balance").

### Session
React context holding `{ token, user }`, persisted in `sessionStorage`: it survives reloads and ends with the tab. `localStorage` was rejected because a wallet session should not outlive the tab. Zustand is unnecessary for one value.

### Search
Debounced 300 ms in the hook; filters and page live in the URL query string so a filtered view survives reloads and the back button.

## Risks / Trade-offs

- **Pending transfers beyond 50**: the API caps `pageSize` at 50. Available is computed from one page of pending outgoing transfers. Since transfers settle in ~1.5 s, more than 50 pending at once is unrealistic; documented, not handled.
- **Stale available between fetch and submit**: the client check can pass while the server rejects with 422. Handled by the `insufficientFunds` error path (accounts refetch + message).
- **Server balance is a float**: converted to cents on read with rounding; display never shows float artifacts.
