import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ArreyX — Swap and bridge', description: 'Explore live swap and bridge routes across ten EVM networks with ArreyX.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
