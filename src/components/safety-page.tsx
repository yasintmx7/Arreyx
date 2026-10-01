'use client';

import { useState } from 'react';
import { AlertTriangle, Ban, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from '@uniswap/sdk-core';
import { arbitrum, base, bsc, mainnet, polygon } from 'viem/chains';
import { createPublicClient, encodeFunctionData, erc20Abi, formatUnits, getAddress, http, isAddress } from 'viem';
import { ToolShell } from './tool-shell';
import { useEvmWallet } from '@/hooks/use-evm-wallet';

const safetyNetworks = {
  1: { name: 'Ethereum', chain: mainnet, explorer: 'https://etherscan.io' },
  8453: { name: 'Base', chain: base, explorer: 'https://basescan.org' },
  42161: { name: 'Arbitrum', chain: arbitrum, explorer: 'https://arbiscan.io' },
  56: { name: 'BNB Chain', chain: bsc, explorer: 'https://bscscan.com' },
  137: { name: 'Polygon', chain: polygon, explorer: 'https://polygonscan.com' },
} as const;

type NetworkId = keyof typeof safetyNetworks;
type SecurityResult = Record<string, string | null | undefined>;
type Allowance = { symbol: string; decimals: number; raw: bigint; formatted: string };

function flag(value: string | null | undefined, inverse = false) {
  if (value == null) return 'Unknown';
  const active = value === '1';
  return (inverse ? !active : active) ? 'Yes' : 'No';
}

export function SafetyPage() {
  const wallet = useEvmWallet();
  const [networkId, setNetworkId] = useState<NetworkId>(1);
  const [token, setToken] = useState('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  const [spender, setSpender] = useState(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[1]);
  const [security, setSecurity] = useState<SecurityResult | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [busy, setBusy] = useState<'scan' | 'allowance' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const network = safetyNetworks[networkId];

  function changeNetwork(next: NetworkId) {
    setNetworkId(next); setSecurity(null); setAllowance(null); setError(null);
    setSpender(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[next] ?? '');
  }

  async function scanToken() {
    try {
      if (!isAddress(token)) throw new Error('Enter a valid token contract address.');
      setBusy('scan'); setError(null); setSecurity(null);
      const response = await fetch(`https://api.gopluslabs.io/api/v1/token_security/${networkId}?contract_addresses=${getAddress(token)}`);
      if (!response.ok) throw new Error(`Token-security service returned ${response.status}.`);
      const body: { code?: number; result?: Record<string, SecurityResult>; message?: string } = await response.json();
      const result = body.result?.[token.toLowerCase()] ?? body.result?.[getAddress(token).toLowerCase()];
      if (!result) throw new Error(body.message || 'No security record was returned for this token.');
      setSecurity(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Token scan failed.'); }
    finally { setBusy(null); }
  }

  async function inspectAllowance() {
    try {
      if (!wallet.account) { await wallet.connect(); throw new Error('Connect your wallet, then inspect the allowance again.'); }
      if (!isAddress(token) || !isAddress(spender)) throw new Error('Enter valid token and spender contract addresses.');
      setBusy('allowance'); setError(null); setAllowance(null);
      const client = createPublicClient({ chain: network.chain, transport: http() });
      const tokenAddress = getAddress(token);
      const [symbol, decimals, raw] = await Promise.all([
        client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
        client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'decimals' }),
        client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'allowance', args: [getAddress(wallet.account), getAddress(spender)] }),
      ]);
      setAllowance({ symbol, decimals, raw, formatted: formatUnits(raw, decimals) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Allowance lookup failed.'); }
    finally { setBusy(null); }
  }

  async function revoke() {
    try {
      if (!wallet.account || !wallet.provider || !allowance) throw new Error('Inspect a connected-wallet allowance first.');
      if (wallet.chainId !== networkId) await wallet.switchChain(networkId);
      setBusy('revoke'); setError(null);
      const client = createPublicClient({ chain: network.chain, transport: http() });
      const hash = await wallet.provider.request<`0x${string}`>({ method: 'eth_sendTransaction', params: [{ from: wallet.account, to: getAddress(token), data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [getAddress(spender), 0n] }), value: '0x0' }] });
      await client.waitForTransactionReceipt({ hash });
      setAllowance({ ...allowance, raw: 0n, formatted: '0' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Approval revocation failed.'); }
    finally { setBusy(null); }
  }

  return <ToolShell active="safety" title="Safety center" subtitle="Inspect token risk signals and revoke real ERC-20 allowances." account={wallet.account} onConnect={() => { wallet.connect(); }} wide>
    {error && <div className="tool-alert error">{error}</div>}
    <div className="tool-grid safety-grid"><section className="tool-panel"><h2 className="tool-section-title"><ShieldCheck size={19} /> Token scanner</h2><p className="tool-section-copy">Security fields are requested live from GoPlus. Unknown fields stay unknown rather than being treated as safe.</p>
      <label className="tool-field">Network<select value={networkId} onChange={event => changeNetwork(Number(event.target.value) as NetworkId)}>{Object.entries(safetyNetworks).map(([id, item]) => <option key={id} value={id}>{item.name}</option>)}</select></label>
      <label className="tool-field">Token contract<input value={token} onChange={event => { setToken(event.target.value); setSecurity(null); setAllowance(null); }} spellCheck={false} /></label>
      <button className="tool-primary" disabled={busy !== null} onClick={scanToken}><Search size={17} /> {busy === 'scan' ? 'Scanning…' : 'Scan token'}</button>
      {security && <div className="security-results"><div className="security-token"><div><strong>{security.token_symbol || 'Token'}</strong><span>{security.token_name || getAddress(token)}</span></div><a href={`${network.explorer}/token/${getAddress(token)}`} target="_blank" rel="noopener noreferrer">Explorer <ExternalLink size={13} /></a></div><dl><div><dt>Honeypot</dt><dd>{flag(security.is_honeypot)}</dd></div><div><dt>Open source</dt><dd>{flag(security.is_open_source)}</dd></div><div><dt>Proxy contract</dt><dd>{flag(security.is_proxy)}</dd></div><div><dt>Owner can change balances</dt><dd>{flag(security.owner_change_balance)}</dd></div><div><dt>Hidden owner</dt><dd>{flag(security.hidden_owner)}</dd></div><div><dt>Cannot sell all</dt><dd>{flag(security.cannot_sell_all)}</dd></div><div><dt>Buy tax</dt><dd>{security.buy_tax == null ? 'Unknown' : `${Number(security.buy_tax) * 100}%`}</dd></div><div><dt>Sell tax</dt><dd>{security.sell_tax == null ? 'Unknown' : `${Number(security.sell_tax) * 100}%`}</dd></div><div><dt>Holder count</dt><dd>{security.holder_count ? Number(security.holder_count).toLocaleString() : 'Unknown'}</dd></div><div><dt>Transfer pausable</dt><dd>{flag(security.transfer_pausable)}</dd></div></dl></div>}
    </section>
    <section className="tool-panel"><h2 className="tool-section-title"><Ban size={19} /> Approval manager</h2><p className="tool-section-copy">Inspect one exact token/spender pair directly on-chain, then set its allowance to zero from your wallet.</p>
      <label className="tool-field">Spender contract<input value={spender} onChange={event => { setSpender(event.target.value); setAllowance(null); }} placeholder="Protocol spender address" spellCheck={false} /></label>
      <div className="spender-shortcuts"><button onClick={() => setSpender(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[networkId] ?? '')}>Uniswap V3 manager</button><button onClick={() => setSpender('0x1231DEB6f5749ef6ce6943A275A1D3E7486F4EaE')}>LI.FI diamond</button></div>
      <button className="tool-secondary-button" disabled={busy !== null} onClick={inspectAllowance}>{busy === 'allowance' ? 'Reading allowance…' : 'Inspect allowance'}</button>
      {allowance && <div className="allowance-card"><span>Current allowance</span><strong>{allowance.formatted} {allowance.symbol}</strong><small>{allowance.raw === 0n ? 'No approval is active for this pair.' : 'This spender can transfer up to this amount.'}</small>{allowance.raw > 0n && <button className="revoke-button" disabled={busy !== null} onClick={revoke}><AlertTriangle size={16} /> {busy === 'revoke' ? 'Waiting for wallet…' : 'Revoke allowance'}</button>}</div>}
      <p className="safety-note">Approval discovery requires a token and spender address. This tool reads and revokes the exact pair you enter; it does not claim to enumerate every historical approval.</p>
    </section></div>
  </ToolShell>;
}
