import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ArreyX',
    short_name: 'ArreyX',
    description: 'Swap, bridge, place orders, manage liquidity, and inspect on-chain assets.',
    start_url: '/swap',
    display: 'standalone',
    background_color: '#101113',
    theme_color: '#101113',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
