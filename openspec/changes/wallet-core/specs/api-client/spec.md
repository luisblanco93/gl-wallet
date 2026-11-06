# Spec Delta

## Purpose
Access the mock API through one client that sends authentication and turns every failure into a typed, safe-to-display error.

## ADDED Requirements

### Requirement: Authenticated requests
The client SHALL send `Authorization: Bearer <token>` on every request except login, and SHALL send JSON bodies with `Content-Type: application/json` (the API ignores bodies without it).

#### Scenario: Request with an active session
- **WHEN** a request is made while a session exists
- **THEN** it carries the session token in the `Authorization` header

### Requirement: Error normalization
The client SHALL map every non-2xx response or network failure to exactly one error kind: `validation` (with per-field messages), `unauthorized`, `notFound`, `insufficientFunds`, `badRequest` (with a message), `server`, or `network`. It SHALL NOT expose a raw response body to the UI.

#### Scenario: Field validation error
- **WHEN** the API responds 400 with `{"errors":[{"field":"amount","message":"amount must be at least 0.01"}]}`
- **THEN** the error is `validation` with a message for the field `amount`

#### Scenario: Message error
- **WHEN** the API responds 400 with `{"error":"Transfers cannot be edited"}`
- **THEN** the error is `badRequest` carrying that message for logging, and the UI shows its own copy

#### Scenario: HTML error body
- **WHEN** the API responds with a non-JSON body (e.g. a 400 HTML page with a stack trace)
- **THEN** the error kind is derived from the status code only and the body is discarded

#### Scenario: API unreachable
- **WHEN** the request fails without a response (server down, CORS, offline)
- **THEN** the error is `network`

#### Scenario: Status mapping
- **WHEN** the API responds 401, 404 or 422
- **THEN** the error is `unauthorized`, `notFound` or `insufficientFunds` respectively

### Requirement: No retries on client errors
Data fetching SHALL NOT retry requests that failed with a 4xx response, and SHALL retry `network` and `server` errors at most once. Mutations SHALL never be retried automatically.

#### Scenario: 404 is not retried
- **WHEN** a query fails with `notFound`
- **THEN** no further request is made for that query until the user retries

#### Scenario: A mutation fails on the network
- **WHEN** creating a movement fails with `network`
- **THEN** it is not resent automatically, so money is never moved twice by a retry
