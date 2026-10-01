import Link from 'next/link';

export type InfoSection = { title: string; paragraphs: string[] };

export function InformationPage({ title, intro, updated, sections }: { title: string; intro: string; updated: string; sections: InfoSection[] }) {
  return <div className="app-shell info-shell"><header className="header"><Link className="brand" href="/" aria-label="ArreyX home"><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 33 18 5h8L10 33zm20 0 6-11 11 11zM27 5h12L28 17z" fill="currentColor" /></svg></span>Arrey<span className="brand-x">X</span></Link><Link className="home-header-cta" href="/swap">Open app</Link></header><main className="info-main"><Link className="info-back" href="/">← ArreyX home</Link><h1>{title}</h1><p className="info-intro">{intro}</p><p className="info-updated">Last updated: {updated}</p>{sections.map(section => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</main><footer className="home-footer"><span>© {new Date().getFullYear()} ArreyX</span><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk</Link><Link href="/status">Status</Link><Link href="/support">Support</Link></div></footer></div>;
}
