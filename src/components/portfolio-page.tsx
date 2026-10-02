'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Search, Wallet } from 'lucide-react';
import { formatUnits, getAddress } from 'viem';
import { ToolShell } from './tool-shell';
import { useEvmWallet } from '@/hooks/use-evm-wallet';

const portfolioNetworks = {
  1: { name: 'Ethereum', api: 'https://eth.blockscout.com', explorer: 'https://eth.blockscout.com', symbol: 'ETH' },
  8453: { name: 'Base', api: 'https://base.blockscout.com', explorer: 'https://base.blockscout.com', symbol: 'ETH' },
  42161: { name: 'Arbitrum', api: 'https://arbitrum.blockscout.com', explorer: 'https://arbitrum.blockscout.com', symbol: 'ETH' },
  10: { name: 'OP Mainnet', api: 'https://optimism.blockscout.com', explorer: 'https://optimism.blockscout.com', symbol: 'ETH' },
  100: { name: 'Gnosis', api: 'https://gnosis.blockscout.com', explorer: 'https://gnosis.blockscout.com', symbol: 'xDAI' },
} as const;

type NetworkId = keyof typeof portfolioNetworks;
type NetworkFilter = NetworkId | 'all';
type ApiToken = { value: string; token: { address: string; name: string | null; symbol: string | null; decimals: string | null; exchange_rate: string | null; icon_url: string | null; type: string } };
type ApiAddress = { coin_balance: string | null; exchange_rate: string | null };
type Asset = { key: string; address: string | null; name: string; symbol: string; amount: string; amountNumber: number; usd: number | null; icon: string | null; type: string; networkId: NetworkId; networkName: string; explorer: string };

function compactAmount(value: number) {
  if (!Number.isFinite(value)) return 'Unavailable';
  if (value > 0 && value < 0.000001) return '<0.000001';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: value >= 1 ? 5 : 8, notation: value >= 1_000_000 ? 'compact' : 'standard' }).format(value);
}

export function PortfolioPage() {
  const wallet = useEvmWallet();
  const [networkId, setNetworkId] = useState<NetworkFilter>('all');
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; assets: Asset[]; error?: string; unavailable?: string[] }>({ status: 'idle', assets: [] });
  const [query, setQuery] = useState('');
  const [showUnpriced, setShowUnpriced] = useState(false);

  useEffect(() => {
    if (!wallet.account) return;
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      setState(previous => ({ status: 'loading', assets: previous.assets }));
      const address = getAddress(wallet.account!);
      const selectedNetworks = (Object.entries(portfolioNetworks) as [string, (typeof portfolioNetworks)[NetworkId]][])
        .filter(([id]) => networkId === 'all' || Number(id) === networkId)
        .map(([id, network]) => ({ id: Number(id) as NetworkId, network }));
      Promise.allSettled(selectedNetworks.map(async ({ id, network }) => {
        const [account, tokens] = await Promise.all([
          fetch(`${network.api}/api/v2/addresses/${address}`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(`Address service returned ${response.status}.`); return response.json() as Promise<ApiAddress>; }),
          fetch(`${network.api}/api/v2/addresses/${address}/token-balances`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(`Token service returned ${response.status}.`); return response.json() as Promise<ApiToken[]>; }),
        ]);
        const nativeAmount = Number(formatUnits(BigInt(account.coin_balance ?? '0'), 18));
        const nativeRate = Number(account.exchange_rate);
        const native: Asset = { key: `${id}:native`, address: null, name: `${network.name} native asset`, symbol: network.symbol, amount: account.coin_balance ?? '0', amountNumber: nativeAmount, usd: Number.isFinite(nativeRate) ? nativeAmount * nativeRate : null, icon: null, type: 'NATIVE', networkId: id, networkName: network.name, explorer: network.explorer };
        const assets = tokens.map<Asset>(item => {
          const decimals = Number(item.token.decimals ?? 0);
          const amountNumber = Number(formatUnits(BigInt(item.value), Number.isFinite(decimals) ? decimals : 0));
          const rate = Number(item.token.exchange_rate);
          return { key: `${id}:${item.token.address}`, address: item.token.address, name: item.token.name || 'Unknown token', symbol: item.token.symbol || `${item.token.address.slice(0, 6)}…`, amount: item.value, amountNumber, usd: Number.isFinite(rate) && item.token.exchange_rate != null ? amountNumber * rate : null, icon: item.token.icon_url, type: item.token.type, networkId: id, networkName: network.name, explorer: network.explorer };
        }).filter(asset => asset.amountNumber > 0);
        return [native, ...assets];
      })).then(results => {
        if (controller.signal.aborted) return;
        const assets = results.flatMap(result => result.status === 'fulfilled' ? result.value : []).sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
        const unavailable = results.flatMap((result, index) => result.status === 'rejected' ? [selectedNetworks[index].network.name] : []);
        if (!assets.length && unavailable.length) setState({ status: 'error', assets: [], error: `Portfolio data is unavailable for ${unavailable.join(', ')}.` });
        else setState({ status: 'ready', assets, unavailable });
      });
    });
    return () => { cancelAnimationFrame(frame); controller.abort(); };
  }, [networkId, refresh, wallet.account]);

  const total = state.assets.reduce((sum, asset) => sum + (asset.usd ?? 0), 0);
  const unpricedCount = state.assets.filter(asset => asset.usd == null).length;
  const visible = useMemo(() => state.assets.filter(asset => (showUnpriced || asset.usd != null) && `${asset.symbol} ${asset.name} ${asset.networkName} ${asset.address ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [query, showUnpriced, state.assets]);

  return <ToolShell active="portfolio" title="Portfolio" subtitle="View real wallet balances and available USD prices from public Blockscout indexes." account={wallet.account} onConnect={() => { wallet.connect(); }} wide>
    {!wallet.account ? <section className="activity-connect"><span className="activity-connect-icon"><Wallet size={24} /></span><h2>Connect to view your portfolio</h2><p>ArreyX reads the connected address’s indexed token balances. It cannot move assets without a separate wallet confirmation.</p><button className="home-primary" onClick={() => wallet.connect()}><Wallet size={17} /> Connect wallet</button></section> : <>
      <section className="portfolio-summary"><div><span>Priced portfolio value</span><strong>{state.status === 'loading' && state.assets.length === 0 ? 'Loading…' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(total)}</strong><small>{unpricedCount} unpriced asset{unpricedCount === 1 ? '' : 's'} excluded from the USD total</small></div><label>Network<select value={networkId} onChange={event => { const value = event.target.value; setNetworkId(value === 'all' ? 'all' : Number(value) as NetworkId); setQuery(''); }}><option value="all">All supported</option>{Object.entries(portfolioNetworks).map(([id, item]) => <option value={id} key={id}>{item.name}</option>)}</select></label><button aria-label="Refresh portfolio" title="Refresh portfolio" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button></section>
      <section className="tool-panel portfolio-panel"><div className="portfolio-controls"><label className="pool-search"><Search size={16} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search portfolio" aria-label="Search portfolio" /></label><label className="portfolio-unpriced"><input type="checkbox" checked={showUnpriced} onChange={event => setShowUnpriced(event.target.checked)} /> Show unpriced assets</label></div>
      {state.unavailable && state.unavailable.length > 0 && <div className="tool-alert">Some indexers did not respond: {state.unavailable.join(', ')}. Available networks are still shown.</div>}
      {state.status === 'loading' && <p className="pool-status" role="status">Loading indexed balances…</p>}{state.status === 'error' && <p className="pool-status" role="alert">{state.error}</p>}{state.status === 'ready' && visible.length === 0 && <p className="pool-status">No matching balances were found.</p>}{visible.length > 0 && <div className="portfolio-list"><div className="portfolio-head"><span>Asset</span><span>Balance</span><span>Value</span></div>{visible.map(asset => <div className="portfolio-row" key={asset.key}><div className="portfolio-asset">{asset.icon ? <img src={asset.icon} alt="" /> : <span>{asset.symbol.slice(0, 1)}</span>}<div><strong>{asset.symbol}</strong><small>{asset.name} · {asset.networkName}</small></div></div><span>{compactAmount(asset.amountNumber)}</span><span>{asset.usd == null ? 'Unpriced' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(asset.usd)}{asset.address && <a href={`${asset.explorer}/token/${asset.address}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${asset.symbol} on ${asset.networkName} explorer`}><ExternalLink size={13} /></a>}</span></div>)}</div>}</section>
      <p className="portfolio-source">Balances and available exchange rates are returned by the selected network’s public Blockscout index. Spam and unpriced tokens may appear when “Show unpriced assets” is enabled.</p>
    </>}
  </ToolShell>;
}
