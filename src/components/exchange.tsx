'use client';
import Link from 'next/link';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, Check, CheckCheck, ChevronDown, Clock3, FlaskConical, History, Info, LoaderCircle, LockKeyhole, Settings2, ShieldCheck, Wallet, X } from 'lucide-react';
import { chains, tokensForChain } from '@/config/registry';
import type { Activity, QuoteRequest, RoutePreference, Token } from '@/types/domain';
import { formatAmount, parseAmount, usd, valueUsd } from '@/lib/amounts';
import { useQuotes } from '@/hooks/use-quotes';
import { transactionReducer } from '@/transaction/machine';
import { TokenIcon, TokenInput } from './token-input';
import { Modal, SettingsDialog, TokenDialog, WalletDialog } from './dialogs';
import { RoutePanel } from './route-panel';

export function Exchange() {
  const [chainId, setChainId] = useState(1);
  const tokens = useMemo(() => tokensForChain(chainId), [chainId]);
  const [sellSymbol, setSellSymbol] = useState('ETH');
  const [buySymbol, setBuySymbol] = useState('USDC');
  const sell = tokens.find(t => t.symbol === sellSymbol)!;
  const buy = tokens.find(t => t.symbol === buySymbol)!;
  const [amount, setAmount] = useState('1');
  const [connected, setConnected] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tokenSide, setTokenSide] = useState<'sell' | 'buy' | null>(null);
  const [slippage, setSlippage] = useState(50);
  const [preference, setPreference] = useState<RoutePreference>('return');
  const [scenario, setScenario] = useState('normal');
  const [selectedId, setSelectedId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<'swap' | 'activity'>('swap');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [transaction, dispatch] = useReducer(transactionReducer, { status: 'idle' });
  const [simulateFailure, setSimulateFailure] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  let amountIn = 0n;
  let inputError = '';
  try { amountIn = amount ? parseAmount(amount, sell.decimals) : 0n; } catch (error) { inputError = error instanceof Error ? error.message : 'Invalid amount'; }
  const insufficient = connected && amountIn > parseAmount(sell.demoBalance, sell.decimals);
  const request = useMemo<QuoteRequest | null>(() => amountIn > 0n ? { chainId, destinationChainId: chainId, tokenIn: sell, tokenOut: buy, amountIn, slippageBps: slippage, preference } : null, [chainId, sell, buy, amountIn, slippage, preference]);
  const quote = useQuotes(request, scenario, refresh);
  const selected = quote.routes.find(r => r.id === selectedId) ?? quote.routes[0];
  const currentChain = chains.find(c => c.id === chainId)!;
  const route = transaction.route;
  const busy = ['approval-pending', 'approval-confirmed', 'awaiting-signature', 'submitted', 'pending'].includes(transaction.status);

  useEffect(() => {
    const next = transaction.status === 'approval-pending' ? 'approval-confirmed' : transaction.status === 'approval-confirmed' ? 'awaiting-signature' : transaction.status === 'awaiting-signature' ? 'submitted' : transaction.status === 'submitted' ? 'pending' : transaction.status === 'pending' ? 'success' : null;
    if (!next) return;
    timer.current = setTimeout(() => {
      if (simulateFailure && transaction.status === 'awaiting-signature') dispatch({ type: 'fail', error: 'The demo signature was rejected. Your balances have not changed.' });
      else dispatch({ type: 'advance', status: next });
    }, 1100);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [transaction.status, simulateFailure]);

  function selectToken(token: Token) {
    if (tokenSide === 'sell') { if (token.symbol === buySymbol) setBuySymbol(sellSymbol); setSellSymbol(token.symbol); }
    else { if (token.symbol === sellSymbol) setSellSymbol(buySymbol); setBuySymbol(token.symbol); }
    setSelectedId(''); setTokenSide(null);
  }
  function closeTransaction() {
    if (busy) return;
    if (route && (transaction.status === 'success' || transaction.status === 'failed')) setActivity(previous => [{ id: `${Date.now()}`, route, timestamp: Date.now(), status: transaction.status as 'success' | 'failed' }, ...previous]);
    dispatch({ type: 'reset' }); setSimulateFailure(false); setRefresh(v => v + 1);
  }
  function confirm() {
    if (!route || route.expiresAt <= Date.now()) { dispatch({ type: 'advance', status: 'expired' }); return; }
    dispatch({ type: 'advance', status: route.approvalRequired ? 'approval-required' : 'awaiting-signature' });
  }
  const primaryLabel = !connected ? 'Connect wallet' : inputError ? 'Check amount' : !amountIn ? 'Enter an amount' : insufficient ? 'Insufficient balance' : quote.status === 'loading' ? 'Finding routes…' : !selected ? 'No route available' : 'Review swap';
  return <div className="app-shell">
    <header className="header"><Link className="brand" href="/" aria-label="ArreyX home"><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 33 18 5h8L10 33zm20 0 6-11 11 11zM27 5h12L28 17z" fill="currentColor" /></svg></span>Arrey<span className="brand-x">X</span></Link><nav aria-label="Main navigation"><button className={tab === 'swap' ? 'active' : ''} onClick={() => setTab('swap')}>Swap</button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity{activity.length > 0 && <span className="nav-count">{activity.length}</span>}</button></nav><div className="header-actions"><span className="environment"><FlaskConical size={13} /> Demo environment</span><button aria-label={connected ? 'Demo wallet' : 'Connect wallet'} className="wallet-button" onClick={() => connected ? setAccountOpen(true) : setWalletOpen(true)}><Wallet size={16} /><span>{connected ? 'Demo wallet' : 'Connect wallet'}</span></button></div></header>
    <main>
      <div className="page-heading"><div><div className="kicker"><span /> SIMPLY A BETTER EXCHANGE</div><h1>{tab === 'swap' ? <>Less friction.<br className="mobile-break" /> More possibility.</> : 'Your swaps, in one place.'}</h1><p>{tab === 'swap' ? 'Move between assets. We’ll find the way.' : 'A clear view of your activity in this demo session.'}</p></div><span className="heading-index">{tab === 'swap' ? '01 / EXCHANGE' : '02 / ACTIVITY'}</span></div>
      {tab === 'swap' ? <div className="workspace"><section className="swap-card"><div className="swap-heading"><h2>Swap</h2><div><button className="chain-button" onClick={() => setNetworkOpen(true)}><span className="chain-glyph">♦</span>{currentChain.name}<ChevronDown size={14} /></button><button className="icon-button" aria-label="Swap settings" onClick={() => setSettingsOpen(true)}><Settings2 size={18} /></button></div></div><div className="token-fields"><TokenInput side="sell" token={sell} amount={amount} onAmount={setAmount} onSelect={() => setTokenSide('sell')} connected={connected} usdValue={usd(valueUsd(amountIn, sell.decimals, sell.priceUsdMicros))} onMax={() => setAmount(sell.address === 'native' ? formatAmount(parseAmount(sell.demoBalance, sell.decimals) - parseAmount('0.01', sell.decimals), sell.decimals, sell.decimals).replaceAll(',', '') : sell.demoBalance)} /><div className="direction-row"><button aria-label="Reverse token direction" onClick={() => { setSellSymbol(buySymbol); setBuySymbol(sellSymbol); setSelectedId(''); }}><ArrowDownUp size={17} /></button></div><TokenInput side="buy" token={buy} amount={selected ? formatAmount(selected.expectedAmountOut, buy.decimals, 6) : ''} onSelect={() => setTokenSide('buy')} connected={connected} usdValue={selected ? usd(selected.outputValueUsd) : '$0.00'} loading={quote.status === 'loading'} /></div>
      <div className="quote-meta"><div><span className="rate-icon">≈</span><span>1 {sell.symbol} <span className="muted">=</span> {formatAmount(sell.priceUsdMicros * 10n ** BigInt(buy.decimals) / buy.priceUsdMicros, buy.decimals, 4)} {buy.symbol}</span><span className="muted">Demo rate</span></div><button className="icon-button" aria-label="Refresh quote" onClick={() => setRefresh(v => v + 1)}><Clock3 size={15} /></button></div>
      <div className="swap-details"><div><span>Network cost <Info size={12} /></span><strong>{selected ? usd(selected.fees.gasUsd) : '—'}</strong></div><div><span>Slippage tolerance</span><button onClick={() => setSettingsOpen(true)}>{slippage === 50 ? 'Auto · ' : ''}{slippage / 100}% <Settings2 size={12} /></button></div><div><span>Minimum received</span><strong>{selected ? `${formatAmount(selected.minimumAmountOut, buy.decimals, 4)} ${buy.symbol}` : '—'}</strong></div></div>
      {inputError && <p role="alert" className="error-text">{inputError}</p>}<button className="primary swap-cta" disabled={connected && (!!inputError || insufficient || !selected || quote.status !== 'ready')} onClick={() => { if (!connected) setWalletOpen(true); else if (selected) dispatch({ type: 'review', route: selected }); }}>{!connected && <Wallet size={18} />}{quote.status === 'loading' && connected && <LoaderCircle className="spin" size={18} />}{primaryLabel}</button><div className="swap-assurance"><LockKeyhole size={12} />Simulation only. No real funds are used.</div></section><RoutePanel routes={quote.routes} selected={selected} onSelect={setSelectedId} status={quote.status} failures={quote.failures} retry={() => setRefresh(v => v + 1)} /></div> : <section className="activity-card"><div className="activity-title"><h2>Recent activity</h2><span className="demo-tag">THIS SESSION</span></div>{activity.length === 0 ? <div className="empty activity-empty"><History size={34} /><h3>A fresh start.</h3><p>Your simulated swaps will appear here.<br />Connect a demo wallet to make your first swap.</p><button className="secondary" onClick={() => setTab('swap')}>Go to swap</button></div> : activity.map(item => <div className="activity-row" key={item.id}><TokenIcon token={item.route.tokenIn} /><div><strong>{item.route.tokenIn.symbol} to {item.route.tokenOut.symbol}</strong><small>{chains.find(c => c.id === item.route.chainId)?.name} · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.route.provider}</small></div><div><strong>{formatAmount(item.route.amountIn, item.route.tokenIn.decimals, 4)} {item.route.tokenIn.symbol}</strong><small className={item.status === 'success' ? 'positive' : 'error-text'}>{item.status === 'success' ? 'Simulation completed' : 'Simulation rejected'}</small></div></div>)}</section>}
      <div className="principles"><span><GitForkIcon />Multiple routes. One simple swap.</span><span><ShieldCheck size={16} />Transparent at every step.</span><span><LockKeyhole size={15} />Your wallet. Your control.</span></div>
    </main><footer><span>© {new Date().getFullYear()} ArreyX</span><span className="footer-note">Complex routing. Effortless swapping.</span><button onClick={() => setSettingsOpen(true)}>Prototype settings <ArrowUpRight size={13} /></button></footer>
    <TokenDialog key={`${tokenSide}-${chainId}`} open={!!tokenSide} onClose={() => setTokenSide(null)} tokens={tokens} onSelect={selectToken} selectedId={tokenSide === 'sell' ? sell.id : buy.id} connected={connected} />
    <WalletDialog open={walletOpen} onClose={() => setWalletOpen(false)} connect={() => { setConnected(true); setWalletOpen(false); }} />
    <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} slippage={slippage} setSlippage={setSlippage} preference={preference} setPreference={v => { setPreference(v); setSelectedId(''); }} scenario={scenario} setScenario={setScenario} />
    <Modal open={networkOpen} onClose={() => setNetworkOpen(false)} title="Choose a network" description="Explore same-chain swaps across demo networks.">{chains.map(chain => <button className="network-option" key={chain.id} onClick={() => { setChainId(chain.id); setSelectedId(''); setNetworkOpen(false); }}><span className="chain-symbol">{chain.shortName.slice(0, 1)}</span><strong>{chain.name}</strong><small>{chainId === chain.id ? <Check size={18} /> : 'Demo'}</small></button>)}</Modal>
    <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Demo wallet" description="This session uses simulated balances. No real wallet is connected.">{tokens.map(t => <div className="balance-row" key={t.id}><TokenIcon token={t} small /><strong>{t.symbol}</strong><span>{t.demoBalance}</span></div>)}<button className="secondary full" onClick={() => { setConnected(false); setAccountOpen(false); }}>Disconnect demo wallet</button></Modal>
    <Modal open={transaction.status !== 'idle'} onClose={closeTransaction} title={transaction.status === 'success' ? 'Swap simulated' : transaction.status === 'failed' ? 'Swap not completed' : transaction.status === 'expired' ? 'Quote expired' : busy ? 'Your swap is on its way' : transaction.status === 'approval-required' ? `Approve ${route?.tokenIn.symbol}` : 'Review your swap'} description={transaction.status === 'success' ? 'You’ve explored the full flow. No assets were moved.' : 'Demo transaction · No real wallet signature or funds.'}>
      {route && <><div className="review-pair"><div><TokenIcon token={route.tokenIn} /><span>You pay<strong>{formatAmount(route.amountIn, route.tokenIn.decimals)} {route.tokenIn.symbol}</strong></span></div><ArrowDownUp size={18} /><div><TokenIcon token={route.tokenOut} /><span>You receive<strong>{formatAmount(route.expectedAmountOut, route.tokenOut.decimals)} {route.tokenOut.symbol}</strong></span></div></div><div className="review-details"><div><span>Network</span><strong>{chains.find(c => c.id === route.chainId)?.name}</strong></div><div><span>Minimum received</span><strong>{formatAmount(route.minimumAmountOut, route.tokenOut.decimals)} {route.tokenOut.symbol}</strong></div><div><span>Network cost</span><strong>{usd(route.fees.gasUsd)}</strong></div><div><span>Protocol / bridge fees</span><strong>{usd(route.fees.protocolUsd)} / {usd(route.fees.bridgeUsd)}</strong></div><div><span>Price impact</span><strong>{route.priceImpactBps / 100}%</strong></div><div><span>Route / estimate</span><strong>{route.provider} · ~{route.estimatedSeconds}s</strong></div></div></>}
      {transaction.status === 'review' && <><label className="failure-toggle"><input type="checkbox" checked={simulateFailure} onChange={e => setSimulateFailure(e.target.checked)} />Test a rejected signature</label>{slippage > 100 && <p className="warning-text">You selected {slippage / 100}% slippage. Review the minimum received carefully.</p>}<button className="primary full" onClick={confirm}>Confirm demo swap</button></>}
      {transaction.status === 'approval-required' && <><div className="notice">Simulate approving exactly {formatAmount(route!.amountIn, route!.tokenIn.decimals)} {route!.tokenIn.symbol}. This does not request a real token allowance.</div><button className="primary full" onClick={() => { if (route!.expiresAt <= Date.now()) dispatch({ type: 'advance', status: 'expired' }); else dispatch({ type: 'advance', status: 'approval-pending' }); }}>Simulate approval</button></>}
      {busy && <div className="progress-state" aria-live="polite"><LoaderCircle size={23} className="spin" /><strong>{transaction.status === 'approval-pending' ? 'Simulating token approval…' : transaction.status === 'approval-confirmed' ? 'Approval simulated' : transaction.status === 'awaiting-signature' ? 'Simulating wallet confirmation…' : transaction.status === 'submitted' ? 'Demo transaction submitted' : 'Simulating execution…'}</strong></div>}
      {transaction.status === 'success' && <><div className="success-state"><CheckCheck size={30} /><span>Simulation completed successfully</span></div><button className="primary full" onClick={closeTransaction}>Done</button></>}
      {transaction.status === 'failed' && <><p className="error-text" role="alert">{transaction.error}</p><button className="secondary full" onClick={closeTransaction}>Back to swap</button></>}
      {transaction.status === 'expired' && <><div className="notice">This quote is no longer current. Refresh and review a new quote before continuing.</div><button className="primary full" onClick={closeTransaction}>Get a fresh quote</button></>}
      {busy && <button className="text-button full" onClick={() => dispatch({ type: 'fail', error: 'Demo simulation cancelled. No assets were moved.' })}><X size={14} />Cancel simulation</button>}
    </Modal>
  </div>;
}
function GitForkIcon() { return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="5" cy="4" r="2" /><circle cx="15" cy="4" r="2" /><circle cx="10" cy="16" r="2" /><path d="M5 6v2q0 3 5 3m5-5v2q0 3-5 3v3" /></svg>; }
