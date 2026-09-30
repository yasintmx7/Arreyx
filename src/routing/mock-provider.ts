import { tokensForChain } from '@/config/registry';
import type { QuoteRequest, Route, RouteProvider } from '@/types/domain';
import { valueUsd } from '@/lib/amounts';
const configs = [
  { id: 'atlas', name: 'Atlas', retention: 9996n, gas: 1420000n, seconds: 18, protocols: ['Uniswap V3', 'Curve'], shares: [7000, 3000] },
  { id: 'flow', name: 'Flow', retention: 9990n, gas: 1180000n, seconds: 12, protocols: ['Balancer'], shares: [10000] },
  { id: 'direct', name: 'Direct', retention: 9982n, gas: 960000n, seconds: 24, protocols: ['Uniswap V3'], shares: [10000] },
];
export function createMockProviders(scenario = 'normal'): RouteProvider[] {
  return configs.map((config, index) => {
    const provider: RouteProvider = {
      id: config.id,
      getSupportedChains: () => [1, 42161, 8453],
      getSupportedTokens: tokensForChain,
      normalizeQuote(value: unknown): Route {
        if (!value || typeof value !== 'object' || !('simulated' in value) || value.simulated !== true || !('expectedAmountOut' in value) || typeof value.expectedAmountOut !== 'bigint') throw new Error('Invalid demo quote.');
        return value as Route;
      },
      estimateExecutionTime: route => route.estimatedSeconds,
      buildTransaction: async () => { throw new Error('Simulation only. Live transaction construction is disabled.'); },
      async getQuote(request, signal) { return (await provider.getRoutes(request, signal))[0]; },
      async getRoutes(request: QuoteRequest, signal: AbortSignal) {
        await new Promise<void>((resolve, reject) => {
          if (signal.aborted) { reject(new Error('Cancelled')); return; }
          const abort = () => { clearTimeout(timer); reject(new Error('Cancelled')); };
          const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 350 + index * 160);
          signal.addEventListener('abort', abort, { once: true });
        });
        if (scenario === 'failure' || (scenario === 'partial' && index === 0)) throw new Error('Demo provider unavailable');
        if (scenario === 'empty' || request.tokenIn.id === request.tokenOut.id || request.chainId !== request.destinationChainId) return [];
        const inputUsd = valueUsd(request.amountIn, request.tokenIn.decimals, request.tokenIn.priceUsdMicros);
        const expectedAmountOut = inputUsd * config.retention * 10n ** BigInt(request.tokenOut.decimals) / (10000n * request.tokenOut.priceUsdMicros);
        const gasUsd = request.chainId === 1 ? config.gas : config.gas / 20n;
        return [{ id: `${config.id}:${request.tokenIn.id}:${request.tokenOut.id}`, provider: config.name, type: index === 0 ? 'split' : 'direct', chainId: request.chainId, destinationChainId: request.destinationChainId, tokenIn: request.tokenIn, tokenOut: request.tokenOut, amountIn: request.amountIn, expectedAmountOut, minimumAmountOut: expectedAmountOut * BigInt(10000 - request.slippageBps) / 10000n, outputValueUsd: valueUsd(expectedAmountOut, request.tokenOut.decimals, request.tokenOut.priceUsdMicros), fees: { gasUsd, protocolUsd: 0n, bridgeUsd: 0n, totalUsd: gasUsd }, estimatedSeconds: config.seconds, priceImpactBps: Number(10000n - config.retention), reliabilityBps: 9900, steps: config.protocols.map((protocol, i) => ({ id: `${config.id}-${i}`, kind: 'swap', protocol, tokenIn: request.tokenIn.symbol, tokenOut: request.tokenOut.symbol, chainId: request.chainId, shareBps: config.shares[i] })), approvalRequired: request.tokenIn.address !== 'native', expiresAt: Date.now() + 30000, simulated: true } satisfies Route];
      },
    };
    return provider;
  });
}
