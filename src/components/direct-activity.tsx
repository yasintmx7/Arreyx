'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink } from 'lucide-react';
import { getTransactions, type AppTransaction } from '@/lib/transaction-log';

export function DirectActivity() {
  const [items, setItems] = useState<AppTransaction[]>([]);
  useEffect(() => {
    const sync = () => setItems(getTransactions());
    const frame = requestAnimationFrame(sync);
    window.addEventListener('arreyx-transactions', sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('arreyx-transactions', sync); };
  }, []);
  if (!items.length) return null;
  return <section className="direct-activity"><div><h2>ArreyX receipts</h2><p>Direct liquidity and approval transactions saved in this browser.</p></div><div className="direct-activity-list">{items.map(item => <a key={item.hash} href={`${item.explorer}${item.hash}`} target="_blank" rel="noopener noreferrer"><span className={item.status === 'confirmed' ? 'confirmed' : ''}>{item.status === 'confirmed' ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span><div><strong>{item.title}</strong><small>{item.network} · {new Date(item.createdAt).toLocaleString()}</small></div><code>{item.hash.slice(0, 8)}…{item.hash.slice(-6)}</code><ExternalLink size={13} /></a>)}</div><p className="direct-recovery">If a transaction stays pending, open its explorer receipt and check the wallet’s network and nonce before retrying.</p></section>;
}
