import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function ProductContext({ source }: { source: string }) {
  return <aside className="product-context" aria-label="Product and data information">
    <span className="product-live"><i aria-hidden="true" /> Live data</span>
    <span><ShieldCheck size={14} /> Self-custodial</span>
    <span>{source}</span>
    <Link href="/status">System status</Link>
  </aside>;
}
