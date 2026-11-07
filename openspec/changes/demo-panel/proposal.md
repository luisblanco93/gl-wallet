# Proposal

## Why

Most of the behaviour that matters in a wallet only shows up when something goes wrong: the API is down, a session expires, pending transfers cannot be loaded and debits must fail closed, a response is lost after the server already moved the money, a transfer never settles. The specs define all of these, but the mock API cannot produce most of them on demand (it has no failure switches and must not be modified). Demonstrating them today means stopping servers or blocking hosts in devtools at the right millisecond.

## What Changes

- A hidden demo panel, opened by tapping the logo five times, that turns failure scenarios on and off.
- The scenarios are injected at the single `fetch` the app already receives, so every one of them runs through the real client, error mapping, retries, session handling and refetches.
- The panel slides down from the top, stays fixed and pushes the page content down instead of covering it. While any scenario is on and the panel is closed, a thin strip says so.
- Available in `npm run dev`; in a production build only with `VITE_DEMO_TOOLS=true`. Without it, neither the panel nor the interceptor is in the bundle.

## Capabilities

### New Capabilities
- `demo-tools`: the hidden panel, its activation, and the failure scenarios it can simulate.

### Modified Capabilities
<!-- none: every scenario exercises an existing requirement without changing it -->

## Non-goals

- New error handling or copy: the panel only triggers behaviour the specs already define.
- Server-side state changes (reseeding, settling or failing a transfer in the database): the mock API is not modified.
- Scenarios already reachable by normal use (destination not found with an unknown P2P id, empty results with filters).
- Persisting scenarios across reloads.

## Rejected alternatives

- **Forcing UI states from the panel** (mocking hooks): the demo would show screens, not prove the error paths work.
- **A keyboard shortcut or a `?demo` URL parameter**: the product owner chose the logo gesture, which also works on mobile.
- **Shipping it in every build**: a fault injector in production is attack surface and dead weight; an explicit build flag keeps it opt-in.

## Impact

- New: `src/api/demoFaults.ts` (interceptor), `src/features/demo/` (state, logo gesture, panel).
- Changed: `src/app/providers.tsx` (wiring), `src/config.ts` (flag), `src/shared/ui/Brand.tsx` (optional click), `AppShell` and `LoginPage` (pass the gesture to the logo), `.env.example`.
- No change to `src/domain` or to any existing requirement.
