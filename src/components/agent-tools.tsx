'use client';
import { useEffect } from 'react';
type ModelContext = { registerTool: (tool: { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };
export function AgentTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = { name: 'read_demo_swap', description: 'Read the visible ArreyX demo swap amount and route summaries. Does not connect wallets or execute swaps.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: (input: unknown) => {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');
      const sell = document.querySelector<HTMLInputElement>('#sell-amount');
      const buy = document.querySelector<HTMLInputElement>('#buy-amount');
      return { simulated: true, view: sell ? 'swap' : 'activity', sellAmount: sell?.value ?? null, receiveAmount: buy?.value ?? null, routes: Array.from(document.querySelectorAll('.route-choice')).map(el => el.textContent) };
    } };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability: the visible interface remains available. */ }
    return () => lifecycle.abort();
  }, []);
  return null;
}
