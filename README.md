# ArreyX

A responsive DEX frontend prototype with independent routing orchestration.

## Run
Requires Node 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. `npm run build` produces a static export in `out/` for Phase 1 hosting.

## Verify
```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Explore
- Open Connect wallet → Try a demo wallet.
- Search curated tokens; change the network or reverse the pair.
- Compare routes, expand composition and choose an alternative.
- Settings supports slippage, ranking modes and failed/no-liquidity provider scenarios.
- Review and confirm a demo swap. ERC20 sells include simulated approval.
- Check “Test a rejected signature” for the failure flow.
- Activity contains this tab's completed/rejected simulations; reloading clears it.
- Demo balances do not change after simulations. All quoted USD prices are fixtures.

## Boundaries
No live wallet integration, live market feeds, real approvals, real swaps or cross-chain execution is enabled. Demo token identities deliberately cannot be used as contract addresses. Atlas, Flow and Direct are fictional provider labels; protocol names describe simulated paths only. Mock routes must never authorize real transactions.

The first production provider is planned as 0x AllowanceHolder. Credentials alone do not enable live mode: server integration, verified contract configuration, wallet integration, transaction validation, fork testing and a security review remain required. See [architecture](docs/ARCHITECTURE.md) for the exact boundaries, state machine and roadmap. Dependency versions are recorded in package-lock.json.
