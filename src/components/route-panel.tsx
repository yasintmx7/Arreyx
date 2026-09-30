import { useState } from 'react';
import { Check, ChevronDown, RefreshCw, Route as RouteIcon } from 'lucide-react';
import type { Route } from '@/types/domain';
import { formatAmount, usd } from '@/lib/amounts';

export function RoutePanel({ routes, selected, onSelect, status, failures, retry }: { routes: Route[]; selected?: Route; onSelect: (id: string) => void; status: string; failures: string[]; retry: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return <aside className="route-panel" aria-label="Available swap routes">
    <div className="route-heading">
      <div><h2>Routes</h2><p>Compare the paths for this swap.</p></div>
      <span className="route-count">{routes.length}</span>
    </div>
    <div className={`routes ${status === 'loading' ? 'updating' : ''}`} aria-live="polite">
      {routes.length > 0 ? routes.map((route, i) => <button key={route.id} className={`route-choice ${selected?.id === route.id ? 'chosen' : ''}`} onClick={() => onSelect(route.id)} aria-pressed={selected?.id === route.id}>
        <span className="route-choice-top"><strong>{route.provider}</strong>{i === 0 && <span className="best-badge">Best return</span>}<span className="radio">{selected?.id === route.id && <Check size={11} />}</span></span>
        <span className="route-choice-bottom"><strong>{formatAmount(route.expectedAmountOut, route.tokenOut.decimals, 4)} <small>{route.tokenOut.symbol}</small></strong><span>{usd(route.fees.totalUsd)} cost · ~{route.estimatedSeconds}s</span></span>
      </button>) : <div className="route-empty"><RouteIcon size={24} /><strong>{status === 'loading' ? 'Finding routes…' : status === 'error' ? 'Routes unavailable' : 'No routes yet'}</strong><span>{status === 'error' ? 'Try again or change the demo scenario.' : 'Enter an amount to compare routes.'}</span>{status === 'error' && <button className="text-button" onClick={retry}>Retry quotes</button>}</div>}
    </div>
    {failures.length > 0 && <p className="warning-text">{failures.length} demo provider{failures.length > 1 ? 's' : ''} unavailable. {routes.length > 0 ? 'Other routes remain available.' : ''}</p>}
    {selected && <div className="route-composition"><button className="disclosure" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><span>Route details</span><ChevronDown size={16} className={expanded ? 'rotated' : ''} /></button>{expanded && <div className="route-path"><div className="route-end"><span className="path-dot" />{selected.tokenIn.symbol}<small>{formatAmount(selected.amountIn, selected.tokenIn.decimals, 4)}</small></div>{selected.steps.map(step => <div className="route-branch" key={step.id}><span className="path-line" /><span className="protocol-icon">{step.protocol[0]}</span><span>{step.protocol}</span><small>{step.shareBps / 100}%</small></div>)}<div className="route-end"><span className="path-dot end" />{selected.tokenOut.symbol}<small>{formatAmount(selected.expectedAmountOut, selected.tokenOut.decimals, 4)}</small></div><p className="score-reason">{selected.scoreReason}</p></div>}</div>}
    <div className="route-foot"><RefreshCw size={13} /><span>{status === 'loading' ? 'Comparing demo routes…' : 'Simulated quotes refresh automatically'}</span></div>
  </aside>;
}
