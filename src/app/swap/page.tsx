import { LiveExchange } from '@/components/live-exchange';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Swap', 'Compare live routes and exchange assets through a self-custodial interface.', '/swap');

export default function SwapPage() { return <LiveExchange initialView="swap" />; }
