import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ArreyX — Swap, bridge, and explore pools', description: 'Compare live swap and bridge routes across supported EVM networks and Solana with ArreyX.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
