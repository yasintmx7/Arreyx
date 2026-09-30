'use client';
import { X, Search, ChevronRight, Wallet, FlaskConical } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Token, RoutePreference } from '@/types/domain';
import { TokenIcon } from './token-input';
export function Modal({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="modal" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onClose(); }}><div className="modal-title"><h2 id={`${id}-title`}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div><p id={`${id}-description`} className="modal-description">{description}</p>{children}</dialog>;
}
export function TokenDialog({ open, onClose, tokens, onSelect, selectedId, connected }: { open: boolean; onClose: () => void; tokens: Token[]; onSelect: (token: Token) => void; selectedId: string; connected: boolean }) {
  const [search, setSearch] = useState('');
  const results = tokens.filter(token => `${token.symbol} ${token.name}`.toLowerCase().includes(search.toLowerCase()));
  return <Modal open={open} onClose={onClose} title="Select a token" description="Curated demo assets. Balances and prices are simulated."><div className="search"><Search size={18} /><input aria-label="Search tokens" placeholder="Search name or symbol" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="popular">{tokens.slice(0, 3).map(t => <button key={t.id} onClick={() => { onSelect(t); setSearch(''); }}><TokenIcon token={t} small />{t.symbol}</button>)}</div><p className="eyebrow">ALL DEMO TOKENS</p><div className="token-list">{results.map(t => <button key={t.id} className={`token-row ${selectedId === t.id ? 'selected' : ''}`} onClick={() => { onSelect(t); setSearch(''); }}><TokenIcon token={t} /><span><strong>{t.symbol}</strong><small>{t.name}</small></span><span className="token-balance">{connected ? t.demoBalance : '—'}<small>{selectedId === t.id ? 'Selected' : 'Demo asset'}</small></span></button>)}</div>{!results.length && <div className="empty"><Search /><h3>No matching token</h3><p>Try ETH, USDC, or another listed asset. Contract imports are unavailable in this prototype.</p></div>}</Modal>;
}
export function WalletDialog({ open, onClose, connect }: { open: boolean; onClose: () => void; connect: () => void }) {
  return <Modal open={open} onClose={onClose} title="Connect to ArreyX" description="Explore the full swap experience with a demo wallet."><div className="wallet-illustration"><Wallet size={32} /></div><button className="wallet-option" onClick={connect}><FlaskConical size={23} /><span><strong>Try a demo wallet</strong><small>Simulated balances. No funds required.</small></span><ChevronRight size={18} /></button><div className="notice">This is a frontend prototype. Real wallet connections, approvals, and transactions are not enabled.</div></Modal>;
}
export function SettingsDialog({ open, onClose, slippage, setSlippage, preference, setPreference, scenario, setScenario }: { open: boolean; onClose: () => void; slippage: number; setSlippage: (value: number) => void; preference: RoutePreference; setPreference: (value: RoutePreference) => void; scenario: string; setScenario: (value: string) => void }) {
  const [custom, setCustom] = useState('');
  const customNumber = Number(custom);
  const invalid = custom !== '' && (!Number.isFinite(customNumber) || customNumber < 0.01 || customNumber > 5);
  return <Modal open={open} onClose={onClose} title="Swap settings" description="Choose how ArreyX finds your route."><div className="setting"><div><strong>Slippage tolerance</strong><p>Maximum change in price you accept.</p></div><div className="segments">{[10, 50, 100].map(v => <button key={v} className={v === slippage ? 'active' : ''} onClick={() => { setSlippage(v); setCustom(''); }}>{v === 50 ? 'Auto · 0.5%' : `${v / 100}%`}</button>)}</div><label className="custom-slippage">Custom %<input aria-label="Custom slippage percent" inputMode="decimal" value={custom} placeholder="0.50" onChange={e => { setCustom(e.target.value); const n = Number(e.target.value); if (e.target.value && n >= 0.01 && n <= 5) setSlippage(Math.round(n * 100)); }} /></label>{invalid && <p className="error-text">Enter a value from 0.01% to 5%.</p>}{slippage > 100 && <p className="warning-text">High slippage can result in significantly less received.</p>}</div><div className="setting"><label htmlFor="preference">Route preference</label><select id="preference" value={preference} onChange={e => setPreference(e.target.value as RoutePreference)}><option value="return">Best return</option><option value="fastest">Fastest execution</option><option value="gas">Lowest network cost</option></select></div><details className="demo-controls"><summary>Prototype scenarios</summary><label htmlFor="scenario">Quote behavior</label><select id="scenario" value={scenario} onChange={e => setScenario(e.target.value)}><option value="normal">All providers available</option><option value="partial">One provider unavailable</option><option value="empty">No liquidity</option><option value="failure">All providers unavailable</option></select></details><button className="primary full" onClick={onClose} disabled={invalid}>Done</button></Modal>;
}
