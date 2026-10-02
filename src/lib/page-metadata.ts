import type { Metadata } from 'next';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ArreyX`, description, url: path, siteName: 'ArreyX', type: 'website' },
    twitter: { card: 'summary', title: `${title} | ArreyX`, description },
  };
}
