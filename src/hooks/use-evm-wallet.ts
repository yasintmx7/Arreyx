'use client';

import { useCallback, useEffect, useState } from 'react';

export type Eip1193Provider = {
  request<T = unknown>(request: { method: string; params?: unknown[] | object }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

function injectedProvider() {
  return (window as Window & { ethereum?: Eip1193Provider }).ethereum;
}

export function useEvmWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const provider = injectedProvider();
    if (!provider) { setAccount(null); setChainId(null); return; }
    const [accounts, chain] = await Promise.all([
      provider.request<string[]>({ method: 'eth_accounts' }),
      provider.request<string>({ method: 'eth_chainId' }),
    ]);
    setAccount(accounts[0] ?? null);
    setChainId(Number.parseInt(chain, 16));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { refresh().catch(() => {}); });
    const provider = injectedProvider();
    if (!provider?.on) return () => cancelAnimationFrame(frame);
    const accountsChanged = (...args: unknown[]) => setAccount(Array.isArray(args[0]) && typeof args[0][0] === 'string' ? args[0][0] : null);
    const chainChanged = (...args: unknown[]) => setChainId(typeof args[0] === 'string' ? Number.parseInt(args[0], 16) : null);
    provider.on('accountsChanged', accountsChanged);
    provider.on('chainChanged', chainChanged);
    return () => { cancelAnimationFrame(frame); provider.removeListener?.('accountsChanged', accountsChanged); provider.removeListener?.('chainChanged', chainChanged); };
  }, [refresh]);

  const connect = useCallback(async () => {
    const provider = injectedProvider();
    if (!provider) { setError('No compatible EVM wallet extension was detected.'); return null; }
    try {
      setError(null);
      const accounts = await provider.request<string[]>({ method: 'eth_requestAccounts' });
      const chain = await provider.request<string>({ method: 'eth_chainId' });
      setAccount(accounts[0] ?? null);
      setChainId(Number.parseInt(chain, 16));
      return accounts[0] ?? null;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Wallet connection was rejected.');
      return null;
    }
  }, []);

  const switchChain = useCallback(async (nextChainId: number) => {
    const provider = injectedProvider();
    if (!provider) throw new Error('No compatible EVM wallet extension was detected.');
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${nextChainId.toString(16)}` }] });
    setChainId(nextChainId);
  }, []);

  return { account, chainId, error, connect, switchChain, provider: typeof window === 'undefined' ? undefined : injectedProvider(), refresh };
}
