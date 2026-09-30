export function parseAmount(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d*)?$/.test(value)) throw new Error('Enter a valid amount.');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Use at most ${decimals} decimal places.`);
  if (whole.length > 30) throw new Error('This amount is too large.');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
}
export function formatAmount(amount: bigint, decimals: number, places = 6): string {
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = (amount % scale).toString().padStart(decimals, '0').slice(0, places).replace(/0+$/, '');
  if (amount > 0n && whole === 0n && !fraction) return `<0.${'0'.repeat(Math.max(0, places - 1))}1`;
  return whole.toLocaleString('en-US') + (fraction ? `.${fraction}` : '');
}
export function usd(micros: bigint): string {
  if (micros > 0n && micros < 10000n) return '<$0.01';
  const cents = micros / 10000n;
  return `$${(cents / 100n).toLocaleString('en-US')}.${(cents % 100n).toString().padStart(2, '0')}`;
}
export const valueUsd = (amount: bigint, decimals: number, price: bigint) => amount * price / 10n ** BigInt(decimals);
