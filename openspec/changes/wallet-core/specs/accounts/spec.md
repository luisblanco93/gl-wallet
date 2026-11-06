# Spec Delta

## Purpose
Show each account's money truthfully (settled vs. available vs. in progress), enforce one debit rule, and allow creating an account.

## ADDED Requirements

### Requirement: Account balances
The system SHALL list the user's accounts with three figures in the account's currency: the API `balance` (settled), **in progress** (sum of the account's outgoing transfers with status `pending`) and **available** (`balance − in progress`). Pending outgoing transfers SHALL be read from `GET /transactions?type=transfer&status=pending` and filtered by `direction = out` and account.

#### Scenario: No pending transfers
- **WHEN** Cuenta Pesos has balance $ 855.000 and no pending outgoing transfers
- **THEN** available is $ 855.000 and no "in progress" line is shown

#### Scenario: A transfer is pending
- **WHEN** Cuenta de Ana has balance $ 720.000 and a pending outgoing transfer of $ 500.000
- **THEN** available is $ 220.000 and "En proceso: −$ 500.000,00" is shown

#### Scenario: Pending transfers cannot be loaded
- **WHEN** the accounts load but the pending-transfers request fails
- **THEN** the balance is shown, available is shown as unknown with a retry action, and debits from that account are blocked until it is known

#### Scenario: Loading and errors
- **WHEN** the accounts request is in flight or fails
- **THEN** a skeleton or an error state with "Reintentar" is shown, never a zero balance

### Requirement: Debit rule
The system SHALL allow a debit only when `amount ≤ available` for the source account. The rule SHALL return either `ok` or `insufficient` with the current available amount, and SHALL be the single rule used by expenses and transfers.

#### Scenario: Amount within available
- **WHEN** debiting $ 100.000 from an account with $ 220.000 available
- **THEN** the result is `ok`

#### Scenario: Amount above available
- **WHEN** debiting $ 300.000 from an account with $ 220.000 available
- **THEN** the result is `insufficient` with available $ 220.000

#### Scenario: Exactly the available amount
- **WHEN** debiting exactly the available amount
- **THEN** the result is `ok`

### Requirement: Account creation
The system SHALL let the user create an account with a name (2–100 characters) and a currency (ARS, USD or EUR) via `POST /accounts`, stating before submission that the currency cannot be changed later. On success the account list SHALL refresh.

#### Scenario: Create a second ARS account
- **WHEN** the user creates "Ahorro" in ARS
- **THEN** the new account appears with balance $ 0,00 and can be chosen as a transfer destination from Cuenta Pesos

#### Scenario: Invalid name
- **WHEN** the name has fewer than 2 characters
- **THEN** a field error is shown without calling the API

#### Scenario: Server validation error
- **WHEN** the API responds with a `validation` error
- **THEN** the messages are shown on the matching fields
