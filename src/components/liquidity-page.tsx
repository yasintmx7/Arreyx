'use client';

import { useMemo, useState } from 'react';
import { Droplets, ExternalLink, PlusCircle } from 'lucide-react';
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES, Percent, Token, V3_CORE_FACTORY_ADDRESSES } from '@uniswap/sdk-core';
import { FeeAmount, nearestUsableTick, NonfungiblePositionManager, Pool, Position, TickMath, TICK_SPACINGS, encodeSqrtRatioX96 } from '@uniswap/v3-sdk';
import { base, mainnet } from 'viem/chains';
import { createPublicClient, encodeFunctionData, erc20Abi, getAddress, http, isAddress, parseUnits, zeroAddress } from 'viem';
import { ToolShell } from './tool-shell';
import { useEvmWallet } from '@/hooks/use-evm-wallet';

const deployments = {
  1: { chain: mainnet, name: 'Ethereum', explorer: 'https://etherscan.io/tx/', defaults: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'] },
  8453: { chain: base, name: 'Base', explorer: 'https://basescan.org/tx/', defaults: ['0x4200000000000000000000000000000000000006', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'] },
} as const;

const factoryAbi = [{ type: 'function', name: 'getPool', stateMutability: 'view', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], outputs: [{ name: 'pool', type: 'address' }] }] as const;
const poolAbi = [
  { type: 'function', name: 'slot0', stateMutability: 'view', inputs: [], outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' }, { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' }, { name: 'unlocked', type: 'bool' }] },
  { type: 'function', name: 'liquidity', stateMutability: 'view', inputs: [], outputs: [{ name: 'liquidity', type: 'uint128' }] },
] as const;

type TokenMeta = { address: `0x${string}`; symbol: string; decimals: number };
type TxState = { kind: 'idle' | 'working' | 'success' | 'error'; message?: string; hash?: string };
type SupportedFee = FeeAmount.LOWEST | FeeAmount.LOW | FeeAmount.MEDIUM | FeeAmount.HIGH;

export function LiquidityPage() {
  const wallet = useEvmWallet();
  const [networkId, setNetworkId] = useState<1 | 8453>(1);
  const [tokenA, setTokenA] = useState<string>(deployments[1].defaults[0]);
  const [tokenB, setTokenB] = useState<string>(deployments[1].defaults[1]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [initialPrice, setInitialPrice] = useState('');
  const [fee, setFee] = useState<SupportedFee>(FeeAmount.MEDIUM);
  const [slippage, setSlippage] = useState('0.5');
  const [tx, setTx] = useState<TxState>({ kind: 'idle' });
  const deployment = deployments[networkId];
  const disabled = tx.kind === 'working';

  const feeLabel = useMemo(() => ({ [FeeAmount.LOWEST]: '0.01%', [FeeAmount.LOW]: '0.05%', [FeeAmount.MEDIUM]: '0.30%', [FeeAmount.HIGH]: '1.00%' }[fee]), [fee]);
  function changeNetwork(next: 1 | 8453) { const defaults = deployments[next].defaults; setNetworkId(next); setTokenA(defaults[0]); setTokenB(defaults[1]); setTx({ kind: 'idle' }); }

  async function submit() {
    try {
      if (!wallet.account || !wallet.provider) { await wallet.connect(); throw new Error('Connect your wallet, then review and submit again.'); }
      if (!amountA || !amountB) throw new Error('Enter both token amounts.');
      if (tokenA.toLowerCase() === tokenB.toLowerCase()) throw new Error('Choose two different tokens.');
      const tolerance = Number(slippage);
      if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 5) throw new Error('Slippage must be above 0% and no more than 5%.');
      if (wallet.chainId !== networkId) await wallet.switchChain(networkId);
      setTx({ kind: 'working', message: 'Reading tokens and the live Uniswap pool…' });
      const client = createPublicClient({ chain: deployment.chain, transport: http() });
      const readToken = async (address: string): Promise<TokenMeta> => {
        if (!isAddress(address)) throw new Error('Enter two valid ERC-20 contract addresses.');
        const checked = getAddress(address);
        const [symbol, decimals] = await Promise.all([
          client.readContract({ address: checked, abi: erc20Abi, functionName: 'symbol' }),
          client.readContract({ address: checked, abi: erc20Abi, functionName: 'decimals' }),
        ]);
        return { address: checked, symbol, decimals };
      };
      const sendAndWait = async (request: { to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` }) => {
        if (!wallet.provider || !wallet.account) throw new Error('Connect an EVM wallet first.');
        const hash = await wallet.provider.request<`0x${string}`>({ method: 'eth_sendTransaction', params: [{ from: wallet.account, to: request.to, data: request.data, value: request.value ?? '0x0' }] });
        await client.waitForTransactionReceipt({ hash });
        return hash;
      };
      const approveIfNeeded = async (token: TokenMeta, amount: bigint, spender: `0x${string}`) => {
        if (!wallet.account) throw new Error('Connect an EVM wallet first.');
        const owner = getAddress(wallet.account);
        const allowance = await client.readContract({ address: token.address, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] });
        if (allowance >= amount) return;
        if (allowance > 0n) {
          setTx({ kind: 'working', message: `Resetting ${token.symbol} approval…` });
          await sendAndWait({ to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, 0n] }) });
        }
        setTx({ kind: 'working', message: `Approving exact ${token.symbol} amount…` });
        await sendAndWait({ to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] }) });
      };
      const [metaA, metaB] = await Promise.all([readToken(tokenA), readToken(tokenB)]);
      const sdkA = new Token(networkId, metaA.address, metaA.decimals, metaA.symbol);
      const sdkB = new Token(networkId, metaB.address, metaB.decimals, metaB.symbol);
      const sdk0 = sdkA.sortsBefore(sdkB) ? sdkA : sdkB;
      const sdk1 = sdkA.sortsBefore(sdkB) ? sdkB : sdkA;
      const rawA = parseUnits(amountA, metaA.decimals);
      const rawB = parseUnits(amountB, metaB.decimals);
      if (rawA <= 0n || rawB <= 0n) throw new Error('Token amounts must be greater than zero.');
      const amount0 = sdkA.equals(sdk0) ? rawA : rawB;
      const amount1 = sdkA.equals(sdk0) ? rawB : rawA;
      const factory = getAddress(V3_CORE_FACTORY_ADDRESSES[networkId]);
      const manager = getAddress(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[networkId]);
      const poolAddress = await client.readContract({ address: factory, abi: factoryAbi, functionName: 'getPool', args: [getAddress(sdk0.address), getAddress(sdk1.address), fee] });
      const poolExists = poolAddress !== zeroAddress;
      let pool: Pool;
      if (poolExists) {
        const [slot0, liquidity] = await Promise.all([
          client.readContract({ address: poolAddress, abi: poolAbi, functionName: 'slot0' }),
          client.readContract({ address: poolAddress, abi: poolAbi, functionName: 'liquidity' }),
        ]);
        pool = new Pool(sdk0, sdk1, fee, slot0[0].toString(), liquidity.toString(), slot0[1]);
      } else {
        if (!initialPrice || Number(initialPrice) <= 0) throw new Error(`This ${feeLabel} pool does not exist. Enter the initial price to create it.`);
        const oneA = 10n ** BigInt(metaA.decimals);
        const pricedB = parseUnits(initialPrice, metaB.decimals);
        const sqrtPrice = sdkA.equals(sdk0) ? encodeSqrtRatioX96(pricedB.toString(), oneA.toString()) : encodeSqrtRatioX96(oneA.toString(), pricedB.toString());
        pool = new Pool(sdk0, sdk1, fee, sqrtPrice.toString(), '0', TickMath.getTickAtSqrtRatio(sqrtPrice));
      }
      const tickSpacing = TICK_SPACINGS[fee];
      const position = Position.fromAmounts({ pool, tickLower: nearestUsableTick(TickMath.MIN_TICK, tickSpacing), tickUpper: nearestUsableTick(TickMath.MAX_TICK, tickSpacing), amount0: amount0.toString(), amount1: amount1.toString(), useFullPrecision: true });
      await approveIfNeeded(sdkA.equals(sdk0) ? metaA : metaB, amount0, manager);
      await approveIfNeeded(sdkA.equals(sdk0) ? metaB : metaA, amount1, manager);
      setTx({ kind: 'working', message: poolExists ? 'Adding liquidity to the live pool…' : 'Creating the pool and adding initial liquidity…' });
      const method = NonfungiblePositionManager.addCallParameters(position, { recipient: getAddress(wallet.account), deadline: Math.floor(Date.now() / 1000) + 1200, slippageTolerance: new Percent(Math.round(tolerance * 100), 10_000), createPool: !poolExists });
      const hash = await sendAndWait({ to: manager, data: method.calldata as `0x${string}`, value: `0x${BigInt(method.value).toString(16)}` });
      setTx({ kind: 'success', hash, message: poolExists ? 'Liquidity position created.' : 'Pool and initial liquidity position created.' });
    } catch (reason) {
      setTx({ kind: 'error', message: reason instanceof Error ? reason.message : 'The liquidity transaction failed.' });
    }
  }

  return <ToolShell active="liquidity" title="Liquidity" subtitle="Create or add a real full-range Uniswap V3 position." account={wallet.account} onConnect={() => { wallet.connect(); }} wide>
    <div className="tool-grid liquidity-grid"><section className="tool-panel"><h2 className="tool-section-title"><Droplets size={19} /> Position</h2><p className="tool-section-copy">ArreyX checks the Uniswap V3 factory. If the selected fee pool does not exist, the same transaction creates and initializes it before minting your position.</p>
      <label className="tool-field">Network<select value={networkId} onChange={event => changeNetwork(Number(event.target.value) as 1 | 8453)} disabled={disabled}><option value={1}>Ethereum</option><option value={8453}>Base</option></select></label>
      <div className="tool-field-row"><label className="tool-field">Token A contract<input value={tokenA} onChange={event => setTokenA(event.target.value)} spellCheck={false} disabled={disabled} /></label><label className="tool-field">Amount A<input inputMode="decimal" placeholder="0.0" value={amountA} onChange={event => setAmountA(event.target.value)} disabled={disabled} /></label></div>
      <div className="tool-field-row"><label className="tool-field">Token B contract<input value={tokenB} onChange={event => setTokenB(event.target.value)} spellCheck={false} disabled={disabled} /></label><label className="tool-field">Amount B<input inputMode="decimal" placeholder="0.0" value={amountB} onChange={event => setAmountB(event.target.value)} disabled={disabled} /></label></div>
      <div className="tool-field-row"><label className="tool-field">Fee tier<select value={fee} onChange={event => setFee(Number(event.target.value) as SupportedFee)} disabled={disabled}><option value={100}>0.01%</option><option value={500}>0.05%</option><option value={3000}>0.30%</option><option value={10000}>1.00%</option></select></label><label className="tool-field">Slippage tolerance<input inputMode="decimal" value={slippage} onChange={event => setSlippage(event.target.value)} disabled={disabled} /><span className="field-suffix">%</span></label></div>
      <label className="tool-field">Initial price <span>Token B per Token A; only used when creating a new pool</span><input inputMode="decimal" placeholder="Required only for a new pool" value={initialPrice} onChange={event => setInitialPrice(event.target.value)} disabled={disabled} /></label>
      {(wallet.error || tx.message) && <div className={`tool-alert ${tx.kind === 'error' || wallet.error ? 'error' : tx.kind === 'success' ? 'success' : ''}`}>{wallet.error ?? tx.message}{tx.hash && <a className="tx-link" href={`${deployment.explorer}${tx.hash}`} target="_blank" rel="noopener noreferrer">View transaction <ExternalLink size={13} /></a>}</div>}
      <button className="tool-primary" disabled={disabled} onClick={submit}><PlusCircle size={18} /> {disabled ? 'Waiting for wallet…' : wallet.account ? 'Review liquidity transaction' : 'Connect wallet'}</button>
    </section>
    <aside className="tool-panel liquidity-summary"><h2 className="tool-section-title">Transaction details</h2><dl><div><dt>Protocol</dt><dd>Uniswap V3</dd></div><div><dt>Network</dt><dd>{deployment.name}</dd></div><div><dt>Position range</dt><dd>Full range</dd></div><div><dt>Fee tier</dt><dd>{feeLabel}</dd></div><div><dt>Approval policy</dt><dd>Exact amounts</dd></div><div><dt>Position type</dt><dd>Transferable NFT</dd></div></dl><p>Full-range positions stay active across all prices but may earn less than concentrated positions. Token contracts, balances, pool state, approvals, and transactions are read directly from the selected network.</p></aside>
    </div>
  </ToolShell>;
}
