# Spec Delta

## ADDED Requirements

### Requirement: Availability
The demo tools SHALL be available when the app runs with `npm run dev`, and in a production build only when it is built with `VITE_DEMO_TOOLS=true`. When they are not available, the panel and the request interceptor SHALL NOT be part of the bundle, and the logo SHALL look and behave as before.

#### Scenario: Production build without the flag
- **WHEN** the app is built without `VITE_DEMO_TOOLS=true`
- **THEN** the logo is static (no pointer cursor, no lift, no gesture) and requests go straight to `fetch`

#### Scenario: Development
- **WHEN** the app runs with `npm run dev`
- **THEN** the logo gesture opens the panel on the login screen and inside the app

### Requirement: Logo gesture
When the demo tools are available, the logo SHALL be a button that shows a pointer cursor and lifts very slightly on hover. Five activations within 2 seconds SHALL toggle the panel. With reduced motion requested, the logo SHALL NOT move.

#### Scenario: Open with five taps
- **WHEN** the user taps or clicks the logo five times within 2 seconds
- **THEN** the panel opens; five more taps close it

#### Scenario: Fewer taps
- **WHEN** the user taps the logo fewer than five times, or the taps are more than 2 seconds apart
- **THEN** nothing opens

### Requirement: Panel layout
The panel SHALL slide down from the top of the viewport, stay fixed there, and push the page content down by its own height instead of covering it. It SHALL group the scenarios with labelled switches, show how many are on, and offer "Apagar todo" and a close button; Escape inside the panel SHALL close it. While at least one scenario is on and the panel is closed, a thin fixed strip SHALL say that a simulation is active, with actions to open the panel and to turn everything off; the strip also pushes the content down. With reduced motion requested, the panel SHALL appear without sliding.

#### Scenario: Open the panel
- **WHEN** the panel opens
- **THEN** it slides in from the top and the page content moves down by the panel's height, with nothing hidden under it

#### Scenario: Close with a simulation on
- **WHEN** the panel is closed while a scenario is on
- **THEN** a strip reading "Simulación activa" with the number of scenarios stays at the top until every scenario is off

#### Scenario: A detail panel is open
- **WHEN** a movement detail (modal dialog) is open
- **THEN** the demo panel is covered and inert until the dialog closes (accepted limitation of the modal top layer)

### Requirement: Scenario state
Scenarios SHALL be kept in memory only, so a reload turns every scenario off. A scenario SHALL stay on until the user turns it off, so the client's single retry of `network` and `server` errors cannot hide it, except "Sesión vencida", which turns itself off after the first rejected request. Turning a scenario on or off SHALL refetch the queries on screen, so its effect is visible without navigating.

#### Scenario: Retry does not hide a failure
- **WHEN** "Error del servidor" is on and a query fails
- **THEN** the automatic retry fails too and the screen shows its error state

#### Scenario: Reload
- **WHEN** the user reloads the page with scenarios on
- **THEN** every scenario is off

### Requirement: Simulated failures pass through the real client
Every scenario SHALL be produced at the `fetch` level, so the response goes through the same parsing, error mapping, retries, session handling and refetches as a real one. With every scenario off, requests and responses SHALL pass through unchanged. Each scenario SHALL affect only the requests it names.

#### Scenario: Everything off
- **WHEN** no scenario is on
- **THEN** every request reaches `fetch` with the same URL and options, and its response reaches the client unchanged

#### Scenario: Connection and server
- **WHEN** "API sin conexión" is on
- **THEN** wallet API requests fail as a network error without being sent (api-client: *API unreachable*)
- **WHEN** "Error del servidor" is on
- **THEN** wallet API requests get a 500 with an HTML body (api-client: *HTML error body*)
- **WHEN** "Respuesta lenta" is on
- **THEN** wallet API requests are delayed 3 seconds before being sent (session: *Submitting*; transactions: *Double submit*)
- **WHEN** "Respuesta inválida" is on
- **THEN** wallet API `GET` requests get a 200 without a JSON body (api-client: *Untrustworthy success response*)

#### Scenario: Session
- **WHEN** "Sesión vencida" is on
- **THEN** the next request that carries a token gets a 401 and the session ends as expired; login requests are not affected (session: *Token rejected*)

#### Scenario: Balances
- **WHEN** "No cargan los pendientes" is on
- **THEN** only the pending-transfers request fails with a server error, available is unknown and debits are blocked (accounts: *Pending transfers cannot be loaded*)

#### Scenario: Operations
- **WHEN** "Se pierde la respuesta" is on
- **THEN** wallet API `POST` and `PATCH` requests other than login are sent for real and then fail as a network error, so the operation may have happened (transactions: *Request fails*; transfers: *Network failure*)
- **WHEN** "Validación del servidor" is on
- **THEN** creating an account or a movement, or editing a movement, gets a 400 with a field error without being sent (accounts: *Server validation error*; transactions: *Server rejects the edit*)

#### Scenario: Transfers
- **WHEN** "Fondos insuficientes en el servidor" is on
- **THEN** `POST /transfers` gets a 422 without being sent (transfers: *Server rejects for funds*)
- **WHEN** "Liquidación demorada" is on
- **THEN** `GET /transfers/:id` responses report `pending` (transfers: *Settlement never happens*)
- **WHEN** "Transferencia fallida" is on
- **THEN** `GET /transfers/:id` responses report `failed` (transfers: *Transfer fails*)
- **WHEN** "Falla el seguimiento" is on
- **THEN** `GET /transfers/:id` fails as a network error (transfers: *Polling request fails*)
- **AND** for the three tracking scenarios the panel notes that the mock API still settles the transfer, so balances and Movements show the real outcome

#### Scenario: Exchange rates
- **WHEN** "Cotización no disponible" is on
- **THEN** requests to the FX source fail as a network error (fx-estimate: *FX source unreachable*)
- **WHEN** "Cotización con datos inválidos" is on
- **THEN** the FX source answers 200 with an unexpected JSON shape (fx-estimate: *Unexpected response shape*)
