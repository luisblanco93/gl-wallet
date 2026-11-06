# Design

## Context

Builds on `wallet-core`: money in cents, the `ApiError` kinds, the debit rule (`canDebit`) and account figures (available = balance − pending outgoing). The product decisions and their trade-offs are in `DECISIONS.md` (sections 1–3); this document covers how they are implemented.

## Goals / Non-Goals

**Goals:**
- The three ambiguities (currency, async status, funds) are each resolved by one pure domain function, tested in isolation.
- TanStack Query only executes what the domain decides (when to poll, when to stop).

**Non-Goals:**
- Visual design (waits for the Claude Design handoff).
- Real currency conversion (impossible with this API).

## Decisions

### Domain modules (`src/domain`)
| Module | Contents | Resolves |
|---|---|---|
| `currency.ts` | `canTransferBetween(source, destination) → ok \| { reason: 'currencyMismatch', from, to }` | Ambiguity 1 |
| `transferStatus.ts` | `TRANSFER_POLL_INTERVAL_MS = 1000`, `TRANSFER_POLL_MAX_MS = 10000`, `nextPoll(status, elapsedMs) → { poll: true, inMs } \| { poll: false, outcome: 'completed' \| 'delayed' }`, `listShouldRefresh(pendingCreatedAts, now)` | Ambiguity 2 |
| `funds.ts` (from `wallet-core`) | `canDebit` reused unchanged | Ambiguity 3 |
| `transferForm.ts` | `validateTransfer(input, accounts, figures) → Result<TransferDraft, FieldErrors>`: destination rules, amount parsing, debit rule, currency rule | Form rules in one place |
| `fx.ts` | `referenceRate(compra, venta)`, `convert(cents, from, to, rates) → Cents`, `estimatedTotalArs(figures, rates)` | FX estimate |

Each module has constants named after the decision, so the numbers (1 s, 10 s) are visible in one place.

### Submission and tracking flow
1. `validateTransfer` gates "Continuar"; the review renders the `TransferDraft`.
2. `useMutation` sends `POST /transfers`; the confirm button is disabled while `isPending`, and the handler returns early if a mutation is in flight (two guards: UI and logic).
3. On 201, the screen switches to tracking with `useQuery(['transfer', id])`, where `refetchInterval` calls `nextPoll(status, Date.now() − createdAt)`. `false` stops polling; the outcome drives "Acreditada" or "Está tardando más de lo normal".
4. On `completed`: invalidate `['accounts']`, `['pendingTransfers']`, `['movements']`. The status change is announced through an `aria-live="polite"` region.
5. On `insufficientFunds`: invalidate `['accounts']` and `['pendingTransfers']`, then show the refreshed available amount.
6. P2P mismatch: compare `response.transfer.to.currency` (present in the POST response) with the source currency.

### Movement list auto-refresh
The `['movements', filters]` query uses `refetchInterval: (query) => listShouldRefresh(pendingRows(query), now) ? 1000 : false`, so a stuck `pending` row cannot cause endless polling.

### FX source
- `src/api/fx.ts` calls dolarapi.com with plain `fetch` (no auth, separate base URL) and validates the shape (numeric `compra`/`venta`, ISO `fechaActualizacion`) before mapping to domain rates.
- Query `['fxRates']` uses `staleTime` of 10 min and `retry: false`; on any error, consumers receive `undefined` and render no estimate.
- dolarapi was chosen over bluelytics, open.er-api and frankfurter: it is the only one with Argentine rate types (official, MEP, etc.) and a per-quote update time; frankfurter has no ARS.

## Risks / Trade-offs

- **P2P currency mismatch cannot be prevented**: the API hides other users' accounts. Mitigated with a warning before sending and a notice after; documented as residual risk.
- **Client clock vs `createdAt`**: elapsed time uses the server's `createdAt`. With the local mock the clocks match. In production, elapsed time would be measured from the moment the response was received.
- **dolarapi has no documented rate limits**: the 10-min cache bounds requests to about 6 per hour per open tab.
- **Network failure after the server accepted the transfer**: the client cannot know whether it was created. It does not resend automatically and points the user to Movements, because a duplicate transfer is worse than an extra check.
