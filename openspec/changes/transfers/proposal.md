# Proposal

## Why

Transfers are where the brief's three deliberate ambiguities live: the API does not convert currencies, transfers settle asynchronously (`pending` → `completed` ~1.5 s later, with no notification), and insufficient funds return 422. Verified behaviour adds more: two quick transfers can both pass the funds check (double-spend), and a transfer can stay `pending` forever if the server restarts. This change defines how the product resolves each one.

## What Changes

- Transfer form: source, destination (own same-currency account or another user's account id), amount, description.
- Cross-currency transfers blocked, with an estimated equivalence from an external FX source as reference.
- Review step before confirming; P2P warnings (irreversible, destination must match currency).
- Single submission; server outcomes (201, 422, 404, 400, network) mapped to clear states.
- Status tracking: poll until `completed`, stop after 10 s with "taking longer than usual".
- Estimated total in ARS on the home screen, labelled with source and date.

## Capabilities

### New Capabilities
- `transfers`: transfer form rules, review, submission, outcome handling and status tracking.
- `fx-estimate`: official exchange rates from an external source, conversion between ARS/USD/EUR, and labelled estimates.

### Modified Capabilities
<!-- none: `wallet-core` capabilities are reused (debit rule, money, api-client) without changing their requirements -->

## Non-goals

- Converting money: the API cannot credit a different amount on each side, so FX is informational only.
- Recipient lookup or contacts: the API exposes no other-user data.
- Cancelling or reversing a transfer: the API has no such endpoint.
- A fallback FX provider: if the estimate is unavailable it is hidden.

## Rejected alternatives

- **Allow cross-currency with a warning**: one click would create or destroy value (100.000 ARS credited as US$ 100.000).
- **Simulate conversion with an expense + an income**: not a transfer, not atomic, no `pending` state.
- **Refresh only when returning to the screen** or **show "processing" with no follow-up**: the user would not see the settlement, or would see stale data.
- **Let the server's 422 be the only funds check**: does not stop double-spend while a transfer is pending.

## Impact

- New domain modules: `currency`, `transferStatus`, `fx`; reuses `funds`, `money`, `balances` from `wallet-core`.
- New API calls: `POST /transfers`, `GET /transfers/:id`; external `GET https://dolarapi.com/v1/dolares/oficial` and `/v1/cotizaciones/eur`.
- Depends on change `wallet-core` (session, api-client, accounts, debit rule, movement list).
