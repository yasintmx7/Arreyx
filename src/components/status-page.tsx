'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { ToolShell } from './tool-shell';

const services = [
  { name: 'LI.FI routes', url: 'https://li.quest/v1/chains' },
  { name: 'GeckoTerminal pools', url: 'https://api.geckoterminal.com/api/v2/networks/eth/trending_pools?page=1' },
  { name: 'GoPlus security', url: 'https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  { name: 'Blockscout portfolio', url: 'https://eth.blockscout.com/api/v2/stats' },
];

type Check = { name: string; ok: boolean; latency: number; detail: string };

export function StatusPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const frame = requestAnimationFrame(() => {
      setLoading(true);
      Promise.all(services.map(async service => {
        const started = performance.now();
        try {
          const response = await fetch(service.url, { signal: controller.signal, cache: 'no-store' });
          return { name: service.name, ok: response.ok, latency: Math.round(performance.now() - started), detail: response.ok ? 'Operational' : `HTTP ${response.status}` };
        } catch (reason) { return { name: service.name, ok: false, latency: Math.round(performance.now() - started), detail: reason instanceof Error ? reason.message : 'Unavailable' }; }
      })).then(results => { if (!controller.signal.aborted) { setChecks(results); setUpdated(new Date()); setLoading(false); } });
    });
    return () => { cancelAnimationFrame(frame); controller.abort(); };
  }, [refresh]);
  return <ToolShell active="status" title="Service status" subtitle="Direct browser checks of the live data services used by ArreyX.">
    <section className="tool-panel"><div className="status-heading"><div><h2 className="tool-section-title">Current checks</h2><p>{updated ? `Checked ${updated.toLocaleTimeString()}` : 'Starting checks…'}</p></div><button onClick={() => setRefresh(value => value + 1)} disabled={loading}><RefreshCw size={16} /> Refresh</button></div><div className="status-list">{services.map(service => { const check = checks.find(item => item.name === service.name); return <div key={service.name}><span className={check?.ok ? 'status-ok' : check ? 'status-fail' : ''}>{check?.ok ? <CheckCircle2 size={18} /> : check ? <XCircle size={18} /> : <RefreshCw size={18} />}</span><div><strong>{service.name}</strong><small>{check?.detail ?? 'Checking…'}</small></div><span>{check ? `${check.latency} ms` : '—'}</span></div>; })}</div><p className="safety-note">These checks confirm browser access to provider APIs at this moment. They do not guarantee that a specific route, token, order, RPC call, or transaction will succeed.</p></section>
  </ToolShell>;
}
