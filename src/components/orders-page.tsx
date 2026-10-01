'use client';

import dynamic from 'next/dynamic';
import { Clock3, ListFilter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CowSwapWidgetParams, CowSwapTheme, TradeType } from '@cowprotocol/widget-react';
import { ToolShell } from './tool-shell';

const CowSwapWidget = dynamic(() => import('@cowprotocol/widget-react').then(module => module.CowSwapWidget), { ssr: false });

export function OrdersPage() {
  const [mode, setMode] = useState<'limit' | 'advanced'>('limit');
  const [theme, setTheme] = useState<CowSwapTheme>('dark');
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const params = useMemo<CowSwapWidgetParams>(() => ({
    appCode: 'ArreyX',
    tradeType: mode as TradeType,
    enabledTradeTypes: ['limit', 'advanced'] as TradeType[],
    chainId: 1,
    theme,
    standaloneMode: true,
    disableCrossChainSwap: true,
    disableInfiniteApprove: true,
    disableTrade: { whenPriceImpactIsUnknown: true, whenPriceImpactIsHigherThan: 10 },
    hideLogo: true,
    rootStyle: { width: '100%', minHeight: '760px', borderRadius: '16px', overflow: 'hidden' },
    cardStyle: { boxShadow: 'none' },
  }), [mode, theme]);
  return <ToolShell active="orders" title="Orders" subtitle="Place real limit and time-weighted orders through CoW Protocol." wide>
    <div className="order-mode" role="group" aria-label="Order type"><button className={mode === 'limit' ? 'active' : ''} onClick={() => setMode('limit')}><ListFilter size={16} /> Limit order</button><button className={mode === 'advanced' ? 'active' : ''} onClick={() => setMode('advanced')}><Clock3 size={16} /> TWAP order</button></div>
    <div className="tool-alert">Orders are signed by your wallet and submitted to CoW Protocol’s live orderbook. Exact token approvals are enabled; review the price, expiry, and wallet request before signing.</div>
    <section className="cow-widget-panel" aria-label={mode === 'limit' ? 'Limit order interface' : 'TWAP order interface'}><CowSwapWidget key={`${mode}-${theme}`} params={params} /></section>
  </ToolShell>;
}
