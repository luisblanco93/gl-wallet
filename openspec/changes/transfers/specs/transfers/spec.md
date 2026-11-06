# Spec Delta

## Purpose
Move money between the user's accounts or to another user's account, making every state of the operation (validating, sending, processing, settled, delayed, rejected) explicit.

## ADDED Requirements

### Requirement: Destination selection
The user SHALL choose the destination either among their own accounts or by entering another user's account id. Own accounts in a different currency than the source SHALL be shown disabled with the reason. The source account SHALL NOT be a selectable destination. A P2P account id SHALL be non-empty and different from the source.

#### Scenario: Own account in another currency
- **WHEN** the source is Cuenta Pesos (ARS) and the user opens "Mis cuentas"
- **THEN** Cuenta Dólares is disabled with "Moneda distinta: no se puede transferir entre ARS y USD"

#### Scenario: No eligible own account
- **WHEN** the user has no other account in the source's currency
- **THEN** an empty state explains why and offers "Crear cuenta"

#### Scenario: Invalid P2P id
- **WHEN** the P2P id is empty or equals the source account id
- **THEN** a field error is shown and the user cannot continue

### Requirement: Amount validation
The amount SHALL be parsed with the money rules and SHALL pass the debit rule against the source's available amount before the user can continue. While the source's available amount is unknown, the transfer SHALL be blocked.

#### Scenario: Amount above available
- **WHEN** the user enters $ 900.000 from Cuenta Pesos with $ 855.000 available
- **THEN** the field shows "Supera tu disponible de $ 855.000,00" and the user cannot continue

#### Scenario: Available reduced by a pending transfer
- **WHEN** a previous transfer of $ 500.000 from the same account is still pending and the user enters another $ 500.000 on a $ 720.000 balance
- **THEN** the amount is rejected against an available of $ 220.000

### Requirement: Review before confirming
Before sending, the system SHALL show a review with source, destination, amount and description. For P2P transfers it SHALL warn that transfers cannot be reversed and that the destination account must be in the source's currency.

#### Scenario: P2P review
- **WHEN** the user reviews a transfer of $ 5.000 to `acc-4`
- **THEN** the review shows both warnings and a confirm action, and nothing has been sent yet

#### Scenario: Go back to edit
- **WHEN** the user goes back from the review
- **THEN** the form keeps all entered values

### Requirement: Single submission
While a transfer request is in flight, the system SHALL NOT send another transfer: the confirm action SHALL be disabled and repeated activations ignored.

#### Scenario: Double click on confirm
- **WHEN** the user activates confirm twice quickly
- **THEN** exactly one `POST /transfers` is sent

### Requirement: Submission outcomes
The system SHALL map the transfer response to one outcome:
- 201: start status tracking
- `insufficientFunds` (422): show insufficient funds with the refreshed available amount, refetch balances, and let the user correct the amount
- `notFound` (404): "La cuenta destino no existe", and let the user correct the destination
- `validation` / `badRequest` (400): field errors or a generic message on the form
- `network`: a connection error, with the form intact; the transfer is NOT resent automatically

#### Scenario: Server rejects for funds
- **WHEN** the client check passed but the API responds 422
- **THEN** accounts are refetched and the user sees the insufficient-funds state with the updated available amount

#### Scenario: Destination does not exist
- **WHEN** the API responds 404 for destination `acc-999`
- **THEN** the user sees "La cuenta destino no existe" and returns to the destination field with the value kept

#### Scenario: Network failure
- **WHEN** the request fails without a response
- **THEN** a connection error is shown and the user decides whether to retry, after checking Movements

### Requirement: Status tracking
After a 201, the system SHALL show the transfer as "Procesando" (text, not only a spinner) and poll `GET /transfers/:id` every 1 s. On `completed` it SHALL show "Acreditada", announce the change to assistive technology, stop polling, and refresh accounts, pending transfers and movements. If the transfer is still `pending` 10 s after creation, it SHALL stop polling and show "Está tardando más de lo normal" with a link to Movements. The polling decision SHALL be a pure function of status and elapsed time.

#### Scenario: Normal settlement
- **WHEN** the transfer becomes `completed` 1.5 s after creation
- **THEN** the screen changes from "Procesando" to "Acreditada" and balances are refreshed

#### Scenario: Settlement never happens
- **WHEN** the transfer is still `pending` after 10 s
- **THEN** polling stops and "Está tardando más de lo normal" is shown

#### Scenario: Polling request fails
- **WHEN** a status request fails with `network` before 10 s
- **THEN** polling continues on the next tick; the transfer is not shown as failed

### Requirement: P2P currency mismatch notice
If the transfer response shows a destination currency different from the source, the system SHALL inform the user that the same amount was credited without conversion.

#### Scenario: Destination turns out to be USD
- **WHEN** an ARS transfer to another user's account returns a destination side in USD
- **THEN** the result shows "La cuenta destino resultó ser en USD: se acreditó el mismo monto sin conversión"

### Requirement: Movement list reflects settlement
While the movement list shows rows with status `pending`, it SHALL refresh every 1 s, applying the same 10 s cap counted from the newest pending row's creation time.

#### Scenario: Pending row settles while the list is open
- **WHEN** the list shows a pending transfer that settles
- **THEN** its badge changes to completed without user action

#### Scenario: Stuck pending row
- **WHEN** every pending row is older than 10 s
- **THEN** the list stops auto-refreshing and keeps showing them as pending
