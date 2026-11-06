# Proposal

## Why

The wallet needs its foundation before transfers can exist: a session, a trustworthy view of each account's money, a browsable movement history, and the ability to record income and expenses. The provided API leaves several money rules to the client (verified against the running API; see `DECISIONS.md`, section 4): its balance ignores pending transfers, it accepts expenses that overdraw an account, it accepts amounts with more than 2 decimals, and some of its errors are HTML pages with stack traces. This change puts those rules in one framework-free place so the UI cannot get them wrong.

## What Changes

- Money handled as integer cents, parsed from user input and formatted in es-AR with currency.
- An HTTP client that turns every API failure (field errors, messages, HTML bodies, network errors) into a typed error the UI can show safely.
- Login, session persistence, logout, and automatic logout on 401.
- Accounts with three figures: API balance, **available** (balance − pending outgoing transfers) and **in progress**; minimal account creation, so an own-account transfer can be tested with the seed data.
- One debit rule (`canDebit`) shared by expenses here and transfers later.
- Movement list with filters, debounced search and pagination; create income/expense; edit category/description with the API's editability rules made explicit.

## Capabilities

### New Capabilities
- `money`: parsing, cents arithmetic, formatting and per-currency grouping of amounts.
- `api-client`: HTTP access to the mock API and normalization of its error responses.
- `session`: login, session persistence, logout and handling of expired/invalid sessions.
- `accounts`: account listing with balance/available/in-progress, the debit rule, and minimal account creation.
- `transactions`: movement listing (filters, search, pagination), creating income/expense, and editability rules.

### Modified Capabilities
<!-- none: first change in the project -->

## Non-goals

- Transfers, their status tracking and FX estimates (change `transfers`).
- Editing or deleting accounts; deleting movements (the API supports neither deletion).
- Grouping both sides of an own-account transfer into one row.

## Rejected alternatives

- **Trusting the API balance as "available"**: allows double-spend while a transfer is pending.
- **Letting expenses overdraw and only warning**: a wallet cannot spend money it does not have.
- **Floats for amounts**: the API stores `REAL`; `0.1 + 0.2 ≠ 0.3` is not acceptable for money.
- **Showing the server's error body**: malformed-JSON 400s return HTML with server paths.

## Impact

- New code in `src/domain` (money, balances, funds, editability), `src/api` (client, errors, endpoints) and `src/features` (auth, accounts, transactions hooks; UI pending the design).
- Depends on the mock API endpoints: `/auth/login`, `/accounts`, `/transactions`.
