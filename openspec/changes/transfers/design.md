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
| `transferForm.ts` | `ownDestinationOptions(source, accounts)` and `validateTransfer(input, accounts) → Result<TransferDraft, TransferErrors>`: destination rules, amount parsing, debit rule, currency rule, description length | Form rules in one place |
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
- **Elapsed time uses the server's `createdAt`.** Verified on 2026-11-06 that the WSL server clock and the Windows browser clock match to under a second, so the local setup does not distort the 10 s window. An unreadable `createdAt` (NaN) stops polling as delayed instead of polling forever.

### Hooks details settled during implementation
- **Last debit check at confirm.** `useCreateTransfer` receives the source's current available and runs `canDebit` before sending, as `useCreateMovement` does: the pending list can change, or fail and become unknown, between "Revisar transferencia" and confirm. This is the double-spend guard.
- **Refetch before reporting.** On 201, 422 and `network` the mutation awaits the refetch of accounts, pending transfers and movements before it reports, so the screen shows the refreshed available (422) or whether the transfer went through (network), and a second transfer never validates against a stale available. `useSingleSubmitMutation`'s `onError` may now return that promise.
- **Status query reads only the status.** `GET /transfers/:id` returns `to: null` for P2P (only the sender's side), so the destination-currency notice is computed from the creation response (`from` vs `to` with `canTransferBetween`).
- **One evaluation for polling and screen.** The `refetchInterval` and the displayed phase call the same function with the same inputs; elapsed time runs to the latest response, successful or failed, so an outage still reaches the 10 s cap. The status query has `retry: false`.
- **Refresh on `completed` and `failed`.** A failed transfer releases its pending amount too.
- **FX cache.** `staleTime` and `gcTime` are both 10 min (the default `gcTime` of 5 min would drop the rates when leaving Home), and `retry: false`.
- **FX wiring.** `src/api` keeps the wallet API and the FX client separate; `app` composes them into one `AppApi` provided to features. The FX client gets the plain `fetch` (no token) and sends no custom headers, so the GET needs no CORS preflight (dolarapi answers preflights with 405; verified 2026-11-06).
- **Movement-list refresh has no hook test.** The decision is the tested `listShouldRefresh`; the wiring is checked in the manual run (5.2).

### Review findings applied (product-owner, security-gate)
- **The polling window is bounded on both sides.** `Math.abs(age) < 10 s`: a `createdAt` far in the future (server clock ahead, or untrustworthy data) stops polling as delayed instead of polling every second until that date. A small skew still polls.
- **The single-submit guard survives a remount.** Besides the synchronous ref, `submit` checks the mutation cache by `mutationKey`, so leaving the screen and coming back while a POST is in flight cannot send it again. Every mutation got a key, because expenses share the risk. The UI (group 4) reads that state to show the transfer as still sending.
- **`server` errors refetch too.** A 5xx or a 201 whose body cannot be trusted leaves the outcome unknown, like `network`.
- **Last gate checks the amount.** `useCreateTransfer` blocks an amount that is not a positive safe integer of cents (`invalidAmount`), since `canDebit(NaN, …)` passes; the form already guarantees it, this is defence in depth.
- **FX hardening.** Requests use `credentials: 'omit'` and `referrerPolicy: 'no-referrer'` (no added header, so still no preflight), and a rate outside 0,01–10.000.000 ARS is rejected as bad data.
- **Left as is:** a pending row with an unreadable date stops the list refresh (fails safe; dates are validated upstream). A Content-Security-Policy is a deployment concern: when the app is deployed, `connect-src` must list the API origin and `https://dolarapi.com`.

### Screen (group 4)
- **One route, three stages.** `/transferir` holds `stage: form | review | result` in local state; the stepper "Datos → Revisión → Resultado" shows it. On each stage change focus moves to that stage's heading. The form keeps its values when going back, and every "Editar"/"Corregir" action returns to Datos with focus on the field it names.
- **Copy lives in features.** `transferCopy.ts` maps the domain's reason codes and the submission outcomes to Spanish text (as `newMovementForm.ts` does); components only render it.
- **Confirm re-reads the source.** The confirm handler passes the source's current available from `useAccounts`, not the one captured when the draft was built (double-spend guard; see "Last debit check at confirm" above).
- **Blocked at confirm → back to Datos.** If the last debit check blocks the transfer (available dropped or became unknown since the review), nothing is sent and the user returns to Datos with the amount error and the refreshed available, as in "Nuevo movimiento".
- **Outcome map.** 201 → tracking (`processing`, `completed` "Acreditada", `delayed`, `failed` "Fallida" with a link to Movimientos). 422 → insufficient funds with the refreshed available ("Corregir monto"). 404 → "La cuenta destino no existe" ("Corregir destino": P2P tab, value kept). `validation`/`badRequest` → back to Datos with a generic alert. `network` and `server` → "No pudimos confirmar el envío": the outcome is unknown, so the user checks Movimientos before retrying (retry returns to the review; nothing is resent automatically).
- **Mismatch notice from the POST response only.** Shown when `transfer.to` is present and `canTransferBetween(transfer.from, transfer.to)` fails; the status query is never used for it (`to` is null there for P2P).
- **Remount while sending.** If a transfer POST is still in flight when the screen mounts (`useIsMutating` by `CREATE_TRANSFER_KEY`), a notice says a transfer is still being sent and the confirm action stays blocked until it ends; its result is then checked in Movimientos. Rejected: recovering the result from the mutation cache (more code for a rare path).
- **No eligible own account.** "Mis cuentas" shows an empty state with "Crear cuenta", which opens the existing `NewAccountForm` inline; once created, the account appears as a destination and the typed values are kept. Rejected: navigating to Home (loses the form).
- **Estimates.** A disabled other-currency destination shows the currency reason and, when the amount parses and rates are known, "≈ …, estimado al tipo de cambio oficial (fecha)". Home shows "Total estimado: ≈ $ …" under the per-currency balances, hidden while rates or any available amount are unknown.
- **Retry after an unknown outcome warns again.** "Reintentar" on "No pudimos confirmar el envío" returns to the review with a warning that the previous send may have gone through and a link to Movimientos; confirming is still the user's decision (found by the security review: the debit check alone only blocks a duplicate when funds no longer cover it).
- **Requests run while the browser reports offline.** Found in the manual run: with TanStack's default `networkMode: 'online'`, a confirm made offline paused the POST and sent it by itself when the connection came back (verified against the mock API), and the refetch awaited after an error kept the screen on "Enviando" meanwhile. The query client now uses `networkMode: 'always'` for queries and mutations: the request fails as `network` and the screen shows "No pudimos confirmar el envío". Rejected: keeping the pause and telling the user the transfer will be sent later (a send the user did not confirm at that moment).
- **Left as is after review:** the P2P id accepts any characters besides being trimmed and non-empty (no spec rule; it is rendered as text and the API answers 404 for unknown ids; a format or bidi-character rule would be a spec change); the confirm checks the cached available instead of refetching first (the server's 422 stays the authority and shows the refreshed figure); any 404 on create is reported as a missing destination (the source is always one of the user's accounts).
- **Descriptions are text.** Transfer descriptions (P2P ones are written by others) are rendered as React text only.
- **Deviations from the design handoff** (the specs win): other-currency own accounts are disabled, not allowed with a notice, so the "no convierte moneda" review warning never appears; the P2P review adds the currency warning the spec requires; a P2P id of an own account is treated as that own account (see "Domain details") instead of "Usa la opción Mis cuentas"; the amount error uses the spec's "Supera tu disponible de $ X"; the description limit is the API's 500 (`MAX_DESCRIPTION_LENGTH`), not 60. Left out because no spec requires them: the `^acc-\d+$` format check (the API answers 404) and an `Idempotency-Key` header (the mock API ignores it).

### Submission and tracking flow
1. `validateTransfer` gates "Revisar transferencia"; the review renders the `TransferDraft`.
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
