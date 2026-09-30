'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { createPublicClient, formatUnits, http, type Chain } from 'viem';
import { arbitrum, avalanche, base, bsc, gnosis, linea, mainnet, optimism, polygon, scroll } from 'viem/chains';

type Selection = { fromChain: number; fromToken: string; toChain: number; toToken: string };
type BalanceRow = { key: string; symbol: string; amount: string; status: 'ready' | 'error' };
type BalanceState = { status: 'loading' | 'ready'; rows: BalanceRow[]; updatedAt?: number };

const chains: Record<number, Chain> = { 1: mainnet, 42161: arbitrum, 8453: base, 56: bsc, 10: optimism, 137: polygon, 43114: avalanche, 100: gnosis, 534352: scroll, 59144: linea };
const zeroAddress = '0x0000000000000000000000000000000000000000';
const erc20 = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

function formatBalance(value: bigint, decimals: number) {
  const amount = Number(formatUnits(value, decimals));
  if (!Number.isFinite(amount)) return formatUnits(value, decimals);
  if (amount === 0) return '0';
  if (amount < 0.000001) return '<0.000001';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(amount);
}

export function WalletBalances({ account, selection }: { account: string | null; selection: Selection }) {
  const [networkId, setNetworkId] = useState(selection.fromChain);
  const [refresh, setRefresh] = useState(0);
  const [balance, setBalance] = useState<BalanceState>({ status: 'loading', rows: [] });
  const chain = chains[networkId];
  const tokens = useMemo(() => Array.from(new Set([
    selection.fromChain === networkId ? selection.fromToken.toLowerCase() : null,
    selection.toChain === networkId ? selection.toToken.toLowerCase() : null,
  ].filter((address): address is string => Boolean(address && address !== zeroAddress)))), [networkId, selection.fromChain, selection.fromToken, selection.toChain, selection.toToken]);

  useEffect(() => {
    if (!account || !chain) return;
    let cancelled = false;
    const client = createPublicClient({ chain, transport: http() });
    async function load() {
      setBalance({ status: 'loading', rows: [] });
      const address = account as `0x${string}`;
      const results = await Promise.allSettled([
        client.getBalance({ address }).then(value => ({ key: 'native', symbol: chain.nativeCurrency.symbol, amount: formatBalance(value, chain.nativeCurrency.decimals), status: 'ready' as const })),
        ...tokens.map(async token => {
          const tokenAddress = token as `0x${string}`;
          const [symbol, decimals, value] = await Promise.all([
            client.readContract({ address: tokenAddress, abi: erc20, functionName: 'symbol' }),
            client.readContract({ address: tokenAddress, abi: erc20, functionName: 'decimals' }),
            client.readContract({ address: tokenAddress, abi: erc20, functionName: 'balanceOf', args: [address] }),
          ]);
          return { key: token, symbol, amount: formatBalance(value, decimals), status: 'ready' as const };
        }),
      ]);
      if (!cancelled) setBalance({ status: 'ready', rows: results.map((result, index) => result.status === 'fulfilled' ? result.value : { key: index === 0 ? 'native' : tokens[index - 1], symbol: index === 0 ? chain.nativeCurrency.symbol : `${tokens[index - 1].slice(0, 6)}…${tokens[index - 1].slice(-4)}`, amount: 'Unavailable', status: 'error' }), updatedAt: Date.now() });
    }
    load();
    const interval = window.setInterval(() => setRefresh(value => value + 1), 60_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [account, chain, tokens, refresh]);

  return <section className="balances-panel" aria-label="Connected wallet balances">
    <div className="balances-heading"><div><span className="balances-kicker"><Wallet size={14} /> YOUR WALLET</span><h2>Balances</h2><p>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect your wallet in the swap or bridge form.'}</p></div><button aria-label="Refresh balances" title="Refresh balances" disabled={!account} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button></div>
    <label className="balances-network">Network<select value={networkId} onChange={event => setNetworkId(Number(event.target.value))}>{Object.entries(chains).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
    {!account ? <p className="balances-empty">Your real on-chain balances will appear here after you connect a wallet.</p> : balance.status === 'loading' ? <p className="balances-empty" role="status">Reading balances from {chain.name}…</p> : <div className="balances-list">{balance.rows.map(row => <div className="balances-row" key={row.key}><span>{row.symbol}</span><strong className={row.status === 'error' ? 'balance-error' : ''}>{row.amount}</strong></div>)}</div>}
    <p className="balances-note">Native coin and selected tokens on this network. {account && balance.updatedAt ? `Updated ${new Date(balance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''} Balances may change after transactions.</p>
  </section>;
}
