# Spec Delta

## Purpose
Let users browse, record and edit their movements, with the API's editability rules stated explicitly in the UI.

## ADDED Requirements

### Requirement: Movement list
The system SHALL list movements of all accounts or of one account, newest first, with filters (account, type, category, status), a search on description debounced by 300 ms, and pagination of 10 items showing "Mostrando X–Y de N". Changing a filter or the search SHALL reset to page 1. Each row SHALL show category, description, account, date, signed amount with currency, and status.

#### Scenario: Filter by account
- **WHEN** the user filters by Cuenta Pesos
- **THEN** only movements of that account are listed and the counter reflects the filtered total

#### Scenario: Pending movement
- **WHEN** a listed movement has status `pending`
- **THEN** its row shows a "Pendiente" badge with icon and text, not color alone

#### Scenario: Failed movement
- **WHEN** a listed movement has status `failed`
- **THEN** its row shows a "Fallida" badge with icon and text, and it is not counted as in progress

#### Scenario: No results for the filters
- **WHEN** the filters match nothing
- **THEN** an empty state with "Limpiar filtros" is shown

#### Scenario: No movements at all
- **WHEN** the user has no movements
- **THEN** an empty state invites to register the first movement

#### Scenario: Loading and errors
- **WHEN** the list is loading or fails
- **THEN** a skeleton or an error state with "Reintentar" is shown

### Requirement: Transfer rows are labelled
Transfer rows SHALL show their direction and counterpart: "Transferencia a …" for outgoing and "Transferencia desde …" for incoming, using the account name when the counterpart is one of the user's accounts and the raw account id otherwise.

#### Scenario: Own-account transfer
- **WHEN** a transfer from Cuenta Pesos to Ahorro is listed
- **THEN** the rows read "Transferencia a Ahorro" (Cuenta Pesos) and "Transferencia desde Cuenta Pesos" (Ahorro)

#### Scenario: Transfer to another user
- **WHEN** a transfer to `acc-4` is listed
- **THEN** the row reads "Transferencia a acc-4"

### Requirement: Create income or expense
The system SHALL register an income or an expense via `POST /transactions` with account, type, amount, category and optional description (max 500 characters). The `transfer` category SHALL NOT be selectable. An expense SHALL pass the debit rule before it is sent. On success, accounts and movements SHALL refresh.

#### Scenario: Valid expense
- **WHEN** the user records an expense of $ 5.000 from Cuenta Pesos with $ 855.000 available
- **THEN** the movement is created as completed and the available amount becomes $ 850.000

#### Scenario: Expense above available
- **WHEN** the user enters an expense of US$ 1.000 on Cuenta Dólares with US$ 440 available
- **THEN** the amount field shows "Supera tu disponible de US$ 440,00", submit is disabled, and no request is sent

#### Scenario: Income is never blocked by funds
- **WHEN** the user records an income of any valid amount
- **THEN** the debit rule is not applied

#### Scenario: Request fails
- **WHEN** the API responds with a `validation` or `network` error
- **THEN** field errors or a connection error are shown, the form keeps its values, and the user can resubmit

### Requirement: Editability rules
The system SHALL allow editing only `category` and `description`, and only for income and expense movements, via `PATCH /transactions/:id`. The amount SHALL be shown read-only with the reason it cannot change. Transfers SHALL show why they cannot be edited instead of a form.

#### Scenario: Edit an expense
- **WHEN** the user changes the category of "Supermercado" to "Otros"
- **THEN** the change is saved and the list shows the new category

#### Scenario: Open a transfer
- **WHEN** the user opens the detail of a transfer
- **THEN** no edit form is shown and the detail explains that transfers cannot be modified

#### Scenario: Server rejects the edit
- **WHEN** the API responds `badRequest` to an edit
- **THEN** an error message is shown and the original values are kept
