import { LiveExchange } from '@/components/live-exchange';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Pools', 'Explore live liquidity, volume, price, and activity data across supported networks.', '/pools');

export default function PoolsPage() { return <LiveExchange initialView="pools" />; }
