import { StatusPage } from '@/components/status-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Service status', 'Check direct browser access to the live providers used by ArreyX.', '/status');

export default function StatusRoute() { return <StatusPage />; }
