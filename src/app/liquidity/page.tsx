import { LiquidityPage } from '@/components/liquidity-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Liquidity', 'Create, review, and manage real Uniswap V3 liquidity positions.', '/liquidity');

export default function LiquidityRoute() { return <LiquidityPage />; }
