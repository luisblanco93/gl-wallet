# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project

Personal fintech wallet (Greelow Senior Frontend take-home): balances, movements, income/expenses and transfers (own accounts and P2P) over a provided mock REST API. Guiding principle: the user must always understand the real state of their money (available vs. in progress vs. settled).

- Stack: React 19 + TypeScript (strict), Vite, TanStack Query, Tailwind CSS v4, Vitest + Testing Library. npm only.
- Product decisions and their trade-offs: `DECISIONS.md`. Read it before changing behaviour.
- Specs: `openspec/changes/wallet-core` and `openspec/changes/transfers`. They are the source of truth for behaviour.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run
npm run lint
npm run typecheck
npm run build
```

Mock API (lives outside this repo, at `../mock-api`; never copy it in or modify it):

```bash
cd ../mock-api && npm install && npm run seed && npm run dev   # http://localhost:3000
```

Base URL comes from `VITE_API_URL` (see `.env.example`).

## Architecture rules

```
src/domain/    pure TypeScript business rules (money, balances, funds, editability, currency, transfer status, fx)
src/api/       HTTP client, DTO <-> domain mapping, error normalization; the only layer that knows API shapes
src/features/  per-capability hooks + components; call domain, hold no business rules
src/shared/ui/ generic presentational components (props only, no data fetching)
src/app/       providers, router, layout
```

- `src/domain` MUST NOT import React, `@tanstack/*`, `react-router`, `@/api`, `@/features`, `@/app`, `@/shared` or `@/config`. ESLint enforces it; never disable the rule.
- A new money or business rule goes in `src/domain` as a pure function with tests, never inside a hook or component.
- API DTO shapes never leave `src/api`.

## Money rules (non-negotiable)

- Amounts are integer cents internally. Convert to/from the API's decimal numbers only in `src/api`.
- Never add amounts of different currencies. Cross-currency figures are estimates and must be labelled as such.
- Available = balance − pending outgoing transfers. Every debit (expense or transfer) goes through `canDebit`.
- If available is unknown, debits are blocked (fail closed).
- Never display a raw API response body; use the normalized `ApiError` kinds.
- Mutations are never retried automatically.

## Working agreement

- **Plan, then spec:** changes that touch several files or add behaviour are planned and approved first, and start in their OpenSpec change (`openspec validate --all --strict` must pass).
- **Keep it simple:**
  - Every file, abstraction or dependency must trace back to a spec requirement or a decision in `DECISIONS.md` or an OpenSpec `design.md`.
  - A new dependency needs a one-line justification in the relevant `design.md`; prefer the platform and what is already installed.
  - No abstraction before the second real use; no options, flags or extension points "for later".
  - Don't add features, screens or bonus items that are not in the specs.
  - When in doubt, choose the smaller change and say what was left out.
- **TDD for domain code:** write the failing test from the spec scenario, then implement. Tests live next to the code (`*.test.ts`).
- **Done means:** `npm run typecheck && npm run lint && npm test` green, reported with the actual result. UI changes are also checked in the running app.
- **Evidence over assumptions:** never state a mock API behaviour without reading `../mock-api/index.ts` or reproducing it against the running API.
- **Git:** do not commit, push or branch unless the user asks. Conventional commits. `.claude/`, `CLAUDE.md` and the mock API are never committed.
- **Mock API:** never modify it or copy it into this repo. Running it is fine; reseed (`npm run seed`) after destructive probes. Temporary scripts stay out of the repo.

## Keeping the record

- New product decision → record it in the OpenSpec change's `design.md` (decision, rationale, rejected alternatives). If it is a significant trade-off, add it to `DECISIONS.md`.
- AI suggestion accepted, modified or rejected for a non-obvious reason → add it to `PROMPT_LOG.md`.

## Language

- Code, specs (OpenSpec) and this file: English.
- Deliverables (`README.md`, `DECISIONS.md`, `PROMPT_LOG.md`) and UI copy: Spanish. Amounts and dates are formatted with the es-AR locale (`$ 1.234,56`).
