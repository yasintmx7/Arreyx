import { LiveExchange } from '@/components/live-exchange';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Activity', 'Review direct transaction receipts and connected LI.FI route history.', '/activity');

export default function ActivityPage() { return <LiveExchange initialView="activity" />; }
