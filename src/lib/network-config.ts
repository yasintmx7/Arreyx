const rpcEntries: Array<[number, string | undefined]> = [
  [1, process.env.NEXT_PUBLIC_RPC_ETHEREUM],
  [42161, process.env.NEXT_PUBLIC_RPC_ARBITRUM],
  [8453, process.env.NEXT_PUBLIC_RPC_BASE],
  [56, process.env.NEXT_PUBLIC_RPC_BNB],
  [10, process.env.NEXT_PUBLIC_RPC_OPTIMISM],
  [137, process.env.NEXT_PUBLIC_RPC_POLYGON],
  [43114, process.env.NEXT_PUBLIC_RPC_AVALANCHE],
  [100, process.env.NEXT_PUBLIC_RPC_GNOSIS],
  [534352, process.env.NEXT_PUBLIC_RPC_SCROLL],
  [59144, process.env.NEXT_PUBLIC_RPC_LINEA],
  [130, process.env.NEXT_PUBLIC_RPC_UNICHAIN],
  [146, process.env.NEXT_PUBLIC_RPC_SONIC],
  [324, process.env.NEXT_PUBLIC_RPC_ZKSYNC],
  [5000, process.env.NEXT_PUBLIC_RPC_MANTLE],
  [81457, process.env.NEXT_PUBLIC_RPC_BLAST],
  [80094, process.env.NEXT_PUBLIC_RPC_BERACHAIN],
];

export const configuredRpcUrls = Object.fromEntries(rpcEntries.filter((entry): entry is [number, string] => Boolean(entry[1])).map(([chainId, url]) => [chainId, [url]])) as Record<number, string[]>;
export const solanaRpcUrl = process.env.NEXT_PUBLIC_RPC_SOLANA || 'https://api.mainnet-beta.solana.com';
export const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
export function rpcUrlFor(chainId: number) { return configuredRpcUrls[chainId]?.[0]; }
