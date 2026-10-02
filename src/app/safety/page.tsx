import { SafetyPage } from '@/components/safety-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Safety center', 'Inspect live token risk signals and revoke exact ERC-20 allowances.', '/safety');

export default function SafetyRoute() { return <SafetyPage />; }
