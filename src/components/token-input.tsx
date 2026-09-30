import { ChevronDown } from 'lucide-react';
import type { Token } from '@/types/domain';
export function TokenIcon({ token, small = false }: { token: Token; small?: boolean }) {
  return <span className={`token-icon ${small ? 'small' : ''}`} style={{ background: token.color }} aria-hidden="true">{token.glyph}</span>;
}
export function TokenInput({ side, token, amount, onAmount, onSelect, connected, usdValue, onMax, loading }: { side: 'sell' | 'buy'; token: Token; amount: string; onAmount?: (value: string) => void; onSelect: () => void; connected: boolean; usdValue: string; onMax?: () => void; loading?: boolean }) {
  return <section className={`token-input ${side}`}>
    <div className="field-top"><label htmlFor={`${side}-amount`}>{side === 'sell' ? 'You pay' : 'You receive'}</label></div>
    <div className="amount-row"><input id={`${side}-amount`} aria-label={side === 'sell' ? 'Amount to sell' : 'Expected amount received'} inputMode="decimal" autoComplete="off" spellCheck={false} placeholder="0" value={amount} readOnly={side === 'buy'} onChange={e => onAmount?.(e.target.value)} className={loading ? 'updating' : ''} /><button className="token-picker" onClick={onSelect}><TokenIcon token={token} /><span>{token.symbol}</span><ChevronDown size={16} /></button></div>
    <div className="field-bottom"><span>{usdValue}</span><span>{connected ? `Balance: ${token.demoBalance}` : 'Balance: —'}{side === 'sell' && connected && <button className="max" onClick={onMax}>MAX</button>}</span></div>
  </section>;
}
