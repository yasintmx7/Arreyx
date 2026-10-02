import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://arreyfinance.vercel.app'),
  applicationName: 'ArreyX',
  title: { default: 'ArreyX — Trade and manage onchain assets', template: '%s | ArreyX' },
  description: 'Swap, bridge, place orders, manage liquidity, inspect pools, and review wallet assets with live provider data.',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  category: 'finance',
  icons: { icon: '/favicon.svg' },
  openGraph: { title: 'ArreyX — Trade and manage onchain assets', description: 'A focused, self-custodial interface for live on-chain markets.', url: '/', siteName: 'ArreyX', type: 'website' },
  twitter: { card: 'summary', title: 'ArreyX — Trade and manage onchain assets', description: 'A focused, self-custodial interface for live on-chain markets.' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
