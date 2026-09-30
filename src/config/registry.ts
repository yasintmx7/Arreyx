import type { Chain, Token } from '@/types/domain';
export const chains: Chain[] = [
  { id: 1, name: 'Ethereum', shortName: 'ETH', nativeSymbol: 'ETH', explorer: 'https://etherscan.io', rpcEnv: 'RPC_ETHEREUM', providers: ['atlas', 'flow', 'direct'] },
  { id: 42161, name: 'Arbitrum', shortName: 'ARB', nativeSymbol: 'ETH', explorer: 'https://arbiscan.io', rpcEnv: 'RPC_ARBITRUM', providers: ['atlas', 'flow', 'direct'] },
  { id: 8453, name: 'Base', shortName: 'BASE', nativeSymbol: 'ETH', explorer: 'https://basescan.org', rpcEnv: 'RPC_BASE', providers: ['atlas', 'flow', 'direct'] },
];
const assets = [
  { symbol: 'ETH', name: 'Ether', decimals: 18, color: '#7c83bb', glyph: '♦', price: 2648350000n, balance: '2.4582' },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6, color: '#2775ca', glyph: '$', price: 1000000n, balance: '5240.50' },
  { symbol: 'USDT', name: 'Tether', decimals: 6, color: '#26a17b', glyph: '₮', price: 1000000n, balance: '1250' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, color: '#f7931a', glyph: '₿', price: 67420800000n, balance: '0.042' },
  { symbol: 'DAI', name: 'Dai', decimals: 18, color: '#edb348', glyph: '◈', price: 1000000n, balance: '800' },
];
// Deliberately non-executable identities: these records cannot be mistaken for live contracts.
export const tokensForChain = (chainId: number): Token[] => assets.map(a => ({ id: `${chainId}:${a.symbol}`, chainId, address: a.symbol === 'ETH' ? 'native' : 'demo', symbol: a.symbol, name: a.name, decimals: a.decimals, color: a.color, glyph: a.glyph, priceUsdMicros: a.price, demoBalance: a.balance, verified: false }));
