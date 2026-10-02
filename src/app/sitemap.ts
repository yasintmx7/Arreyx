import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const routes = ['', '/swap', '/bridge', '/pools', '/portfolio', '/orders', '/liquidity', '/safety', '/activity', '/status', '/terms', '/privacy', '/risk', '/support'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route, index) => ({
    url: `https://arreyfinance.vercel.app${route}`,
    changeFrequency: index === 0 ? 'weekly' : route === '/status' ? 'daily' : 'monthly',
    priority: index === 0 ? 1 : ['/swap', '/bridge', '/pools'].includes(route) ? 0.9 : 0.7,
  }));
}
