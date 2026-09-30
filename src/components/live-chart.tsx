'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

type Range = '24H' | '7D' | '30D';
type Candle = [number, number, number, number, number, number];
type ChartState = { status: 'loading' | 'ready' | 'error'; candles: Candle[]; fetchedAt: number; error?: string };
type Selection = { fromChain: number; fromToken: string; toChain: number; toToken: string };
type Pool = { attributes?: { address?: string; name?: string }; relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } } };
const wrappedNative: Record<number, string> = { 1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 8453: '0x4200000000000000000000000000000000000006', 56: '0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 10: '0x4200000000000000000000000000000000000006', 137: '0x0d500B1d8E8e3a6A1fF70B4Ebd3c9D4f1270C27', 43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 100: '0x6A023CCD1ff6F2045C3309768eAd9E68F978f6e1', 534352: '0x5300000000000000000000000000000000000004', 59144: '0xe5D7C2a44fFDDf6b295A15c148167daaAf5Cf34f' };
const networkNames: Record<number, string> = { 1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base', 56: 'BNB Chain', 10: 'OP Mainnet', 137: 'Polygon', 43114: 'Avalanche', 100: 'Gnosis', 534352: 'Scroll', 59144: 'Linea' };
const geckoNetworks: Record<number, string> = { 1: 'eth', 42161: 'arbitrum', 8453: 'base', 56: 'bsc', 10: 'optimism', 137: 'polygon_pos', 43114: 'avax', 100: 'xdai', 534352: 'scroll', 59144: 'linea' };
const nativeAddress = '0x0000000000000000000000000000000000000000';
const poolCache = new Map<string, { data: Pool[]; fetchedAt: number }>();
function chartAddress(chain: number, address: string) { return address.toLowerCase() === nativeAddress ? wrappedNative[chain] : address; }
function tokenId(address: string) { return address.toLowerCase(); }
async function apiJson<T>(url: string, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { signal, headers: { accept: 'application/json;version=20230302' } });
    if (response.ok) return response.json() as Promise<T>;
    if (response.status !== 429 || attempt === 2) throw new Error(response.status === 429 ? 'Market data is rate-limited. Try refreshing shortly.' : `Market data request failed (${response.status}).`);
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, (attempt + 1) * 2000);
      const onAbort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
  throw new Error('Market data request failed.');
}
const settings: Record<Range, { timeframe: string; limit: number }> = {
  '24H': { timeframe: 'hour', limit: 24 },
  '7D': { timeframe: 'hour', limit: 168 },
  '30D': { timeframe: 'day', limit: 30 },
};

function price(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function validCandle(value: unknown): value is Candle {
  return Array.isArray(value) && value.length >= 6 && value.slice(0, 6).every(item => typeof item === 'number' && Number.isFinite(item)) && value[0] > 0 && value[1] > 0 && value[4] > 0;
}

export function LiveChart({ selection }: { selection: Selection }) {
  const [range, setRange] = useState<Range>('24H');
  const [refresh, setRefresh] = useState(0);
  const [chart, setChart] = useState<ChartState>({ status: 'loading', candles: [], fetchedAt: 0 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pool, setPool] = useState<{ address: string; name: string; side: 'base' | 'quote'; matchedPair: boolean } | null>(null);
  const network = geckoNetworks[selection.fromChain];
  const source = chartAddress(selection.fromChain, selection.fromToken);
  const target = selection.fromChain === selection.toChain ? chartAddress(selection.toChain, selection.toToken) : null;

  useEffect(() => {
    const controller = new AbortController();
    const { timeframe, limit } = settings[range];
    async function load() {
      setChart({ status: 'loading', candles: [], fetchedAt: 0 });
      setPool(null);
      if (!network || !source) throw new Error('Unsupported chart network');
      const cacheKey = `${network}:${tokenId(source)}`;
      const cached = poolCache.get(cacheKey);
      let candidates = cached && Date.now() - cached.fetchedAt < 300_000 ? cached.data : null;
      if (!candidates) {
        const poolsBody = await apiJson<{ data?: Pool[] }>(`https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${source}/pools?page=1`, controller.signal);
        candidates = poolsBody.data ?? [];
        if (candidates.length) poolCache.set(cacheKey, { data: candidates, fetchedAt: Date.now() });
      }
      const sourceId = tokenId(source);
      const targetId = target ? tokenId(target) : null;
      const matches = (item: Pool, side: 'base' | 'quote', address: string) => item.relationships?.[`${side}_token`]?.data?.id?.toLowerCase().endsWith(`_${address}`);
      const choice = (targetId ? candidates.find(item => (matches(item, 'base', sourceId) && matches(item, 'quote', targetId)) || (matches(item, 'quote', sourceId) && matches(item, 'base', targetId))) : null) ?? candidates.find(item => matches(item, 'base', sourceId) || matches(item, 'quote', sourceId));
      const address = choice?.attributes?.address;
      if (!choice || !address) throw new Error('No live pool was found for this token on this network.');
      const side: 'base' | 'quote' = matches(choice, 'base', sourceId) ? 'base' : 'quote';
      const matchedPair = Boolean(targetId && matches(choice, side === 'base' ? 'quote' : 'base', targetId));
      const nextPool = { address, name: choice.attributes?.name ?? 'Pool', side, matchedPair };
      const url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${address}/ohlcv/${timeframe}?aggregate=1&limit=${limit}&currency=usd&token=${side}`;
      const body = await apiJson<{ data?: { attributes?: { ohlcv_list?: unknown[] } } }>(url, controller.signal);
      const candles = (body.data?.attributes?.ohlcv_list ?? []).filter(validCandle).sort((a, b) => a[0] - b[0]);
      if (candles.length < 2) throw new Error('This pool has too few candles for the selected range.');
      if (!controller.signal.aborted) { setPool(nextPool); setChart({ status: 'ready', candles, fetchedAt: Date.now() }); }
    }
    const timer = window.setTimeout(() => { load().catch((error: unknown) => { if (!controller.signal.aborted) setChart({ status: 'error', candles: [], fetchedAt: 0, error: error instanceof Error ? error.message : 'Market data could not be loaded.' }); }); }, 350);
    const interval = window.setInterval(() => setRefresh(value => value + 1), 60_000);
    return () => { controller.abort(); window.clearTimeout(timer); window.clearInterval(interval); };
  }, [range, refresh, network, source, target]);

  const shape = useMemo(() => {
    if (chart.status !== 'ready' || chart.candles.length < 2) return null;
    const candles = chart.candles;
    const closes = candles.map(candle => candle[4]);
    const low = Math.min(...closes);
    const high = Math.max(...closes);
    const pad = Math.max((high - low) * .13, high * .001);
    const min = low - pad;
    const max = high + pad;
    const width = 580;
    const height = 190;
    const x = (index: number) => 16 + index / (candles.length - 1) * width;
    const y = (value: number) => 18 + (max - value) / (max - min) * height;
    const points = closes.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    const line = `M ${points.join(' L ')}`;
    const area = `${line} L ${x(candles.length - 1).toFixed(1)},220 L 16,220 Z`;
    const first = candles[0][1];
    const last = closes[closes.length - 1];
    return { candles, line, area, x, y, min, max, first, last, change: (last - first) / first * 100, rising: last >= first };
  }, [chart]);

  const active = shape && hoverIndex !== null ? shape.candles[hoverIndex] : null;
  function track(pointerX: number, element: SVGSVGElement) {
    if (!shape) return;
    const rect = element.getBoundingClientRect();
    const viewX = (pointerX - rect.left) / rect.width * 620;
    setHoverIndex(Math.max(0, Math.min(shape.candles.length - 1, Math.round((viewX - 16) / 580 * (shape.candles.length - 1)))));
  }

  return <section className="market-chart" aria-label="Live selected token market chart">
    <div className="chart-heading"><div><span className="chart-kicker"><span /> {networkNames[selection.fromChain]?.toUpperCase() ?? 'MARKET'} MARKET</span><h2>{pool?.name ?? 'Selected token'}</h2><p>{pool ? `${pool.matchedPair ? 'Selected token pair' : 'Top available pool for source token'} · USD price of ${selection.fromToken.toLowerCase() === nativeAddress ? 'wrapped native token' : 'source token'}` : 'Finding a live pool for the selected source token'}</p></div><button className="chart-refresh" aria-label="Refresh chart" onClick={() => { setChart(previous => ({ ...previous, status: 'loading' })); setRefresh(value => value + 1); }}><RefreshCw size={17} /></button></div>
    <div className="chart-summary"><div><strong>{shape ? price(active?.[4] ?? shape.last) : '—'}</strong><span className={shape?.rising ? 'chart-up' : 'chart-down'}>{shape ? `${shape.change >= 0 ? '+' : ''}${shape.change.toFixed(2)}%` : '—'} <small>in {range.toLowerCase()}</small></span></div><span>{active ? new Date(active[0] * 1000).toLocaleString() : chart.status === 'ready' && shape ? `Last candle ${new Date(shape.candles.at(-1)![0] * 1000).toLocaleString()}` : 'Market data'}</span></div>
    <div className="chart-canvas">{shape ? <svg viewBox="0 0 620 240" role="img" aria-label={`${range} selected token USD price chart; latest ${price(shape.last)}`} onPointerMove={event => track(event.clientX, event.currentTarget)} onPointerLeave={() => setHoverIndex(null)}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={shape.rising ? '#7488ff' : '#f08c91'} stopOpacity=".25"/><stop offset="100%" stopColor={shape.rising ? '#7488ff' : '#f08c91'} stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(index => <g key={index}><line x1="16" x2="596" y1={18 + index * 63.3} y2={18 + index * 63.3} className="chart-grid-line"/><text x="605" y={22 + index * 63.3} className="chart-axis" textAnchor="end">{Math.round(shape.max - index / 3 * (shape.max - shape.min)).toLocaleString()}</text></g>)}<path d={shape.area} fill="url(#chart-fill)"/><path d={shape.line} fill="none" stroke={shape.rising ? '#8798ff' : '#f08c91'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>{active && hoverIndex !== null && <g><line x1={shape.x(hoverIndex)} x2={shape.x(hoverIndex)} y1="18" y2="220" className="chart-crosshair"/><circle cx={shape.x(hoverIndex)} cy={shape.y(active[4])} r="5" fill={shape.rising ? '#8798ff' : '#f08c91'} stroke="var(--surface)" strokeWidth="2"/></g>}</svg> : <div className="chart-placeholder" role="status">{chart.status === 'error' ? chart.error : 'Loading live market candles…'}</div>}</div>
    <div className="chart-bottom"><div className="chart-ranges" aria-label="Chart range">{(['24H', '7D', '30D'] as Range[]).map(option => <button key={option} className={range === option ? 'active' : ''} aria-pressed={range === option} onClick={() => { setRange(option); setHoverIndex(null); setChart(previous => ({ ...previous, status: 'loading' })); }}>{option}</button>)}</div><span>{chart.status === 'ready' ? `Fetched ${new Date(chart.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting data'}</span></div>
    <div className="chart-foot"><p>USD candles come from {pool?.matchedPair ? 'a pool for the selected pair' : 'an available pool for the source token'} and may differ from executable LI.FI routes. Refreshes every minute.</p>{pool && <a href={`https://www.geckoterminal.com/${network}/pools/${encodeURIComponent(pool.address)}`} target="_blank" rel="noopener noreferrer">View source pool <ArrowUpRight size={14} /></a>}</div>
  </section>;
}
