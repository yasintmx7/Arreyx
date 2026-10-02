import { LiveExchange } from '@/components/live-exchange';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Open app', robots: { index: false, follow: false }, alternates: { canonical: '/swap' } };

export default function AppPage() { return <LiveExchange />; }
