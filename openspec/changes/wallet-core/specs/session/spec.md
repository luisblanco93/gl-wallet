# Spec Delta

## Purpose
Let a seed user sign in with email and password, keep the session across reloads, and end it safely.

## ADDED Requirements

### Requirement: Login
The system SHALL sign in with email and password via `POST /auth/login`, validating that both fields are present and the email is well-formed before sending.

#### Scenario: Successful login
- **WHEN** the user submits `demo@example.com` / `demo123`
- **THEN** the session stores the returned token and user, and the user lands on the home screen

#### Scenario: Wrong credentials
- **WHEN** the API responds 401
- **THEN** the form shows "Email o contraseña incorrectos" and keeps the entered email

#### Scenario: Invalid fields
- **WHEN** the email is malformed or a field is empty
- **THEN** the form shows per-field errors without calling the API

#### Scenario: Submitting
- **WHEN** the login request is in flight
- **THEN** the submit button is disabled and shows a loading state

### Requirement: Session persistence and logout
The system SHALL persist the session in `sessionStorage` so it survives a page reload and ends when the tab closes. Logout SHALL clear the session and all cached server data.

#### Scenario: Reload keeps the session
- **WHEN** the user reloads the page with a stored session
- **THEN** the user stays signed in

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** the token and every cached query are removed and the login screen is shown

### Requirement: Invalid session handling
Any `unauthorized` error on an authenticated request SHALL end the session and redirect to login with the message "Tu sesión terminó. Vuelve a iniciar sesión."

#### Scenario: Token rejected
- **WHEN** an authenticated request returns 401
- **THEN** the session is cleared and the login screen shows the session-ended message

### Requirement: Protected screens
Every screen except login SHALL require a session.

#### Scenario: Visiting a screen without a session
- **WHEN** a signed-out user opens the movements screen URL
- **THEN** the user is redirected to login
