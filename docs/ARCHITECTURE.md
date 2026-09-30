# ArreyX architecture — Phase 1

## Scope and requirements
The first milestone is a responsive frontend prototype with realistic, explicitly simulated quotes and transactions. It does not connect a real wallet, request approvals, move funds, or claim live prices. All-route discovery means all routes exposed by configured providers, never a claim to discover every on-chain path. Real execution, cross-chain tracking, monitoring and production security review are subsequent milestones.

## Product and technical boundaries
1. Next.js App Router + React + strict TypeScript: server-rendered shell with a focused interactive swap workspace. Phase 1 exports static assets; Phase 2 removes static export to add server route handlers.
2. Native HTML dialog: accessible top-layer modal focus, Escape, and keyboard behavior. Lucide supplies consistent interface icons. CSS custom properties implement the design system; no utility framework or animation library is needed for this milestone.
3. Wallet layer: Phase 1 uses an explicitly labeled demo session. Phase 2 adds wagmi, viem, WalletConnect and TanStack Query for account/chain subscriptions, RPC reads and receipt tracking. No private keys or seed phrases are collected.
4. Token system: curated records identified by chain ID plus address/native identity. Mock asset IDs cannot be used for signing. Production registries must independently validate every address and decimal count; pasted unknown contracts require a separate unverified-token acknowledgment.
5. Chain registry: central chain ID, name, symbol, explorer, RPC environment key and provider support. Demo Ethereum, Arbitrum and Base are enabled. Adding a chain requires provider capability validation, not just a new menu option.
6. Quote engine: UI calls an orchestrator, never a vendor SDK. Providers run concurrently with timeout and cancellation, validate and normalize routes, deduplicate, rank and return per-provider failures. The hook debounces inputs, cancels superseded requests, refreshes at expiry and prevents stale quotes from being reviewed.
7. Provider interface: supported chains/tokens, quote/route discovery, normalization, time estimate, transaction construction. Phase 1 providers explicitly refuse transaction construction.
8. Scoring: compare output value minus external network, protocol and bridge costs using bigint USD micros. Fees embedded in output must not be subtracted again. Deterministic tie-break by time/reliability. Fastest and lowest-gas modes reuse those metrics. Store human-readable scoring reasoning.
9. Backend: Phase 2 POST /api/quotes validates bounded input using Zod, enforces timeouts and per-client rate limits, forwards only known provider parameters, keeps keys server-only and returns normalized versioned JSON. Bigints serialize as decimal strings. No arbitrary URL forwarding. Short cache key includes chain IDs, token identities, amount, slippage, mode and taker; never reuse cached transaction data for execution.
10. State: local reducer for transaction transitions; dedicated quote hook for asynchronous lifecycle; local React state for controls. No global store until multiple independent screens need shared state. Activity is session-local in Phase 1, clearly simulated. Future records are keyed by account, chain and tx hash, reconciled from receipts/provider status after reload.
11. Security: separate display quotes from executable transactions. Validate chain, recipient, token amounts, spender, transaction target, value, expiry, calldata provenance, and simulation results at execution. Verify allowance target against chain-specific allowlists; never approve a spender solely because an API supplied it. Use exact allowance, handle zero-reset tokens, wait for confirmed receipt, then re-quote. Compare minimum output before signing. Handle replacement, reorgs, rejected signatures and disconnects explicitly. Cross-chain tracking survives browser closure via backend reconciliation.
12. Observability: anonymous quote latency/provider failures without wallet-linked behavioral tracking. Redact wallet addresses and provider payloads from ordinary logs. Add opt-in production telemetry after privacy review.

## First live provider
Use 0x Swap API v2 AllowanceHolder for initial same-chain execution. It provides a documented quote/transaction and allowance flow behind one integration. It is selected for integration scope, not an unmeasured claim of superior execution. Only approve verified AllowanceHolder targets, never Settler. An API key, current contract registry verification and end-to-end fork tests are required before enabling live execution. Add another provider only after quote, allowance, rejection and receipt tests pass. Consider LI.FI separately for cross-chain support after its current integration and recovery semantics are reviewed.

Official references checked September 30, 2026:
- https://docs.0x.org/docs/introduction/quickstart/swap-tokens-with-0x-swap-api
- https://docs.0x.org/docs/core-concepts/contracts
- https://nextjs.org/docs/app/getting-started/installation

## Models and structure
Canonical, executable TypeScript models: `src/types/domain.ts`.

```
src/app/{layout,page,globals.css}
src/components/{exchange,token-input,dialogs,route-panel}.tsx
src/config/registry.ts
src/hooks/use-quotes.ts
src/lib/amounts.ts
src/routing/{engine,mock-provider}.ts
src/types/domain.ts
src/transaction/machine.ts
tests/{routing,transaction}.test.ts
docs/ARCHITECTURE.md
```
Phase 2 adds `src/server/providers/zero-x.ts`, quote route handlers, schema validation and `src/lib/web3/` without changing the presentation contract.

## State machine
Wallet: disconnected → connecting → connected; failure returns disconnected with a message. Account/chain changes invalidate quotes and prepared transactions.

Quotes: empty → quoting → ready | no-route | failed. Editing or expiry returns quoting; input validation errors prevent requests. Superseded responses never replace the current quote.

Transactions: idle → review → approval-required (ERC20) → approval-pending → approval-confirmed → awaiting-signature → submitted → pending → success. Native assets skip approval. Cross-chain model reserves bridge-pending and destination-pending. A signature rejection or execution failure goes to failed. Expired review goes to expired. Terminal states can reset to idle. Invalid transitions are rejected. Demo review explicitly freezes the reviewed quote for simulation; live mode must revalidate immediately before each signature.

## Original visual direction
Charcoal canvas (#101113), graphite surfaces (#191b1f), warm-white text (#f2f2f4), muted gray (#9a9da6), cobalt action (#5267ff). Green indicates a quoted recommendation or completed state, not decorative trust claims. One angular A/X mark; no borrowed mascots or brand assets.

DM Sans typography with a system sans fallback; 14–16px labels, 34–42px amount values, tabular numerals. Spacing scale 4/8/12/16/20/24/32/40/48/64. Borders are subtle, surface shadows minimal, corners 12–20px. Primary filled cobalt buttons, neutral secondary actions and text tertiary actions have visible focus and disabled states. Amount fields use decimal input mode and always show units. Desktop places a compact route inspector beside the swap workspace, not a trading terminal. Mobile stacks it beneath the trade, uses 44px targets, and bottom sheets for selectors. Motion uses opacity/translate under 180ms and respects reduced motion. Dialogs trap focus and restore it on close.

The reference products establish a quality bar only. This design uses its own split workspace, typography rhythm, brand geometry and route selection treatment; no reference layouts or visual assets are copied.

## Build order and release gates
1. Foundation, typed domain model, design tokens, shell and inputs.
2. Curated demo selectors, provider-independent mock orchestration, scoring, debounced quote lifecycle and route inspection.
3. Demo wallet, settings, explicit review/approval/progress/rejection states and session activity.
4. Verify strict typing, lint, amount precision, provider failure isolation, expiry and state transitions; inspect responsive UI.
5. Live provider: server validation, API credentials, verified addresses, allowance and transaction simulation, wallet connector integration, fork tests. No real signing until this gate passes.
6. Second provider and capability-specific fallback. Measure latency and net output; add safe caching and rate limits.
7. Cross-chain quotes, recoverable tracking and provider-specific failure handling.
8. Independent security review, accessibility audit, E2E coverage, monitoring and performance budget before production claims.
