'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { LiFiWidget, type WidgetConfig } from '@lifi/widget';
import { EthereumProvider } from '@lifi/widget-provider-ethereum';
import { ArrowUpRight, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { LiveChart } from './live-chart';

type View = 'swap' | 'bridge' | 'pools';
type Theme = 'dark' | 'light';

const networks = [
  { id: 1, name: 'Ethereum', gecko: 'eth' },
  { id: 42161, name: 'Arbitrum', gecko: 'arbitrum' },
  { id: 8453, name: 'Base', gecko: 'base' },
  { id: 56, name: 'BNB Chain', gecko: 'bsc' },
  { id: 10, name: 'OP Mainnet', gecko: 'optimism' },
  { id: 137, name: 'Polygon', gecko: 'polygon_pos' },
  { id: 43114, name: 'Avalanche', gecko: 'avax' },
  { id: 100, name: 'Gnosis', gecko: 'xdai' },
  { id: 534352, name: 'Scroll', gecko: 'scroll' },
  { id: 59144, name: 'Linea', gecko: 'linea' },
] as const;

type Pool = { id: string; attributes: { name: string; address: string; reserve_in_usd: string | null; volume_usd: { h24?: string } } };

function subscribe() { return () => {}; }
function useHydrated() { return useSyncExternalStore(subscribe, () => true, () => false); }
function money(value: string | null | undefined) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(number);
}

function Pools() {
  const [networkId, setNetworkId] = useState(1);
  const [pools, setPools] = useState<Pool[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const network = networks.find(item => item.id === networkId)!;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://api.geckoterminal.com/api/v2/networks/${network.gecko}/trending_pools?page=1`, { signal: controller.signal, headers: { accept: 'application/json;version=20230302' } })
      .then(response => { if (!response.ok) throw new Error(`Pool service returned ${response.status}`); return response.json(); })
      .then((body: { data?: Pool[] }) => { if (!controller.signal.aborted) { setPools((body.data ?? []).slice(0, 10)); setState('ready'); } })
      .catch(() => { if (!controller.signal.aborted) { setPools([]); setState('error'); } });
    return () => controller.abort();
  }, [network.gecko]);
  return <section className="live-pools" aria-label="Live liquidity pools"><div className="pools-heading"><div><h2>Trending pools</h2><p>Live liquidity and 24-hour volume from GeckoTerminal. Open a pool to manage liquidity at its source.</p></div><select aria-label="Pool network" value={networkId} onChange={event => { setState('loading'); setPools([]); setNetworkId(Number(event.target.value)); }}>{networks.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
    {state === 'loading' && <p className="pool-status" role="status">Loading live pools…</p>}
    {state === 'error' && <p className="pool-status" role="alert">Pool data is unavailable. Please try again later.</p>}
    {state === 'ready' && pools.length === 0 && <p className="pool-status">No pools returned for this network.</p>}
    {state === 'ready' && pools.length > 0 && <div className="pool-list"><div className="pool-column-head"><span>Pool</span><span>Liquidity</span><span>24h volume</span></div>{pools.map(pool => <a className="pool-row" key={pool.id} href={`https://www.geckoterminal.com/${network.gecko}/pools/${encodeURIComponent(pool.attributes.address)}`} target="_blank" rel="noopener noreferrer"><strong>{pool.attributes.name}</strong><span>{money(pool.attributes.reserve_in_usd)}</span><span>{money(pool.attributes.volume_usd?.h24)} <ArrowUpRight size={15} /></span></a>)}</div>}
    <p className="pool-source">Source: <a href="https://www.geckoterminal.com/" target="_blank" rel="noopener noreferrer">GeckoTerminal <ArrowUpRight size={13} /></a>. Pool data can change quickly.</p>
  </section>;
}

export function LiveExchange() {
  const hydrated = useHydrated();
  const [view, setView] = useState<View>('swap');
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => { const frame = requestAnimationFrame(() => { const requested = new URLSearchParams(window.location.search).get('view'); if (requested === 'bridge' || requested === 'pools') setView(requested); }); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { const frame = requestAnimationFrame(() => { const saved = localStorage.getItem('arreyx-theme'); setTheme(saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  const config = useMemo<WidgetConfig>(() => ({
    integrator: 'ArreyX', appearance: theme, variant: 'wide', mode: 'split',
    modeOptions: { split: view === 'bridge' ? 'bridge' : 'swap' },
    defaultUI: { layout: 'cards', transactionDetailsExpanded: true },
    chains: { allow: networks.map(network => network.id) },
    fromChain: 1, toChain: view === 'bridge' ? 42161 : 1,
    fromToken: '0x0000000000000000000000000000000000000000',
    toToken: view === 'bridge' ? '0x0000000000000000000000000000000000000000' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    providers: [EthereumProvider()],
    theme: { container: { border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'none' }, routesContainer: { borderRadius: '16px', boxShadow: 'none' }, colorSchemes: { dark: { palette: { primary: { main: '#7584ff' }, background: { default: '#181b20', paper: '#20242a' }, text: { primary: '#f4f5f7', secondary: '#aab2bf' } } }, light: { palette: { primary: { main: '#4559dc' }, background: { default: '#ffffff', paper: '#f5f7fb' }, text: { primary: '#1b2333', secondary: '#626d80' } } } } },
  }), [theme, view]);
  function toggleTheme() { const next = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('arreyx-theme', next); setTheme(next); }
  return <div className="app-shell live-shell"><header className="header"><Link className="brand" href="/" aria-label="ArreyX home"><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 33 18 5h8L10 33zm20 0 6-11 11 11zM27 5h12L28 17z" fill="currentColor" /></svg></span>Arrey<span className="brand-x">X</span></Link><nav aria-label="Main navigation">{(['swap', 'bridge', 'pools'] as View[]).map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="header-actions"><span className="environment">Live data</span><button className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div></header>
    <main className="live-main"><div className="page-heading"><div><h1>{view === 'swap' ? 'Swap' : view === 'bridge' ? 'Bridge' : 'Pools'}</h1><p>{view === 'swap' ? 'Compare live routes and exchange assets.' : view === 'bridge' ? 'Move assets between supported networks with live quotes.' : 'Explore live liquidity across supported networks.'}</p></div></div>{view === 'pools' ? <Pools /> : <div className={view === 'swap' ? 'swap-market-layout' : 'widget-wrap'}><div className="widget-wrap">{hydrated ? <LiFiWidget key={`${view}-${theme}`} integrator="ArreyX" config={config} /> : <div className="widget-loading" role="status">Loading live exchange…</div>}</div>{view === 'swap' && <LiveChart />}</div>}</main>
    <footer><span>© {new Date().getFullYear()} ArreyX</span><span>Quotes, balances and transactions are provided by LI.FI and connected wallets.</span></footer></div>;
}
