export type AppTransaction = { hash: string; title: string; network: string; explorer: string; createdAt: number; status: 'pending' | 'confirmed' };

const key = 'arreyx-transactions';
function read(): AppTransaction[] {
  if (typeof window === 'undefined') return [];
  try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
function write(items: AppTransaction[]) { localStorage.setItem(key, JSON.stringify(items.slice(0, 30))); window.dispatchEvent(new Event('arreyx-transactions')); }
export function getTransactions() { return read(); }
export function saveTransaction(transaction: AppTransaction) { write([transaction, ...read().filter(item => item.hash !== transaction.hash)]); }
export function confirmTransaction(hash: string) { write(read().map(item => item.hash === hash ? { ...item, status: 'confirmed' as const } : item)); }
