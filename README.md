# ArreyX

A swap, bridge and pool-discovery interface for sixteen EVM networks and Solana. Swaps and bridges use the LI.FI Widget v4 with EVM and Solana wallet providers for live token catalogs, routes, fees, execution and transaction tracking. The balance panel reads the connected address's native coin and selected tokens from public network RPCs. Pool discovery and the optional market chart use GeckoTerminal's public API.

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

The interface offers Ethereum, Arbitrum, Base, BNB Chain, OP Mainnet, Polygon, Avalanche, Gnosis, Scroll, Linea, Solana, Unichain, Sonic, zkSync, Mantle, Blast and Berachain. LI.FI's live chain and token catalog determines what is available for a given pair. Routes and output amounts require a current provider response; nothing is fabricated when a provider is unavailable. A compatible wallet for the selected ecosystem is required to show balances and sign a transaction. The application never collects seed phrases or private keys.

The Pools tab shows current trending pools, liquidity and volume from GeckoTerminal and links to each pool's page. Liquidity deposits and withdrawals happen at the pool's source; ArreyX does not initiate them. GeckoTerminal's public API is rate-limited, so its data can sometimes be unavailable.

The balance panel shows the native coin and selected swap or bridge tokens on the chosen network, including Solana SPL token mints when a Solana wallet is connected. It is not a complete portfolio or a fiat valuation; failed RPC reads are shown as unavailable. The Swap view also has a chart that is hidden by default. When opened, it follows the selected source token and network, preferring a pool for the selected pair when one is available. Its candles refresh every minute while open. The selected LI.FI route may use other pools and have a different executable price.

Public RPCs are used by the widget unless a dedicated RPC is configured. Production operators should configure authenticated RPC endpoints and monitor provider availability. Always review token, network, minimum received and transaction details in the wallet before signing.

Sources: [LI.FI Widget](https://docs.li.fi/widget/overview), [LI.FI configuration](https://docs.li.fi/widget/configure-widget), [GeckoTerminal API](https://apiguide.geckoterminal.com/).
