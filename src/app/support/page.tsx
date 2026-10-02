import { InformationPage } from '@/components/information-page';
import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata('Support', 'Troubleshoot ArreyX routes, transactions, orders, approvals, and liquidity positions.', '/support');

export default function SupportPage() { return <InformationPage title="Support" intro="Use transaction evidence and the responsible protocol when troubleshooting." updated="October 2, 2026" sections={[
  { title: 'Before opening a report', paragraphs: ['Copy the wallet address, network, transaction hash or order ID, approximate time, and the exact error. Never include a recovery phrase or private key. Check the Activity page for LI.FI routes, the Orders page for CoW orders, and the transaction explorer for on-chain confirmation.'] },
  { title: 'Route and bridge issues', paragraphs: ['Open Activity with the wallet that submitted the route. Use its transaction links and provider status. A pending cross-chain route may require the bridge provider identified in the route details.'] },
  { title: 'Liquidity and approval issues', paragraphs: ['Use the Safety center to inspect the exact token/spender allowance. Liquidity transactions are sent to the official Uniswap V3 position manager configured for Ethereum or Base and produce an NFT position when confirmed.'] },
  { title: 'Report an interface bug', paragraphs: ['Use the ArreyX GitHub repository issue tracker and include reproducible steps without sensitive information: https://github.com/yasintmx7/Arreyx/issues'] },
]} />; }
