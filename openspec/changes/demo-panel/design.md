# Design

## Context

`src/app/providers.tsx` builds the services with one `fetch`, used by the wallet API client and by the FX client. That is the only seam needed: wrapping it reproduces any server or network behaviour without touching the mock API or any feature code.

## Goals / Non-Goals

**Goals:**
- Every scenario runs through the real client code (`readJson`, `toApiError`, `onUnauthorized`, `shouldRetry`, the outcome refetches).
- Off means off: an inactive interceptor is a pass-through, and an unavailable one is not in the bundle.

**Non-Goals:**
- Changing any existing requirement, copy or error handling.
- Making the mock API's database agree with a simulated transfer status.

## Decisions

### Layers
| Where | What | Why |
|---|---|---|
| `src/api/demoFaults.ts` | `withDemoFaults(fetch, options)`: matches requests by URL, method and token, and returns fake responses or rewrites real ones | It knows paths and DTO shapes (`{ transfer: { status } }`, `{ errors: [...] }`), which never leave `src/api` |
| `src/features/demo/demoState.ts` | In-memory store: which scenarios are on and whether the panel is open (`subscribe`/`getSnapshot` for `useSyncExternalStore`, as `SessionStore`) | Plain TypeScript shared by the interceptor and the UI |
| `src/features/demo/scenarios.ts` | Spanish labels, groups and hints for each scenario | Copy lives in features |
| `src/features/demo/useDemoLogoTap.ts` + `DemoToolsContext` | The five-tap gesture; `undefined` when the tools are off | `AppShell` (app) and `LoginPage` (features) both render the logo; features must not import `app` |
| `src/features/demo/DemoPanel.tsx` | The panel and the strip, loaded with `lazy()` | Kept out of the main chunk |
| `src/app/providers.tsx` + lazy `src/app/DemoProviders.tsx` | Wraps `fetch`, provides the store, renders the panel and the content wrapper | Wiring only |

`src/domain` is not involved: no money rule changes.

### Build flag
`config.ts` exports `demoToolsEnabled = import.meta.env.DEV || import.meta.env.VITE_DEMO_TOOLS === 'true'`. The demo provider's dynamic import uses the equivalent literal Vite environment expression directly, because an imported constant can leave orphan dynamic chunks in Vite 8 output; the logo hook is selected at module scope so React hook order stays stable and Rollup can discard it when disabled. Context construction is marked pure to allow removing the unused module. Every demo runtime dependency is removed when disabled, so Rollup drops the interceptor, the store and the panel from a build without the flag; verified by searching the built bundle for the scenario labels. Rejected: always shipping it hidden (a fault injector in production) and dev-only (a reviewer using `npm run build && npm run preview` could not see it).

### Matching rules
- Wallet and FX matching compares parsed origins and normalized path boundaries against `config.apiUrl` and `FX_BASE_URL`. Lookalike origins and adjacent prefixes such as `/api2` pass through. Request objects retain their method and authorization headers unless the init argument overrides them.
- Order, first match wins: delay ("Respuesta lenta", then continues), "API sin conexión", "Sesión vencida", "Error del servidor", "No cargan los pendientes", "Respuesta inválida", operation scenarios, transfer scenarios. So "API sin conexión" beats everything, as a real outage would.
- "Sesión vencida" applies only to requests with an `Authorization` header, so login keeps meaning "wrong credentials" on 401. It turns itself off when it fires; otherwise logging in again would loop back to the login screen.
- "Se pierde la respuesta" sends the real request and then throws, the case behind DECISIONS.md §4 (check Movements before retrying). Fake 400 and 422 are not sent: a real rejection creates nothing.
- The 400 names a field the form already maps to Spanish copy: `name` (accounts), `amount` (new movement), `description` (edit). The API's English message never reaches the UI, as with real errors.
- Network failures throw `TypeError('Failed to fetch')`, what browsers throw.

### Scenario lifetime
Scenarios stay on until turned off, because queries retry `network` and `server` once (`shouldRetry`) and a one-shot failure would be retried away. They live in memory, so a reload never leaves a scenario on by surprise. Turning one on or off calls `queryClient.invalidateQueries()`, which refetches what is on screen.

### Tracking scenarios disagree with the server
The mock API settles every transfer 1.5 s after creating it. Rewriting `GET /transfers/:id` makes the tracker reach "Está tardando más de lo normal" or "Fallida", but `GET /transactions` and the balances still show the settled transfer. Rewriting the list too was rejected: the balance already includes the debit, so marking it pending would subtract it twice from available, showing wrong money. The panel says so next to those scenarios.

### Layout
- The panel is `position: fixed` at the top. A fixed element does not push anything, so a `ResizeObserver` publishes the visible height (panel, strip or 0) as `--demo-panel-h` on `<html>`, and the wrapper around the app uses it as `padding-top`. Both transitions last the same, so content and panel move together; `motion-reduce` disables both.
- The panel stays mounted and is `inert` and translated out of view when closed, so it can slide out as well as in.
- A movement detail is a modal `<dialog>`: the browser's top layer covers the demo panel and makes it inert. Accepted; close the detail to use the panel.
- The shell's skip link is absolutely positioned; the shell root becomes `relative` so the link moves down with the content.

### Logo
`Brand` takes an optional `onClick`. With it, the logo renders as a `<button>` named "Wallet" with `cursor-pointer` and a lift on hover (`-translate-y-0.5`, a soft shadow, 150 ms; no movement with reduced motion). Without it, it renders exactly as before. Five activations within 2 s toggle the panel; the keyboard works too (Enter or Space on the focused logo).

## Risks / Trade-offs

- Manual transfer-scenario verification remains pending for the user; the transfer screen is now integrated on main.
- The panel adds one fixed layer at `z-40`; toasts (`z-20`) and the bottom navigation are not affected because the content is pushed, not covered.

### Verification handoff

- The user requested to perform functional verification themselves. Do not add further tests or browser probes for this block. Existing tests written before that instruction are retained; tasks 4.2 and 4.3 stay open for the user. No manual browser coverage is claimed.
- An isolated mock process was briefly started with the original source and a temporary database in `/tmp`, then stopped before any browser probes. The regular mock API and its database were not modified or reseeded.

### Integration on main

- Integrate the worktree implementation using a three-way reconciliation against its common ancestor; preserve the newer transfer implementation and local UI refinements on main. The source worktree remains unchanged.
- Use the current Wallet brand for the interactive logo and its accessible name; keep the home heading visually hidden as already requested. No new dependency or money rule is introduced.
