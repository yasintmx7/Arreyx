import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ArreyX — Trade and manage onchain assets', description: 'Swap, bridge, place orders, manage liquidity, inspect pools, and review wallet assets with live provider data.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
