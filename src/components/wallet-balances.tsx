'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { createPublicClient, formatUnits, http, type Chain } from 'viem';
import { arbitrum, avalanche, base, berachain, blast, bsc, gnosis, linea, mainnet, mantle, optimism, polygon, scroll, sonic, unichain, zksync } from 'viem/chains';

type Selection = { fromChain: number; fromToken: string; toChain: number; toToken: string };
type BalanceRow = { key: string; symbol: string; amount: string; status: 'ready' | 'error' };
type BalanceState = { status: 'loading' | 'ready'; rows: BalanceRow[]; updatedAt?: number };

const solanaId = 1151111081099710;
const solanaNative = '11111111111111111111111111111111';
const chains: Record<number, Chain> = { 1: mainnet, 42161: arbitrum, 8453: base, 56: bsc, 10: optimism, 137: polygon, 43114: avalanche, 100: gnosis, 534352: scroll, 59144: linea, 130: unichain, 146: sonic, 324: zksync, 5000: mantle, 81457: blast, 80094: berachain };
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
async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!response.ok) throw new Error(`Solana RPC returned ${response.status}`);
  const body: { result?: T; error?: { message?: string } } = await response.json();
  if (body.error || body.result == null) throw new Error(body.error?.message ?? 'Solana RPC returned no result');
  return body.result;
}

export function WalletBalances({ accounts, selection }: { accounts: { evm: string | null; solana: string | null }; selection: Selection }) {
  const [networkId, setNetworkId] = useState(selection.fromChain);
  const [refresh, setRefresh] = useState(0);
  const [balance, setBalance] = useState<BalanceState>({ status: 'loading', rows: [] });
  const chain = chains[networkId];
  const account = networkId === solanaId ? accounts.solana : accounts.evm;
  const tokens = useMemo(() => Array.from(new Set([
    selection.fromChain === networkId ? selection.fromToken : null,
    selection.toChain === networkId ? selection.toToken : null,
  ].filter((address): address is string => Boolean(address && address !== zeroAddress && address !== solanaNative)).map(address => networkId === solanaId ? address : address.toLowerCase()))), [networkId, selection.fromChain, selection.fromToken, selection.toChain, selection.toToken]);

  useEffect(() => {
    if (!account || !chain && networkId !== solanaId) return;
    let cancelled = false;
    async function load() {
      setBalance({ status: 'loading', rows: [] });
      if (networkId === solanaId) {
        const reads = await Promise.allSettled([
          solanaRpc<{ value: number }>('getBalance', [account, { commitment: 'confirmed' }]).then(result => ({ key: 'native', symbol: 'SOL', amount: formatBalance(BigInt(result.value), 9), status: 'ready' as const })),
          ...tokens.map(async mint => {
            const result = await solanaRpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { amount: string; decimals: number } } } } } }[] }>('getTokenAccountsByOwner', [account, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
            const amounts = result.value.map(item => item.account.data.parsed.info.tokenAmount);
            const total = amounts.reduce((sum, item) => sum + BigInt(item.amount), 0n);
            return { key: mint, symbol: `${mint.slice(0, 5)}…${mint.slice(-4)}`, amount: amounts.length ? formatBalance(total, amounts[0].decimals) : '0', status: 'ready' as const };
          }),
        ]);
        if (!cancelled) setBalance({ status: 'ready', rows: reads.map((result, index) => result.status === 'fulfilled' ? result.value : { key: index === 0 ? 'native' : tokens[index - 1], symbol: index === 0 ? 'SOL' : `${tokens[index - 1].slice(0, 5)}…${tokens[index - 1].slice(-4)}`, amount: 'Unavailable', status: 'error' }), updatedAt: Date.now() });
        return;
      }
      if (!chain) return;
      const client = createPublicClient({ chain, transport: http() });
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
  }, [account, chain, networkId, tokens, refresh]);

  return <section className="balances-panel" aria-label="Connected wallet balances">
    <div className="balances-heading"><div><span className="balances-kicker"><Wallet size={14} /> YOUR WALLET</span><h2>Balances</h2><p>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect your wallet in the swap or bridge form.'}</p></div><button aria-label="Refresh balances" title="Refresh balances" disabled={!account} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button></div>
    <label className="balances-network">Network<select value={networkId} onChange={event => setNetworkId(Number(event.target.value))}>{Object.entries(chains).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}<option value={solanaId}>Solana</option></select></label>
    {!account ? <p className="balances-empty">Connect {networkId === solanaId ? 'a Solana' : 'an EVM'} wallet in the exchange form to view real balances.</p> : balance.status === 'loading' ? <p className="balances-empty" role="status">Reading balances from {chain?.name ?? 'Solana'}…</p> : <div className="balances-list">{balance.rows.map(row => <div className="balances-row" key={row.key}><span>{row.symbol}</span><strong className={row.status === 'error' ? 'balance-error' : ''}>{row.amount}</strong></div>)}</div>}
    <p className="balances-note">Native coin and selected tokens on this network. {networkId === solanaId ? 'Solana token mints are abbreviated.' : ''} {account && balance.updatedAt ? `Updated ${new Date(balance.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''} Balances may change after transactions.</p>
  </section>;
}
