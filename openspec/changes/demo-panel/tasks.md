# Tasks

## 1. Interceptor

- [x] 1.1 `demoFaults` tests: pass-through when off; "Se pierde la respuesta" sends then fails; 400 and 422 are not sent; "Sesión vencida" skips login and turns itself off; "No cargan los pendientes" fails only that request; transfer status rewrite; FX scenarios; then implement

## 2. State and wiring

- [x] 2.1 `demoState` store, scenario copy, `DemoToolsContext` and the five-tap gesture
- [x] 2.2 `demoToolsEnabled` flag, `fetch` wrapping and lazy panel in `providers.tsx`; `.env.example`

## 3. UI

- [x] 3.1 `Brand` optional click (button, pointer, lift, reduced motion) used by `AppShell` and `LoginPage`
- [x] 3.2 Panel: fixed at the top, slides down, pushes content (`--demo-panel-h`), groups with switches, count, "Apagar todo", close, Escape; strip while closed with scenarios on
- [x] 3.3 Component test: five taps open the panel, Escape closes it, a scenario shows the strip

## 4. Verification

- [x] 4.1 `npm run typecheck && npm run lint && npm test` green; production build without the flag has no demo code
- [ ] 4.2 Browser run against the mock API: connection, server, slow, invalid response, session, pending, response lost, server validation, FX; reseed afterwards
- [ ] 4.3 Browser run of the transfer scenarios (422, delayed, failed, tracking fails), after transfers group 4
