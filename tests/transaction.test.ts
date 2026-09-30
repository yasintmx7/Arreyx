import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transactionReducer } from '../src/transaction/machine';
import { createMockProviders } from '../src/routing/mock-provider';
import { tokensForChain } from '../src/config/registry';
test('transaction cannot skip signatures or submit from idle', () => {
  assert.equal(transactionReducer({ status: 'idle' }, { type: 'advance', status: 'success' }).status, 'idle');
  assert.equal(transactionReducer({ status: 'review' }, { type: 'advance', status: 'submitted' }).status, 'review');
});
test('approval and execution transitions complete in order', () => {
  let state = transactionReducer({ status: 'review' }, { type: 'advance', status: 'approval-required' });
  for (const status of ['approval-pending', 'approval-confirmed', 'awaiting-signature', 'submitted', 'pending', 'success'] as const) state = transactionReducer(state, { type: 'advance', status });
  assert.equal(state.status, 'success');
  assert.equal(transactionReducer(state, { type: 'fail', error: 'late error' }).status, 'success');
});
test('expired routes cannot enter review', async () => {
  const tokens = tokensForChain(1);
  const route = await createMockProviders()[0].getQuote({ chainId: 1, destinationChainId: 1, tokenIn: tokens[0], tokenOut: tokens[1], amountIn: 10n ** 18n, slippageBps: 50, preference: 'return' }, new AbortController().signal);
  assert.equal(transactionReducer({ status: 'idle' }, { type: 'review', route: { ...route, expiresAt: 0 } }).status, 'expired');
});
