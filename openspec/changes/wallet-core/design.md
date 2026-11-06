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
| `types.ts` | `Currency`, `Cents`, `User`, and `Movement` / `Account`: the fields domain rules read plus the display fields rows need (`id`, `description`, `createdAt`); no API-only fields. `MovementStatus` includes `failed` (allowed by the API schema, produced by no current flow): such a row is listed as "Fallida" and never counts as in progress |
| `money.ts` | `parseAmount(input) → Result<Cents, AmountError>`, `toCents(apiNumber)`, `toApiAmount(cents)`, `formatMoney(cents, currency)`, `totalsByCurrency(items)`, `signedAmount(movement)` |
| `balances.ts` | `accountFigures(account, pendingTransfers \| 'unknown') → { settled, inProgress, available }`; filters the account's `pending` outgoing transfers itself |
| `funds.ts` | `canDebit(amount, available \| 'unknown') → ok \| insufficient (with available) \| unknownAvailable` |
| `editability.ts` | `editableFields(movement) → ('category' \| 'description')[]`, `editBlockReason(movement)` |
| `categories.ts` | category ids, Spanish labels, `selectableCategories` (excludes `transfer`), `categoryLabel(id)` |
| `transferLabel.ts` | `transferLabel(movement, ownAccounts) → "Transferencia a/desde …"` |

`Result` is a small discriminated union, defined in `money.ts` until a second module needs it; no exceptions for expected validation outcomes.

### Money details
- **Fail closed in the domain:** an unknown available is a value (`'unknown'`), not a hook decision. `accountFigures` produces it when pending transfers fail to load, and `canDebit` blocks on it.
- **Parsing from text:** `parseAmount` validates the string and builds cents from its integer and decimal parts; it never multiplies a float. Error kinds: `empty`, `invalid` (negative, non-numeric, malformed separators), `tooManyDecimals`, `belowMinimum`, `tooLarge` (not a safe integer).
- **es-AR separators:** users in Argentina write `1.500` for fifteen hundred, so a `.` that groups digits in threes (`1.234`, `1.234.567,89`) is a thousands separator and `,` is the decimal one. Any other `.` is read as decimal, so `1234.56` and `0.50` still work. A first group starting with `0` is not a thousands group (`0.001` fails with too many decimals instead of becoming 1). Rejected: dot always decimal (`1.234` failed for every es-AR user) and comma-only decimal (rejects `1234.56`, which the spec accepted).
- **Formatting without `Intl` currency style:** in Node 24 it prints `EUR 1,00` and an ASCII hyphen, and ICU output varies between engines. `formatMoney` uses `Intl` only for thousands grouping and adds its own symbols (`$`, `US$`, `€`), the `−` sign (U+2212) and a non-breaking space so the symbol never wraps away from the number.
- **Reading API floats:** `toCents` rounds after `toPrecision(15)` to drop binary noise (`1.005 → 101`) and never returns `-0`.
- **Signed amounts:** `signedAmount` decides the sign of a row (expense or outgoing transfer → negative), so components never derive it.

### API layer (`src/api`)
- `client.ts`: `createApiClient({ baseUrl, fetch, getToken, onUnauthorized })` returns `request(method, path, { body, query, auth })`. `baseUrl`, `fetch` and the session hooks are injected, so `api` depends on neither React nor `config`, and tests need no globals. It sends `Authorization` unless `auth: false` (login), sets `Content-Type: application/json` only when there is a body, parses JSON only when the response says it is JSON (an unparseable body counts as no body), and throws an `ApiError`.
- `errors.ts`: `ApiError` with a `kind`, `toApiError(status, body)` and `shouldRetry(failureCount, error)`.

  | Response | `kind` |
  |---|---|
  | 400 with `errors[]` | `validation`, messages per field |
  | 400 with `error`, or any other 4xx not listed below (403, 409…) | `badRequest`; the message is kept for logging only |
  | 400 without a JSON body (HTML stack trace) | `badRequest` without a message; the body is discarded |
  | 401 / 404 / 422 | `unauthorized` / `notFound` / `insufficientFunds` |
  | 5xx | `server` |
  | No response (down, CORS, offline) | `network` |
  | 2xx whose data money rules cannot trust (non-finite amount, unknown currency, type, direction or status) | `server` |
- `dto.ts` + `endpoints.ts`: DTO shapes and one typed function per endpoint, with hand-written guards that map DTOs to domain types (amounts to cents at this boundary). No schema library: the guards cover a handful of fields.
- **Not called:** `GET /auth/me`, because login already returns the user and it is kept in the session, and an invalid stored token is caught by the first 401; `GET /categories`, because the domain needs the same 10 ids anyway to give them Spanish labels, and the mock API's list is fixed.

### Server state (TanStack Query)
- Query keys: `['accounts']`, `['pendingTransfers']`, `['movements', filters]`.
- `QueryClient` defaults (`createQueryClient()`, a fresh client per test): `retry` uses `shouldRetry` (no retry for 4xx, at most one for `network` and `server`); mutations `retry: 0`.
- **401:** the client calls `onUnauthorized` only for authenticated requests, and the session ends (session spec). A 401 from login therefore stays a wrong-credentials error. This replaces a global `onError` on the `QueryClient`, which would also have seen the login 401.
- Mutations invalidate `['accounts']`, `['pendingTransfers']` and `['movements']` on success.
- Accounts screen combines `['accounts']` + `['pendingTransfers']` through `accountFigures`. If `['pendingTransfers']` fails, available is unknown and debits are blocked (fail closed: with money, an unknown available is not "the full balance").

### Session
A small store outside React holds `{ token, user }` or the reason the session ended (`loggedOut` or `expired`), persisted in `sessionStorage`: it survives reloads and ends with the tab. The API client reads the token from it, and React reads it through a context (`useSyncExternalStore`). Ending the session clears the query cache and is idempotent, because several requests can return 401 at once. A missing, corrupt or wrong-shaped stored value means signed out. `localStorage` was rejected because a wallet session should not outlive the tab. Zustand is unnecessary for one value.

### Search
Debounced 300 ms in the hook; filters and page live in the URL query string so a filtered view survives reloads and the back button. Reading and writing the URL are pure functions in `features/movements/filters.ts`: unknown values (`type=xyz`, `page=0`, `page=abc`) fall back to their defaults, and changing any filter resets the page to 1.

## Risks / Trade-offs

- **Pending transfers beyond 50**: the API caps `pageSize` at 50. Available is computed from one page of pending outgoing transfers. Since transfers settle in ~1.5 s, more than 50 pending at once is unrealistic; documented, not handled.
- **Stale available between fetch and submit**: the client check can pass while the server rejects with 422. Handled by the `insufficientFunds` error path (accounts refetch + message).
- **Server balance is a float**: converted to cents on read with rounding; display never shows float artifacts.
- **`10.015` means ten thousand fifteen**: under the es-AR rule a dot followed by three digits is a thousands group, so it can never be read as three decimals. That matches how users in Argentina write amounts.
