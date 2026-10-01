import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

const primary = [
  { href: '/swap', label: 'Swap', key: 'swap' },
  { href: '/bridge', label: 'Bridge', key: 'bridge' },
  { href: '/pools', label: 'Pools', key: 'pools' },
  { href: '/portfolio', label: 'Portfolio', key: 'portfolio' },
];

const tools = [
  { href: '/activity', label: 'Activity', key: 'activity' },
  { href: '/orders', label: 'Orders', key: 'orders' },
  { href: '/liquidity', label: 'Liquidity', key: 'liquidity' },
  { href: '/safety', label: 'Safety', key: 'safety' },
];

export function AppNavigation({ active }: { active: string }) {
  const toolActive = tools.some(item => item.key === active);
  return <nav className="app-navigation" aria-label="Main navigation">
    {primary.map(item => <Link key={item.key} href={item.href} className={active === item.key ? 'active' : ''} aria-current={active === item.key ? 'page' : undefined}>{item.label}</Link>)}
    <details className={`app-more${toolActive ? ' active' : ''}`}>
      <summary><span>More</span><ChevronDown size={13} /></summary>
      <div className="app-more-menu">{tools.map(item => <Link key={item.key} href={item.href} className={active === item.key ? 'active' : ''} aria-current={active === item.key ? 'page' : undefined}>{item.label}</Link>)}</div>
    </details>
  </nav>;
}
