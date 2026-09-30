'use client';
import { useEffect, useState } from 'react';
import type { QuoteRequest, Route } from '@/types/domain';
import { discoverRoutes } from '@/routing/engine';
import { createMockProviders } from '@/routing/mock-provider';
type Result = { key: string; routes: Route[]; status: 'loading' | 'ready' | 'empty' | 'error'; failures: string[] };
export function useQuotes(request: QuoteRequest | null, scenario: string, refresh: number) {
  const key = request ? [request.chainId, request.tokenIn.id, request.tokenOut.id, request.amountIn, request.slippageBps, request.preference, scenario, refresh].join(':') : '';
  const [result, setResult] = useState<Result>({ key: '', routes: [], status: 'empty', failures: [] });
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout>;
    const query = async () => {
      setResult(previous => ({ ...previous, key, status: 'loading' }));
      try {
        const data = await discoverRoutes(request, createMockProviders(scenario), controller.signal);
        if (!controller.signal.aborted) {
          setResult({ key, routes: data.routes, status: data.routes.length ? 'ready' : data.failedProviders.length === 3 ? 'error' : 'empty', failures: data.failedProviders });
          refreshTimer = setTimeout(query, 26000);
        }
      } catch {
        if (!controller.signal.aborted) setResult({ key, routes: [], status: 'error', failures: [] });
      }
    };
    const timer = setTimeout(query, 350);
    return () => { controller.abort(); clearTimeout(timer); clearTimeout(refreshTimer); };
  }, [key, request, scenario]);
  if (!request) return { routes: [], status: 'empty' as const, failures: [] };
  if (result.key !== key) return { routes: [], status: 'loading' as const, failures: [] };
  return result;
}
