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
| `types.ts` | `Currency`, `Cents`, and `Movement` / `Account` with only the fields domain rules read |
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
- **`10.015` means ten thousand fifteen**: under the es-AR rule a dot followed by three digits is a thousands group, so it can never be read as three decimals. That matches how users in Argentina write amounts.
