export type Token = { id: string; chainId: number; address: `0x${string}` | 'native' | 'demo'; symbol: string; name: string; decimals: number; color: string; glyph: string; priceUsdMicros: bigint; demoBalance: string; verified: boolean };
export type Chain = { id: number; name: string; shortName: string; nativeSymbol: string; explorer: string; rpcEnv: string; providers: string[] };
export type RoutePreference = 'return' | 'fastest' | 'gas';
export type QuoteRequest = { chainId: number; destinationChainId: number; tokenIn: Token; tokenOut: Token; amountIn: bigint; slippageBps: number; preference: RoutePreference };
export type RouteStep = { id: string; kind: 'swap' | 'bridge' | 'wrap'; protocol: string; tokenIn: string; tokenOut: string; chainId: number; shareBps: number };
// All costs are USD micros, external to expectedAmountOut. Embedded fees are not deducted twice.
export type FeeBreakdown = { gasUsd: bigint; protocolUsd: bigint; bridgeUsd: bigint; totalUsd: bigint };
export type Route = { id: string; provider: string; type: 'direct' | 'split' | 'multihop' | 'cross-chain'; chainId: number; destinationChainId: number; tokenIn: Token; tokenOut: Token; amountIn: bigint; expectedAmountOut: bigint; minimumAmountOut: bigint; outputValueUsd: bigint; fees: FeeBreakdown; estimatedSeconds: number; priceImpactBps: number; reliabilityBps: number; steps: RouteStep[]; approvalRequired: boolean; expiresAt: number; simulated: boolean; scoreReason?: string };
export type PreparedTransaction = { chainId: number; to: `0x${string}`; data: `0x${string}`; value: bigint; spender?: `0x${string}`; expiresAt: number };
export interface RouteProvider {
  id: string;
  getSupportedChains(): number[];
  getSupportedTokens(chainId: number): Token[];
  getQuote(request: QuoteRequest, signal: AbortSignal): Promise<Route>;
  getRoutes(request: QuoteRequest, signal: AbortSignal): Promise<Route[]>;
  normalizeQuote(value: unknown): Route;
  estimateExecutionTime(route: Route): number;
  buildTransaction(route: Route): Promise<PreparedTransaction>;
}
export type TransactionStatus = 'idle' | 'review' | 'approval-required' | 'approval-pending' | 'approval-confirmed' | 'awaiting-signature' | 'submitted' | 'pending' | 'bridge-pending' | 'destination-pending' | 'success' | 'failed' | 'expired';
export type TransactionState = { status: TransactionStatus; route?: Route; error?: string };
export type Activity = { id: string; route: Route; timestamp: number; status: 'success' | 'failed' };
