import { LiveExchange } from '@/components/live-exchange';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Bridge', 'Move supported assets across networks using live LI.FI routes.', '/bridge');

export default function BridgePage() { return <LiveExchange initialView="bridge" />; }
