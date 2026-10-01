import { InformationPage } from '@/components/information-page';

export default function PrivacyPage() { return <InformationPage title="Privacy notice" intro="ArreyX is designed around public wallet data and minimal browser storage." updated="October 2, 2026" sections={[
  { title: 'Data used by the interface', paragraphs: ['When you connect a wallet or enter an address, that public address and the selected network may be sent directly from your browser to wallet providers, RPC endpoints, LI.FI, CoW Protocol, Blockscout, GoPlus, GeckoTerminal, and other services required for the feature you use. Blockchain transactions and signatures are public or observable by the relevant network.'] },
  { title: 'Browser storage', paragraphs: ['ArreyX stores interface preferences such as theme selection and provider transaction state in your browser. Wallet extensions and embedded protocol widgets may maintain their own connection, order, or activity storage.'] },
  { title: 'What ArreyX does not request', paragraphs: ['ArreyX never asks for your recovery phrase or private key. Do not enter either into this interface, a token field, a support message, or any linked service.'] },
  { title: 'Third parties', paragraphs: ['Independent providers process requests under their own privacy notices. Their infrastructure may record IP addresses, browser information, wallet addresses, and request metadata. Review those notices before using the relevant feature.'] },
]} />; }
