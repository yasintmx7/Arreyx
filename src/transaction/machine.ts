import type { Route, TransactionState, TransactionStatus } from '@/types/domain';
export type TransactionEvent = { type: 'review'; route: Route } | { type: 'advance'; status: TransactionStatus } | { type: 'fail'; error: string } | { type: 'reset' };
const transitions: Partial<Record<TransactionStatus, TransactionStatus[]>> = {
  review: ['approval-required', 'awaiting-signature', 'expired'],
  'approval-required': ['approval-pending', 'expired'],
  'approval-pending': ['approval-confirmed'],
  'approval-confirmed': ['awaiting-signature', 'expired'],
  'awaiting-signature': ['submitted', 'expired'], submitted: ['pending'], pending: ['success', 'bridge-pending'],
  'bridge-pending': ['destination-pending'], 'destination-pending': ['success'],
};
export function transactionReducer(state: TransactionState, event: TransactionEvent): TransactionState {
  if (event.type === 'reset') return { status: 'idle' };
  if (event.type === 'review' && state.status === 'idle') return event.route.expiresAt <= Date.now() ? { status: 'expired' } : { status: 'review', route: event.route };
  if (event.type === 'fail' && state.status !== 'idle' && state.status !== 'success') return { ...state, status: 'failed', error: event.error };
  if (event.type === 'advance' && transitions[state.status]?.includes(event.status)) return { ...state, status: event.status };
  return state;
}
