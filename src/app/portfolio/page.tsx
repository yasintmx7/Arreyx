import { PortfolioPage } from '@/components/portfolio-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Portfolio', 'Review indexed multi-network wallet balances and available USD prices.', '/portfolio');

export default function PortfolioRoute() { return <PortfolioPage />; }
