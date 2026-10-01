'use client';

import { useMemo, useState } from 'react';
import { Droplets, ExternalLink, PlusCircle } from 'lucide-react';
import { CurrencyAmount, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES, Percent, Token, V3_CORE_FACTORY_ADDRESSES } from '@uniswap/sdk-core';
import { FeeAmount, nearestUsableTick, NonfungiblePositionManager, Pool, Position, TickMath, TICK_SPACINGS, encodeSqrtRatioX96 } from '@uniswap/v3-sdk';
import { base, mainnet } from 'viem/chains';
import { createPublicClient, encodeFunctionData, erc20Abi, formatUnits, getAddress, http, isAddress, parseUnits, zeroAddress } from 'viem';
import { ToolShell } from './tool-shell';
import { useEvmWallet } from '@/hooks/use-evm-wallet';
import { rpcUrlFor } from '@/lib/network-config';
import { confirmTransaction, saveTransaction } from '@/lib/transaction-log';

const deployments = {
  1: { chain: mainnet, name: 'Ethereum', explorer: 'https://etherscan.io/tx/', defaults: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'] },
  8453: { chain: base, name: 'Base', explorer: 'https://basescan.org/tx/', defaults: ['0x4200000000000000000000000000000000000006', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'] },
} as const;

const factoryAbi = [{ type: 'function', name: 'getPool', stateMutability: 'view', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'fee', type: 'uint24' }], outputs: [{ name: 'pool', type: 'address' }] }] as const;
const poolAbi = [
  { type: 'function', name: 'slot0', stateMutability: 'view', inputs: [], outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'observationIndex', type: 'uint16' }, { name: 'observationCardinality', type: 'uint16' }, { name: 'observationCardinalityNext', type: 'uint16' }, { name: 'feeProtocol', type: 'uint8' }, { name: 'unlocked', type: 'bool' }] },
  { type: 'function', name: 'liquidity', stateMutability: 'view', inputs: [], outputs: [{ name: 'liquidity', type: 'uint128' }] },
] as const;
const positionManagerAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
  { type: 'function', name: 'tokenOfOwnerByIndex', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { type: 'function', name: 'positions', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: 'nonce', type: 'uint96' }, { name: 'operator', type: 'address' }, { name: 'token0', type: 'address' }, { name: 'token1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' }, { name: 'liquidity', type: 'uint128' }, { name: 'feeGrowthInside0LastX128', type: 'uint256' }, { name: 'feeGrowthInside1LastX128', type: 'uint256' }, { name: 'tokensOwed0', type: 'uint128' }, { name: 'tokensOwed1', type: 'uint128' }] },
] as const;

type TokenMeta = { address: `0x${string}`; symbol: string; decimals: number };
type TxState = { kind: 'idle' | 'working' | 'success' | 'error'; message?: string; hash?: string };
type SupportedFee = FeeAmount.LOWEST | FeeAmount.LOW | FeeAmount.MEDIUM | FeeAmount.HIGH;
type PositionRecord = { tokenId: bigint; token0: TokenMeta; token1: TokenMeta; fee: SupportedFee; tickLower: number; tickUpper: number; liquidity: bigint; owed0: bigint; owed1: bigint };
function currentTime() { return Date.now(); }

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
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [positionsState, setPositionsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const deployment = deployments[networkId];
  const disabled = tx.kind === 'working';

  const feeLabel = useMemo(() => ({ [FeeAmount.LOWEST]: '0.01%', [FeeAmount.LOW]: '0.05%', [FeeAmount.MEDIUM]: '0.30%', [FeeAmount.HIGH]: '1.00%' }[fee]), [fee]);
  function changeNetwork(next: 1 | 8453) { const defaults = deployments[next].defaults; setNetworkId(next); setTokenA(defaults[0]); setTokenB(defaults[1]); setTx({ kind: 'idle' }); setPositions([]); setPositionsState('idle'); }

  async function loadPositions() {
    try {
      if (!wallet.account) { await wallet.connect(); throw new Error('Connect your wallet, then load positions again.'); }
      setPositionsState('loading'); setPositionsError(null);
      const client = createPublicClient({ chain: deployment.chain, transport: http(rpcUrlFor(networkId)) });
      const owner = getAddress(wallet.account);
      const manager = getAddress(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[networkId]);
      const balance = await client.readContract({ address: manager, abi: positionManagerAbi, functionName: 'balanceOf', args: [owner] });
      if (balance > 50n) throw new Error('This wallet has more than 50 positions. Use a dedicated position manager for bulk operations.');
      const tokenIds = await Promise.all(Array.from({ length: Number(balance) }, (_, index) => client.readContract({ address: manager, abi: positionManagerAbi, functionName: 'tokenOfOwnerByIndex', args: [owner, BigInt(index)] })));
      const rawPositions = await Promise.all(tokenIds.map(tokenId => client.readContract({ address: manager, abi: positionManagerAbi, functionName: 'positions', args: [tokenId] }).then(position => ({ tokenId, position }))));
      const tokenAddresses = Array.from(new Set(rawPositions.flatMap(item => [item.position[2], item.position[3]])));
      const metas = new Map<string, TokenMeta>();
      await Promise.all(tokenAddresses.map(async address => {
        const [symbol, decimals] = await Promise.all([client.readContract({ address, abi: erc20Abi, functionName: 'symbol' }), client.readContract({ address, abi: erc20Abi, functionName: 'decimals' })]);
        metas.set(address.toLowerCase(), { address, symbol, decimals });
      }));
      setPositions(rawPositions.map(({ tokenId, position }) => ({ tokenId, token0: metas.get(position[2].toLowerCase())!, token1: metas.get(position[3].toLowerCase())!, fee: position[4] as SupportedFee, tickLower: position[5], tickUpper: position[6], liquidity: position[7], owed0: position[10], owed1: position[11] })).filter(item => item.token0 && item.token1));
      setPositionsState('ready');
    } catch (reason) { setPositionsError(reason instanceof Error ? reason.message : 'Positions could not be loaded.'); setPositionsState('error'); }
  }

  async function removePosition(item: PositionRecord, percentage: 25 | 50 | 100) {
    try {
      if (!wallet.account || !wallet.provider) throw new Error('Connect the position owner wallet first.');
      if (!window.confirm(`Remove ${percentage}% of position #${item.tokenId.toString()} and collect available tokens?`)) return;
      if (wallet.chainId !== networkId) await wallet.switchChain(networkId);
      setTx({ kind: 'working', message: `Preparing ${percentage}% liquidity removal…` });
      const client = createPublicClient({ chain: deployment.chain, transport: http(rpcUrlFor(networkId)) });
      const sdk0 = new Token(networkId, item.token0.address, item.token0.decimals, item.token0.symbol);
      const sdk1 = new Token(networkId, item.token1.address, item.token1.decimals, item.token1.symbol);
      const factory = getAddress(V3_CORE_FACTORY_ADDRESSES[networkId]);
      const manager = getAddress(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[networkId]);
      const poolAddress = await client.readContract({ address: factory, abi: factoryAbi, functionName: 'getPool', args: [item.token0.address, item.token1.address, item.fee] });
      if (poolAddress === zeroAddress) throw new Error('The position pool could not be found.');
      const [slot0, liquidity] = await Promise.all([client.readContract({ address: poolAddress, abi: poolAbi, functionName: 'slot0' }), client.readContract({ address: poolAddress, abi: poolAbi, functionName: 'liquidity' })]);
      const pool = new Pool(sdk0, sdk1, item.fee, slot0[0].toString(), liquidity.toString(), slot0[1]);
      const position = new Position({ pool, liquidity: item.liquidity.toString(), tickLower: item.tickLower, tickUpper: item.tickUpper });
      const now = currentTime();
      const method = NonfungiblePositionManager.removeCallParameters(position, { tokenId: item.tokenId.toString(), liquidityPercentage: new Percent(percentage, 100), slippageTolerance: new Percent(50, 10_000), deadline: Math.floor(now / 1000) + 1200, burnToken: percentage === 100, collectOptions: { recipient: getAddress(wallet.account), expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(sdk0, item.owed0.toString()), expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(sdk1, item.owed1.toString()) } });
      const hash = await wallet.provider.request<`0x${string}`>({ method: 'eth_sendTransaction', params: [{ from: wallet.account, to: manager, data: method.calldata, value: `0x${BigInt(method.value).toString(16)}` }] });
      saveTransaction({ hash, title: `Remove ${percentage}% Uniswap V3 liquidity`, network: deployment.name, explorer: deployment.explorer, createdAt: now, status: 'pending' });
      await client.waitForTransactionReceipt({ hash }); confirmTransaction(hash);
      setTx({ kind: 'success', hash, message: `${percentage}% liquidity removed and available tokens collected.` });
      await loadPositions();
    } catch (reason) { setTx({ kind: 'error', message: reason instanceof Error ? reason.message : 'Liquidity removal failed.' }); }
  }

  async function submit() {
    try {
      if (!wallet.account || !wallet.provider) { await wallet.connect(); throw new Error('Connect your wallet, then review and submit again.'); }
      if (!amountA || !amountB) throw new Error('Enter both token amounts.');
      if (tokenA.toLowerCase() === tokenB.toLowerCase()) throw new Error('Choose two different tokens.');
      const tolerance = Number(slippage);
      if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 5) throw new Error('Slippage must be above 0% and no more than 5%.');
      if (wallet.chainId !== networkId) await wallet.switchChain(networkId);
      setTx({ kind: 'working', message: 'Reading tokens and the live Uniswap pool…' });
      const client = createPublicClient({ chain: deployment.chain, transport: http(rpcUrlFor(networkId)) });
      const readToken = async (address: string): Promise<TokenMeta> => {
        if (!isAddress(address)) throw new Error('Enter two valid ERC-20 contract addresses.');
        const checked = getAddress(address);
        const [symbol, decimals] = await Promise.all([
          client.readContract({ address: checked, abi: erc20Abi, functionName: 'symbol' }),
          client.readContract({ address: checked, abi: erc20Abi, functionName: 'decimals' }),
        ]);
        return { address: checked, symbol, decimals };
      };
      const sendAndWait = async (request: { to: `0x${string}`; data: `0x${string}`; value?: `0x${string}` }, title: string) => {
        if (!wallet.provider || !wallet.account) throw new Error('Connect an EVM wallet first.');
        const hash = await wallet.provider.request<`0x${string}`>({ method: 'eth_sendTransaction', params: [{ from: wallet.account, to: request.to, data: request.data, value: request.value ?? '0x0' }] });
        saveTransaction({ hash, title, network: deployment.name, explorer: deployment.explorer, createdAt: Date.now(), status: 'pending' });
        await client.waitForTransactionReceipt({ hash });
        confirmTransaction(hash);
        return hash;
      };
      const approveIfNeeded = async (token: TokenMeta, amount: bigint, spender: `0x${string}`) => {
        if (!wallet.account) throw new Error('Connect an EVM wallet first.');
        const owner = getAddress(wallet.account);
        const allowance = await client.readContract({ address: token.address, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] });
        if (allowance >= amount) return;
        if (allowance > 0n) {
          setTx({ kind: 'working', message: `Resetting ${token.symbol} approval…` });
          await sendAndWait({ to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, 0n] }) }, `Reset ${token.symbol} approval`);
        }
        setTx({ kind: 'working', message: `Approving exact ${token.symbol} amount…` });
        await sendAndWait({ to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] }) }, `Approve ${token.symbol} for liquidity`);
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
      const hash = await sendAndWait({ to: manager, data: method.calldata as `0x${string}`, value: `0x${BigInt(method.value).toString(16)}` }, poolExists ? 'Add Uniswap V3 liquidity' : 'Create Uniswap V3 pool');
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
    <section className="tool-panel positions-panel"><div className="positions-heading"><div><h2 className="tool-section-title">Your positions</h2><p className="tool-section-copy">Read Uniswap V3 position NFTs owned by the connected wallet on {deployment.name}.</p></div><button className="tool-secondary-button" disabled={disabled || positionsState === 'loading'} onClick={loadPositions}>{positionsState === 'loading' ? 'Loading…' : 'Load positions'}</button></div>{positionsError && <div className="tool-alert error">{positionsError}</div>}{positionsState === 'ready' && positions.length === 0 && <p className="positions-empty">No Uniswap V3 positions found for this wallet on {deployment.name}.</p>}{positions.length > 0 && <div className="positions-list">{positions.map(item => <article key={item.tokenId.toString()}><div><span>Position #{item.tokenId.toString()}</span><strong>{item.token0.symbol} / {item.token1.symbol}</strong><small>{Number(item.fee) / 10_000}% fee · liquidity {item.liquidity.toString()}</small><small>Owed: {formatUnits(item.owed0, item.token0.decimals)} {item.token0.symbol} · {formatUnits(item.owed1, item.token1.decimals)} {item.token1.symbol}</small></div><div><button disabled={disabled} onClick={() => removePosition(item, 25)}>Remove 25%</button><button disabled={disabled} onClick={() => removePosition(item, 50)}>Remove 50%</button><button className="danger" disabled={disabled} onClick={() => removePosition(item, 100)}>Remove all</button></div></article>)}</div>}</section>
  </ToolShell>;
}
