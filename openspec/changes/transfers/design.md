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
| `transferStatus.ts` | `TRANSFER_POLL_INTERVAL_MS = 1000`, `TRANSFER_POLL_MAX_MS = 10000`, `nextPoll(status, elapsedMs) → { poll: true, inMs } \| { poll: false, outcome: 'completed' \| 'delayed' \| 'failed' }`, `listShouldRefresh(pendingCreatedAts, nowMs)` | Ambiguity 2 |
| `funds.ts` (from `wallet-core`) | `canDebit` reused unchanged | Ambiguity 3 |
| `transferForm.ts` | `ownDestinationOptions(sourceId, accounts)` and `validateTransfer(input, accounts) → Result<TransferDraft, TransferErrors>`: destination rules, amount parsing, debit rule, currency rule, description length | Form rules in one place |
| `fx.ts` | `referenceRate(compra, venta)`, `convert(cents, from, to, rates) → Cents`, `estimatedTotalArs(accounts, rates) → Cents \| 'unknown'` | FX estimate |

Each module has constants named after the decision, so the numbers (1 s, 10 s) are visible in one place.

### Domain details settled during implementation
- **Accounts carry their available amount.** `validateTransfer` receives one list of `{ id, name, currency, available }` (as the new-movement form does) instead of accounts and figures separately: one lookup, no chance of pairing an account with another's figures.
- **Codes, not copy.** The domain returns reason codes; `src/features` maps them to Spanish text, as in wallet-core.
- **A P2P id that is an own account follows the own-account rules.** Otherwise typing the own USD account's id in the P2P field would bypass the currency block (DECISIONS.md §1). The draft is then marked as an own transfer, so the review shows the account name and no P2P warnings. The id is trimmed: the API accepts `" "` and answers 404.
- **`failed` stops tracking.** The API schema allows it although no current flow produces it; tracking stops and shows "Fallida" instead of reporting a false "taking longer than usual". Rejected: treating it as delayed.
- **A failed status request keeps the last known status.** `nextPoll` receives the last status the client saw (seeded from the 201 body), so a `network` error before 10 s keeps polling; the status query uses `retry: false` so TanStack's backoff does not override the 1 s cadence.
- **One rounding, at the end.** `convert` multiplies by the source rate and divides by the destination rate in one expression and rounds once to the cent; rounding the intermediate ARS amount would drift on USD↔EUR.
- **One rate date.** USD and EUR rates have different update times; the estimate label shows the older one, so it never claims to be fresher than it is.
- **Total in ARS fails closed.** `estimatedTotalArs` returns `'unknown'` if any account's available is unknown (loading or failed) and the home hides the total; a total that silently leaves out one account would mislead. Rejected: adding the settled balance for those accounts (overstates the total while a transfer is pending) and a partial total with a notice.
- **The description limit moves to the domain.** `MAX_DESCRIPTION_LENGTH` (500, the API's limit) now lives in `src/domain/types.ts`; movements and transfers import the same constant.
- **Elapsed time uses the server's `createdAt`.** Verified on 2026-11-06 that the WSL server clock and the Windows browser clock match to under a second, so the local setup does not distort the 10 s window.

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
