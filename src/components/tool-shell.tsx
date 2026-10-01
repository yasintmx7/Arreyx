'use client';

import Link from 'next/link';
import { Moon, Sun, Wallet } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { AppNavigation } from './app-navigation';

type Theme = 'dark' | 'light';

export function ToolShell({ active, title, subtitle, account, onConnect, children, wide = false }: { active: string; title: string; subtitle: string; account?: string | null; onConnect?: () => void; children: ReactNode; wide?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => { const frame = requestAnimationFrame(() => { const saved = localStorage.getItem('arreyx-theme'); setTheme(saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); }); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  function toggleTheme() { const next = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('arreyx-theme', next); setTheme(next); }
  return <div className="app-shell live-shell tool-shell">
    <header className="header"><Link className="brand" href="/" aria-label="ArreyX home"><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 33 18 5h8L10 33zm20 0 6-11 11 11zM27 5h12L28 17z" fill="currentColor" /></svg></span>Arrey<span className="brand-x">X</span></Link><AppNavigation active={active} /><div className="header-actions">{onConnect && <button className="wallet-button" aria-label={account ? `Wallet ${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect wallet'} onClick={onConnect}><Wallet size={16} /><span>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connect wallet'}</span></button>}<button className="theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div></header>
    <main className={`live-main tool-main${wide ? ' tool-main-wide' : ''}`}><div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main>
    <footer><span>© {new Date().getFullYear()} ArreyX</span><span className="tool-footer-links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk</Link><Link href="/status">Status</Link></span></footer>
  </div>;
}
