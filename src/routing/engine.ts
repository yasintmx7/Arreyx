import type { QuoteRequest, Route, RoutePreference, RouteProvider } from '@/types/domain';
export const netOutput = (route: Route) => route.outputValueUsd - route.fees.totalUsd;
export function rankRoutes(routes: Route[], mode: RoutePreference): Route[] {
  return [...routes].sort((a, b) => {
    if (mode === 'fastest' && a.estimatedSeconds !== b.estimatedSeconds) return a.estimatedSeconds - b.estimatedSeconds;
    if (mode === 'gas' && a.fees.gasUsd !== b.fees.gasUsd) return a.fees.gasUsd < b.fees.gasUsd ? -1 : 1;
    const delta = netOutput(b) - netOutput(a);
    return delta > 0n ? 1 : delta < 0n ? -1 : a.estimatedSeconds - b.estimatedSeconds || b.reliabilityBps - a.reliabilityBps;
  }).map(route => ({ ...route, scoreReason: mode === 'return' ? 'Ranked by output value after network and external fees.' : mode === 'fastest' ? 'Ranked by estimated execution time, then net output.' : 'Ranked by estimated network cost, then net output.' }));
}
export async function discoverRoutes(request: QuoteRequest, providers: RouteProvider[], signal: AbortSignal) {
  if (request.amountIn <= 0n || !Number.isInteger(request.slippageBps) || request.slippageBps < 1 || request.slippageBps > 500) throw new Error('Invalid quote request.');
  const supported = providers.filter(p => p.getSupportedChains().includes(request.chainId));
  const results = await Promise.allSettled(supported.map(async provider => {
    const timeout = AbortSignal.timeout(4000);
    const combined = AbortSignal.any([signal, timeout]);
    return Promise.race([provider.getRoutes(request, combined), new Promise<never>((_, reject) => {
      if (combined.aborted) reject(new Error('Quote cancelled'));
      else combined.addEventListener('abort', () => reject(new Error('Provider timed out')), { once: true });
    })]);
  }));
  if (signal.aborted) throw new Error('Quote cancelled');
  const failedProviders = results.flatMap((r, i) => r.status === 'rejected' ? [supported[i].id] : []);
  const routes = results.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(r => r.amountIn === request.amountIn && r.chainId === request.chainId && r.destinationChainId === request.destinationChainId && r.tokenIn.id === request.tokenIn.id && r.tokenOut.id === request.tokenOut.id && r.expectedAmountOut > 0n && r.minimumAmountOut > 0n && r.minimumAmountOut <= r.expectedAmountOut && r.expiresAt > Date.now() && r.fees.gasUsd >= 0n && r.fees.protocolUsd >= 0n && r.fees.bridgeUsd >= 0n && r.fees.totalUsd === r.fees.gasUsd + r.fees.protocolUsd + r.fees.bridgeUsd);
  return { routes: rankRoutes([...new Map(routes.map(r => [r.id, r])).values()], request.preference), failedProviders };
}
