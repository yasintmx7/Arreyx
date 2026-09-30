import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ArreyX — Effortless exchange', description: 'Explore ArreyX, a transparent and intuitive decentralized exchange prototype.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
