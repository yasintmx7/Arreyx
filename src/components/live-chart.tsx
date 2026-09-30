'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

type Range = '24H' | '7D' | '30D';
type Candle = [number, number, number, number, number, number];
type ChartState = { status: 'loading' | 'ready' | 'error'; candles: Candle[]; fetchedAt: number };

const poolAddress = '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640';
const poolUrl = `https://www.geckoterminal.com/eth/pools/${poolAddress}`;
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

export function LiveChart() {
  const [range, setRange] = useState<Range>('24H');
  const [refresh, setRefresh] = useState(0);
  const [chart, setChart] = useState<ChartState>({ status: 'loading', candles: [], fetchedAt: 0 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { timeframe, limit } = settings[range];
    const url = `https://api.geckoterminal.com/api/v2/networks/eth/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=1&limit=${limit}&currency=usd&token=base`;
    fetch(url, { signal: controller.signal, headers: { accept: 'application/json;version=20230302' } })
      .then(response => { if (!response.ok) throw new Error(`Chart service returned ${response.status}`); return response.json(); })
      .then((body: { data?: { attributes?: { ohlcv_list?: unknown[] } } }) => {
        const candles = (body.data?.attributes?.ohlcv_list ?? []).filter(validCandle).sort((a, b) => a[0] - b[0]);
        if (candles.length < 2) throw new Error('Insufficient chart data');
        if (!controller.signal.aborted) setChart({ status: 'ready', candles, fetchedAt: Date.now() });
      })
      .catch(() => { if (!controller.signal.aborted) setChart(previous => ({ ...previous, status: 'error' })); });
    const interval = window.setInterval(() => setRefresh(value => value + 1), 60_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [range, refresh]);

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

  return <section className="market-chart" aria-label="Live WETH USDC market chart">
    <div className="chart-heading"><div><span className="chart-kicker"><span /> ETHEREUM MARKET</span><h2>WETH / USDC</h2><p>Uniswap v3 0.05% pool · USD price of WETH</p></div><button className="chart-refresh" aria-label="Refresh chart" onClick={() => { setChart(previous => ({ ...previous, status: 'loading' })); setRefresh(value => value + 1); }}><RefreshCw size={17} /></button></div>
    <div className="chart-summary"><div><strong>{shape ? price(active?.[4] ?? shape.last) : '—'}</strong><span className={shape?.rising ? 'chart-up' : 'chart-down'}>{shape ? `${shape.change >= 0 ? '+' : ''}${shape.change.toFixed(2)}%` : '—'} <small>in {range.toLowerCase()}</small></span></div><span>{active ? new Date(active[0] * 1000).toLocaleString() : chart.status === 'ready' && shape ? `Last candle ${new Date(shape.candles.at(-1)![0] * 1000).toLocaleString()}` : 'Market data'}</span></div>
    <div className="chart-canvas">{shape ? <svg viewBox="0 0 620 240" role="img" aria-label={`${range} WETH price chart; latest ${price(shape.last)}`} onPointerMove={event => track(event.clientX, event.currentTarget)} onPointerLeave={() => setHoverIndex(null)}><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={shape.rising ? '#7488ff' : '#f08c91'} stopOpacity=".25"/><stop offset="100%" stopColor={shape.rising ? '#7488ff' : '#f08c91'} stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(index => <g key={index}><line x1="16" x2="596" y1={18 + index * 63.3} y2={18 + index * 63.3} className="chart-grid-line"/><text x="605" y={22 + index * 63.3} className="chart-axis" textAnchor="end">{Math.round(shape.max - index / 3 * (shape.max - shape.min)).toLocaleString()}</text></g>)}<path d={shape.area} fill="url(#chart-fill)"/><path d={shape.line} fill="none" stroke={shape.rising ? '#8798ff' : '#f08c91'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>{active && hoverIndex !== null && <g><line x1={shape.x(hoverIndex)} x2={shape.x(hoverIndex)} y1="18" y2="220" className="chart-crosshair"/><circle cx={shape.x(hoverIndex)} cy={shape.y(active[4])} r="5" fill={shape.rising ? '#8798ff' : '#f08c91'} stroke="var(--surface)" strokeWidth="2"/></g>}</svg> : <div className="chart-placeholder" role="status">{chart.status === 'error' ? 'Live chart unavailable right now.' : 'Loading live market candles…'}</div>}</div>
    <div className="chart-bottom"><div className="chart-ranges" aria-label="Chart range">{(['24H', '7D', '30D'] as Range[]).map(option => <button key={option} className={range === option ? 'active' : ''} aria-pressed={range === option} onClick={() => { setRange(option); setHoverIndex(null); setChart(previous => ({ ...previous, status: 'loading' })); }}>{option}</button>)}</div><span>{chart.status === 'ready' ? `Fetched ${new Date(chart.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Awaiting data'}</span></div>
    <div className="chart-foot"><p>Market candles are from one pool and may differ from executable LI.FI routes. Refreshes every minute.</p><a href={poolUrl} target="_blank" rel="noopener noreferrer">View pool on GeckoTerminal <ArrowUpRight size={14} /></a></div>
  </section>;
}
