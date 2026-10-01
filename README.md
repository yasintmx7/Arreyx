# ArreyX

A self-custodial trading and asset-management interface. ArreyX combines LI.FI swaps and bridges, CoW Protocol limit and TWAP orders, Uniswap V3 pool creation and full-range liquidity, Blockscout portfolios, GeckoTerminal pool discovery, GoPlus token checks, allowance revocation, and transaction receipts.

## Run

Requires Node 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. The main routes are `/swap`, `/bridge`, `/pools`, `/portfolio`, `/orders`, `/liquidity`, `/safety`, and `/activity`. Vercel redirects the older `/app` path to `/swap`. The build is a static export.

## Verify

```sh
npm run typecheck
npm run lint
npm run build
```

## Data and transaction boundaries

The interface offers Ethereum, Arbitrum, Base, BNB Chain, OP Mainnet, Polygon, Avalanche, Gnosis, Scroll, Linea, Solana, Unichain, Sonic, zkSync, Mantle, Blast and Berachain. LI.FI's live chain and token catalog determines what is available for a given pair. Routes and output amounts require a current provider response; nothing is fabricated when a provider is unavailable. A compatible wallet for the selected ecosystem is required to show balances and sign a transaction. The application never collects seed phrases or private keys.

Pools shows current GeckoTerminal data and internal details. Liquidity reads Uniswap V3 token and pool contracts on Ethereum or Base, requests exact ERC-20 approvals, and sends pool creation or position-minting calldata to the official position manager. Creating a pool requires an initial price; entering an incorrect price can expose deposits to immediate arbitrage.

Portfolio enumerates indexed balances for the supported Blockscout networks and totals only assets with an available exchange rate. Safety requests live GoPlus fields and can inspect and revoke an exact ERC-20 token/spender allowance. Activity combines LI.FI route history with browser-saved receipts for direct liquidity and approval transactions. Orders embeds CoW Protocol's live limit and TWAP interface with exact approvals and price-impact blocking.

Public RPCs are used unless dedicated `NEXT_PUBLIC_RPC_*` endpoints are configured. WalletConnect support is enabled by `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. Apply origin restrictions and quotas at the RPC provider. Always review token contracts, network, recipient, approvals, minimum received, pool price, and wallet transaction details before signing.

Sources: [LI.FI Widget](https://docs.li.fi/widget/overview), [CoW Swap Widget](https://www.npmjs.com/package/@cowprotocol/widget-react), [Uniswap V3 SDK](https://docs.uniswap.org/sdk/v3/overview), [GeckoTerminal API](https://apiguide.geckoterminal.com/), [GoPlus](https://docs.gopluslabs.io/), and [Blockscout API](https://docs.blockscout.com/devs/apis/rest).
