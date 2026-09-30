import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, formatAmount } from '../src/lib/amounts';
import { tokensForChain } from '../src/config/registry';
import { discoverRoutes, rankRoutes, netOutput } from '../src/routing/engine';
import { createMockProviders } from '../src/routing/mock-provider';
import type { QuoteRequest } from '../src/types/domain';
const tokens = tokensForChain(1);
const request: QuoteRequest = { chainId: 1, destinationChainId: 1, tokenIn: tokens[0], tokenOut: tokens[1], amountIn: parseAmount('1', 18), slippageBps: 50, preference: 'return' };
test('amounts retain 18-digit precision and reject malformed / excessive precision input', () => {
  assert.equal(parseAmount('1.000000000000000001', 18), 1000000000000000001n);
  assert.throws(() => parseAmount('0.0000001', 6));
  assert.throws(() => parseAmount('1e9', 18));
  assert.throws(() => parseAmount('-1', 18));
  assert.equal(formatAmount(1n, 18), '<0.000001');
});
test('concurrent discovery returns ranked quotes and correct minimum output', async () => {
  const result = await discoverRoutes(request, createMockProviders(), new AbortController().signal);
  assert.equal(result.routes.length, 3);
  assert.ok(netOutput(result.routes[0]) >= netOutput(result.routes[1]));
  assert.equal(result.routes[0].minimumAmountOut, result.routes[0].expectedAmountOut * 9950n / 10000n);
  assert.equal(rankRoutes(result.routes, 'fastest')[0].provider, 'Flow');
  assert.equal(rankRoutes(result.routes, 'gas')[0].provider, 'Direct');
});
test('one failed provider leaves valid alternatives available', async () => {
  const result = await discoverRoutes(request, createMockProviders('partial'), new AbortController().signal);
  assert.equal(result.routes.length, 2);
  assert.deepEqual(result.failedProviders, ['atlas']);
});
test('unsupported cross-chain pairs return no mock route', async () => {
  const result = await discoverRoutes({ ...request, destinationChainId: 8453 }, createMockProviders(), new AbortController().signal);
  assert.equal(result.routes.length, 0);
});
test('cancelled requests reject and demo providers refuse real transaction construction', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(discoverRoutes(request, createMockProviders(), controller.signal));
  const route = await createMockProviders()[0].getQuote(request, new AbortController().signal);
  await assert.rejects(createMockProviders()[0].buildTransaction(route), /disabled/);
});
