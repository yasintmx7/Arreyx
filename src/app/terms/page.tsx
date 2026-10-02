import { InformationPage } from '@/components/information-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Terms of use', 'Terms for using the ArreyX self-custodial interface and its third-party integrations.', '/terms');

export default function TermsPage() { return <InformationPage title="Terms of use" intro="These terms describe the conditions for using the ArreyX self-custodial interface." updated="October 2, 2026" sections={[
  { title: 'The interface', paragraphs: ['ArreyX is a non-custodial interface. It helps users request quotes, prepare transactions, inspect public blockchain data, and interact with third-party protocols. ArreyX does not hold private keys, custody assets, guarantee execution, or reverse blockchain transactions.'] },
  { title: 'Your responsibility', paragraphs: ['You are responsible for your wallet, credentials, network selection, token contracts, recipients, transaction details, taxes, and compliance with laws that apply to you. Review every wallet request before signing. Do not use ArreyX if you are not permitted to use the underlying protocols in your location.'] },
  { title: 'Third-party protocols', paragraphs: ['Routes, orders, pools, indexes, security fields, and wallet services are supplied by independent protocols and data providers, including LI.FI, CoW Protocol, Uniswap, GeckoTerminal, GoPlus, Blockscout, wallet providers, RPC operators, and individual liquidity sources. Their own terms and availability also apply.'] },
  { title: 'No warranty or advice', paragraphs: ['The interface and data are provided as available. Quotes, prices, balances, risk signals, gas estimates, and status information can be delayed, incomplete, or incorrect. Nothing in ArreyX is financial, legal, tax, or investment advice.'] },
  { title: 'Liability', paragraphs: ['To the maximum extent permitted by applicable law, ArreyX contributors are not responsible for losses caused by market movement, failed or delayed transactions, malicious tokens, approvals, wallet compromise, protocol failure, bridges, RPC outages, inaccurate data, or user error.'] },
]} />; }
