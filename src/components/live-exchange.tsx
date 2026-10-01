'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LiFiWidget, WidgetEvent, widgetEvents, type WidgetConfig, type FormFieldChanged } from '@lifi/widget';
import { EthereumProvider } from '@lifi/widget-provider-ethereum';
import { SolanaProvider } from '@lifi/widget-provider-solana';
import { WalletManagementEvent, walletManagementEvents } from '@lifi/wallet-management';
import { Activity, ArrowLeft, ArrowRight, Droplets, Moon, Search, Sun, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WalletBalances } from './wallet-balances';

type View = 'swap' | 'bridge' | 'pools' | 'activity';
type Theme = 'dark' | 'light';
type TokenSelection = { fromChain: number; fromToken: string; toChain: number; toToken: string };

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
  { id: 1151111081099710, name: 'Solana', gecko: 'solana' },
  { id: 130, name: 'Unichain', gecko: 'unichain' },
  { id: 146, name: 'Sonic', gecko: 'sonic' },
  { id: 324, name: 'zkSync', gecko: 'zksync' },
  { id: 5000, name: 'Mantle', gecko: 'mantle' },
  { id: 81457, name: 'Blast', gecko: 'blast' },
  { id: 80094, name: 'Berachain', gecko: 'berachain' },
] as const;

type Pool = { id: string; attributes: { name: string; address: string; reserve_in_usd: string | null; volume_usd: { h24?: string } } };
type PoolToken = { id: string; type: 'token'; attributes: { name: string; symbol: string; address: string } };
type PoolDex = { id: string; type: 'dex'; attributes: { name: string } };
type PoolDetailData = {
  attributes: {
    name: string; address: string; reserve_in_usd: string | null; base_token_price_usd: string | null; quote_token_price_usd: string | null;
    volume_usd: { h24?: string }; price_change_percentage: { h24?: string }; transactions: { h24?: { buys: number; sells: number; buyers: number; sellers: number } };
    fdv_usd: string | null; market_cap_usd: string | null; pool_created_at: string | null;
  };
  relationships: { base_token: { data: { id: string } }; quote_token: { data: { id: string } }; dex: { data: { id: string } } };
};

function subscribe() { return () => {}; }
function useHydrated() { return useSyncExternalStore(subscribe, () => true, () => false); }
function money(value: string | null | undefined) {
  const number = Number(value);
  return value == null || !Number.isFinite(number) ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: 'compact' }).format(number);
}

function price(value: string | null | undefined) {
  const number = Number(value);
  if (value == null || !Number.isFinite(number)) return 'Unavailable';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 7 }).format(number);
}

function PoolDetail({ network, address, onBack }: { network: (typeof networks)[number]; address: string; onBack: () => void }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; pool?: PoolDetailData; included?: (PoolToken | PoolDex)[]; error?: string }>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://api.geckoterminal.com/api/v2/networks/${network.gecko}/pools/${encodeURIComponent(address)}?include=base_token,quote_token,dex`, { signal: controller.signal, headers: { accept: 'application/json;version=20230302' } })
      .then(response => { if (!response.ok) throw new Error(`Pool detail request failed (${response.status}).`); return response.json(); })
      .then((body: { data: PoolDetailData; included?: (PoolToken | PoolDex)[] }) => { if (!controller.signal.aborted) setState({ status: 'ready', pool: body.data, included: body.included ?? [] }); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setState({ status: 'error', error: reason instanceof Error ? reason.message : 'Pool details are unavailable.' }); });
    return () => controller.abort();
  }, [address, network.gecko]);
  if (state.status === 'loading') return <section className="pool-detail"><button className="pool-back" onClick={onBack}><ArrowLeft size={16} /> All pools</button><p className="pool-status" role="status">Loading live pool details…</p></section>;
  if (state.status === 'error' || !state.pool) return <section className="pool-detail"><button className="pool-back" onClick={onBack}><ArrowLeft size={16} /> All pools</button><p className="pool-status" role="alert">{state.error ?? 'Pool details are unavailable.'}</p></section>;
  const pool = state.pool;
  const base = state.included?.find(item => item.type === 'token' && item.id === pool.relationships.base_token.data.id) as PoolToken | undefined;
  const quote = state.included?.find(item => item.type === 'token' && item.id === pool.relationships.quote_token.data.id) as PoolToken | undefined;
  const dex = state.included?.find(item => item.type === 'dex' && item.id === pool.relationships.dex.data.id) as PoolDex | undefined;
  const change = Number(pool.attributes.price_change_percentage?.h24);
  const trades = (pool.attributes.transactions?.h24?.buys ?? 0) + (pool.attributes.transactions?.h24?.sells ?? 0);
  const swapHref = base && quote ? `/swap?fromChain=${network.id}&fromToken=${encodeURIComponent(base.attributes.address)}&toChain=${network.id}&toToken=${encodeURIComponent(quote.attributes.address)}` : '/swap';
  return <section className="pool-detail">
    <button className="pool-back" onClick={onBack}><ArrowLeft size={16} /> All pools</button>
    <div className="pool-detail-head"><div><span className="pool-network">{network.name} · {dex?.attributes.name ?? 'Live pool'}</span><h2>{pool.attributes.name}</h2><p>{pool.attributes.address}</p></div><Link className="pool-swap" href={swapHref}>Swap this pair <ArrowRight size={16} /></Link></div>
    <div className="pool-metrics"><div><span><Droplets size={15} /> Liquidity</span><strong>{money(pool.attributes.reserve_in_usd)}</strong></div><div><span><Activity size={15} /> 24h volume</span><strong>{money(pool.attributes.volume_usd?.h24)}</strong></div><div><span>24h change</span><strong className={Number.isFinite(change) ? change >= 0 ? 'pool-positive' : 'pool-negative' : ''}>{Number.isFinite(change) ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : 'Unavailable'}</strong></div><div><span>24h trades</span><strong>{trades.toLocaleString()}</strong></div></div>
    <div className="pool-pair"><div><span>{base?.attributes.symbol ?? 'Base token'}</span><strong>{price(pool.attributes.base_token_price_usd)}</strong><small>{base?.attributes.name ?? 'Token data unavailable'}</small></div><ArrowRight size={19} /><div><span>{quote?.attributes.symbol ?? 'Quote token'}</span><strong>{price(pool.attributes.quote_token_price_usd)}</strong><small>{quote?.attributes.name ?? 'Token data unavailable'}</small></div></div>
    <div className="pool-facts"><div><span>Market cap</span><strong>{money(pool.attributes.market_cap_usd)}</strong></div><div><span>Fully diluted value</span><strong>{money(pool.attributes.fdv_usd)}</strong></div><div><span>Pool created</span><strong>{pool.attributes.pool_created_at ? new Date(pool.attributes.pool_created_at).toLocaleDateString() : 'Unavailable'}</strong></div><div><span>Unique traders (24h)</span><strong>{((pool.attributes.transactions?.h24?.buyers ?? 0) + (pool.attributes.transactions?.h24?.sellers ?? 0)).toLocaleString()}</strong></div></div>
    <p className="pool-source">Live market data from GeckoTerminal. Values can change between refreshes.</p>
  </section>;
}

function Pools() {
  const router = useRouter();
  const [networkId, setNetworkId] = useState(1);
  const [selected, setSelected] = useState<{ networkId: number; address: string } | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'trending' | 'liquidity' | 'volume'>('trending');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('Pool data is unavailable. Please try again later.');
  const network = networks.find(item => item.id === networkId)!;
  const visiblePools = useMemo(() => {
    const filtered = pools.filter(pool => pool.attributes.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort === 'trending') return filtered;
    const value = (pool: Pool) => Number(sort === 'liquidity' ? pool.attributes.reserve_in_usd : pool.attributes.volume_usd?.h24) || 0;
    return [...filtered].sort((a, b) => value(b) - value(a));
  }, [pools, query, sort]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedNetwork = params.get('network');
      const requestedPool = params.get('pool');
      const match = networks.find(item => item.gecko === requestedNetwork);
      if (match && requestedPool) { setNetworkId(match.id); setSelected({ networkId: match.id, address: requestedPool }); }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network.gecko}/trending_pools?page=1`, { signal: controller.signal, headers: { accept: 'application/json;version=20230302' } });
        if (response.status === 429 && attempt === 0) { await new Promise(resolve => window.setTimeout(resolve, 2500)); continue; }
        if (!response.ok) throw new Error(response.status === 429 ? 'Pool data is rate-limited. Try this network again shortly.' : `Pool data request failed (${response.status}).`);
        const body: { data?: Pool[] } = await response.json();
        if (!controller.signal.aborted) { setPools((body.data ?? []).slice(0, 10)); setState('ready'); }
        return;
      }
    }
    load().catch((reason: unknown) => { if (!controller.signal.aborted) { setPools([]); setError(reason instanceof Error ? reason.message : 'Pool data is unavailable. Please try again later.'); setState('error'); } });
    return () => controller.abort();
  }, [network.gecko]);
  if (selected) { const selectedNetwork = networks.find(item => item.id === selected.networkId) ?? network; return <PoolDetail network={selectedNetwork} address={selected.address} onBack={() => { setSelected(null); router.push('/pools'); }} />; }
  return <section className="live-pools" aria-label="Live liquidity pools"><div className="pools-heading"><div><h2>Explore pools</h2><p>Search current trending pools, compare liquidity and volume, then open full details inside ArreyX.</p></div></div><div className="pool-controls"><label className="pool-search"><Search size={16} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pools" aria-label="Search pools" /></label><select aria-label="Pool network" value={networkId} onChange={event => { setState('loading'); setPools([]); setQuery(''); setNetworkId(Number(event.target.value)); }}>{networks.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select aria-label="Sort pools" value={sort} onChange={event => setSort(event.target.value as 'trending' | 'liquidity' | 'volume')}><option value="trending">Trending</option><option value="liquidity">Liquidity</option><option value="volume">24h volume</option></select></div>
    {state === 'loading' && <p className="pool-status" role="status">Loading live pools…</p>}
    {state === 'error' && <p className="pool-status" role="alert">{error}</p>}
    {state === 'ready' && pools.length === 0 && <p className="pool-status">No pools returned for this network.</p>}
    {state === 'ready' && pools.length > 0 && visiblePools.length === 0 && <p className="pool-status">No pools match that search.</p>}
    {state === 'ready' && visiblePools.length > 0 && <div className="pool-list"><div className="pool-column-head"><span>Pool</span><span>Liquidity</span><span>24h volume</span></div>{visiblePools.map(pool => <Link className="pool-row" key={pool.id} href={`/pools?network=${network.gecko}&pool=${encodeURIComponent(pool.attributes.address)}`} onClick={() => setSelected({ networkId, address: pool.attributes.address })}><strong>{pool.attributes.name}</strong><span>{money(pool.attributes.reserve_in_usd)}</span><span>{money(pool.attributes.volume_usd?.h24)} <ArrowRight size={15} /></span></Link>)}</div>}
    <p className="pool-source">Live market data from GeckoTerminal. Pool values can change quickly.</p>
  </section>;
}

export function LiveExchange({ initialView }: { initialView?: View } = {}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [legacyView, setLegacyView] = useState<View>('swap');
  const view = initialView ?? legacyView;
  const [theme, setTheme] = useState<Theme>('dark');
  const [accounts, setAccounts] = useState<{ evm: string | null; solana: string | null }>({ evm: null, solana: null });
  const widgetRef = useRef<HTMLDivElement>(null);
  const [chartTokens, setChartTokens] = useState<TokenSelection>({ fromChain: 1, fromToken: '0x0000000000000000000000000000000000000000', toChain: 1, toToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' });
  const [widgetDefaults, setWidgetDefaults] = useState<TokenSelection>({ fromChain: 1, fromToken: '0x0000000000000000000000000000000000000000', toChain: 1, toToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' });
  useEffect(() => {
    const onConnected = ({ address, chainType }: { address: string; chainType: string }) => setAccounts(previous => ({ ...previous, [chainType === 'SVM' ? 'solana' : 'evm']: address }));
    const onDisconnected = ({ chainType }: { chainType: string }) => setAccounts(previous => ({ ...previous, [chainType === 'SVM' ? 'solana' : 'evm']: null }));
    walletManagementEvents.on(WalletManagementEvent.WalletConnected, onConnected);
    walletManagementEvents.on(WalletManagementEvent.WalletDisconnected, onDisconnected);
    const injected = (window as Window & { ethereum?: { request: (args: { method: string }) => Promise<unknown> } }).ethereum;
    injected?.request({ method: 'eth_accounts' }).then(value => { if (Array.isArray(value) && typeof value[0] === 'string') setAccounts(previous => ({ ...previous, evm: previous.evm ?? value[0] })); }).catch(() => {});
    return () => { walletManagementEvents.off(WalletManagementEvent.WalletConnected, onConnected); walletManagementEvents.off(WalletManagementEvent.WalletDisconnected, onDisconnected); };
  }, []);
  useEffect(() => {
    const onField = (data: FormFieldChanged) => {
      if (!data) return;
      const { fieldName, newValue } = data;
      if (newValue == null) return;
      if (fieldName === 'fromChain' || fieldName === 'toChain') setChartTokens(previous => ({ ...previous, [fieldName]: Number(newValue) }));
      if (fieldName === 'fromToken' || fieldName === 'toToken') setChartTokens(previous => ({ ...previous, [fieldName]: String(newValue) }));
    };
    const onSource = ({ chainId, tokenAddress }: { chainId: number; tokenAddress: string }) => setChartTokens(previous => ({ ...previous, fromChain: chainId, fromToken: tokenAddress }));
    const onDestination = ({ chainId, tokenAddress }: { chainId: number; tokenAddress: string }) => setChartTokens(previous => ({ ...previous, toChain: chainId, toToken: tokenAddress }));
    widgetEvents.on(WidgetEvent.FormFieldChanged, onField);
    widgetEvents.on(WidgetEvent.SourceChainTokenSelected, onSource);
    widgetEvents.on(WidgetEvent.DestinationChainTokenSelected, onDestination);
    return () => { widgetEvents.off(WidgetEvent.FormFieldChanged, onField); widgetEvents.off(WidgetEvent.SourceChainTokenSelected, onSource); widgetEvents.off(WidgetEvent.DestinationChainTokenSelected, onDestination); };
  }, []);
  useEffect(() => { if (initialView) return; const frame = requestAnimationFrame(() => { const requested = new URLSearchParams(window.location.search).get('view'); if (requested === 'bridge' || requested === 'pools') setLegacyView(requested); }); return () => cancelAnimationFrame(frame); }, [initialView]);
  useEffect(() => {
    if (view !== 'swap') return;
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const fromChain = Number(params.get('fromChain'));
      const toChain = Number(params.get('toChain'));
      const fromToken = params.get('fromToken');
      const toToken = params.get('toToken');
      if (!networks.some(item => item.id === fromChain) || !networks.some(item => item.id === toChain) || !fromToken || !toToken) return;
      const selection = { fromChain, fromToken, toChain, toToken };
      setWidgetDefaults(selection);
      setChartTokens(selection);
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);
  useEffect(() => { const frame = requestAnimationFrame(() => { const saved = localStorage.getItem('arreyx-theme'); setTheme(saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  const config = useMemo<WidgetConfig>(() => ({
    integrator: 'ArreyX', appearance: theme, variant: 'wide', mode: 'split',
    modeOptions: { split: view === 'bridge' ? 'bridge' : 'swap' },
    defaultUI: { layout: 'cards', transactionDetailsExpanded: true },
    chains: { allow: networks.map(network => network.id) },
    fromChain: view === 'bridge' ? 1 : widgetDefaults.fromChain, toChain: view === 'bridge' ? 42161 : widgetDefaults.toChain,
    fromToken: view === 'bridge' ? '0x0000000000000000000000000000000000000000' : widgetDefaults.fromToken,
    toToken: view === 'bridge' ? '0x0000000000000000000000000000000000000000' : widgetDefaults.toToken,
    providers: [EthereumProvider(), SolanaProvider()],
    theme: { container: { border: '1px solid var(--border)', borderRadius: '16px', boxShadow: 'none' }, routesContainer: { borderRadius: '16px', boxShadow: 'none' }, colorSchemes: { dark: { palette: { primary: { main: '#7584ff' }, background: { default: '#181b20', paper: '#20242a' }, text: { primary: '#f4f5f7', secondary: '#aab2bf' } } }, light: { palette: { primary: { main: '#4559dc' }, background: { default: '#ffffff', paper: '#f5f7fb' }, text: { primary: '#1b2333', secondary: '#626d80' } } } } },
  }), [theme, view, widgetDefaults]);
  function toggleTheme() { const next = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('arreyx-theme', next); setTheme(next); }
  function openWallet() {
    if (view === 'pools') { router.push('/swap?connect=1'); return; }
    const button = Array.from(widgetRef.current?.querySelectorAll('button') ?? []).find(item => /connect wallet|0x[a-f\d]{4}/i.test(item.textContent ?? '') && !item.closest('[data-arrey-wallet]'));
    button?.click();
  }
  useEffect(() => {
    if (!hydrated || new URLSearchParams(window.location.search).get('connect') !== '1') return;
    const observer = new MutationObserver(() => {
      const button = Array.from(widgetRef.current?.querySelectorAll('button') ?? []).find(item => /connect wallet/i.test(item.textContent ?? ''));
      if (button) { observer.disconnect(); button.click(); window.history.replaceState({}, '', '/swap'); }
    });
    if (widgetRef.current) observer.observe(widgetRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hydrated]);
  const connected = Boolean(accounts.evm || accounts.solana);
  useEffect(() => {
    if (view !== 'activity' || !hydrated || !connected) return;
    const openHistory = () => {
      const button = widgetRef.current?.querySelector('[data-testid="HistoryIcon"]')?.closest('button');
      if (!button) return false;
      button.click();
      return true;
    };
    if (openHistory()) return;
    const observer = new MutationObserver(() => { if (openHistory()) observer.disconnect(); });
    if (widgetRef.current) observer.observe(widgetRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [connected, hydrated, view]);
  const activeAccount = view === 'activity' ? accounts.evm ?? accounts.solana : chartTokens.fromChain === 1151111081099710 ? accounts.solana : accounts.evm;
  const title = view === 'swap' ? 'Swap' : view === 'bridge' ? 'Bridge' : view === 'pools' ? 'Pools' : 'Activity';
  const subtitle = view === 'swap' ? 'Compare live routes and exchange assets.' : view === 'bridge' ? 'Move assets between supported networks with live quotes.' : view === 'pools' ? 'Explore live liquidity across supported networks.' : 'Review real transactions for your connected wallet.';
  const widget = hydrated ? <LiFiWidget key={`${view}-${theme}-${widgetDefaults.fromChain}-${widgetDefaults.fromToken}-${widgetDefaults.toToken}`} integrator="ArreyX" config={config} /> : <div className="widget-loading" role="status">Loading live exchange…</div>;
  return <div className="app-shell live-shell"><header className="header"><Link className="brand" href="/" aria-label="ArreyX home"><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 33 18 5h8L10 33zm20 0 6-11 11 11zM27 5h12L28 17z" fill="currentColor" /></svg></span>Arrey<span className="brand-x">X</span></Link><nav aria-label="Main navigation">{(['swap', 'bridge', 'pools', 'activity'] as View[]).map(item => <Link key={item} href={`/${item}`} className={view === item ? 'active' : ''} aria-current={view === item ? 'page' : undefined}>{item[0].toUpperCase() + item.slice(1)}</Link>)}</nav><div className="header-actions"><button className="wallet-button" data-arrey-wallet aria-label={activeAccount ? `Wallet ${activeAccount.slice(0, 6)}…${activeAccount.slice(-4)}` : 'Connect wallet'} onClick={openWallet}><Wallet size={16} /><span>{activeAccount ? `${activeAccount.slice(0, 6)}…${activeAccount.slice(-4)}` : 'Connect wallet'}</span></button><button className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div></header>
    <main className="live-main"><div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{view === 'pools' ? <Pools /> : view === 'activity' ? <div className="activity-view">{!connected && <section className="activity-connect"><span className="activity-connect-icon"><Activity size={24} /></span><h2>Connect to view activity</h2><p>Your completed and in-progress LI.FI transactions appear here after you connect the wallet that created them.</p><button className="home-primary" onClick={openWallet}><Wallet size={17} /> Connect wallet</button></section>}<div className={`widget-wrap activity-widget${connected ? '' : ' activity-widget-hidden'}`} aria-hidden={!connected} ref={widgetRef}>{widget}</div></div> : <div className="swap-market-layout"><div className="widget-column"><div className="widget-wrap" ref={widgetRef}>{widget}</div><WalletBalances key={chartTokens.fromChain} accounts={accounts} selection={chartTokens} /></div></div>}</main>
    <footer><span>© {new Date().getFullYear()} ArreyX</span><span>Quotes, balances and transactions are provided by LI.FI and connected wallets.</span></footer></div>;
}
