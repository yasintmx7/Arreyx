# ArreyX

A swap, bridge and pool-discovery interface for ten EVM networks. Swaps and bridges use the LI.FI Widget v4 for live token catalogs, wallet balances, routes, fees, execution and transaction tracking. Pool discovery and the WETH/USDC market chart use GeckoTerminal's public API.

## Run

Requires Node 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Next.js. The home page explains the product; **Get started** and **Open app** lead to `/swap`. Swap, Bridge, and Pools also have direct routes at `/swap`, `/bridge`, and `/pools`; the older `/app` route still works. The build is a static export for Vercel.

## Verify

```sh
npm run typecheck
npm run lint
npm run build
```

## Data and transaction boundaries

The interface offers Ethereum, Arbitrum, Base, BNB Chain, OP Mainnet, Polygon, Avalanche, Gnosis, Scroll and Linea. LI.FI's live chain and token catalog determines what is available for a given pair. Routes and output amounts require a current provider response; nothing is fabricated when a provider is unavailable. A compatible installed EVM wallet is required to show balances and sign a transaction. The application never collects seed phrases or private keys.

The Pools tab shows current trending pools, liquidity and volume from GeckoTerminal and links to each pool's page. Liquidity deposits and withdrawals happen at the pool's source; ArreyX does not initiate them. GeckoTerminal's public API is rate-limited, so its data can sometimes be unavailable.

The Swap view includes a 24-hour, 7-day and 30-day chart of the Ethereum WETH/USDC Uniswap v3 0.05% pool. Its OHLCV candles refresh every minute while the view is open. This is market context for one identified pool; the selected LI.FI route may use other pools and have a different executable price.

Public RPCs are used by the widget unless a dedicated RPC is configured. Production operators should configure authenticated RPC endpoints and monitor provider availability. Always review token, network, minimum received and transaction details in the wallet before signing.

Sources: [LI.FI Widget](https://docs.li.fi/widget/overview), [LI.FI configuration](https://docs.li.fi/widget/configure-widget), [GeckoTerminal API](https://apiguide.geckoterminal.com/).
