# Security policy

ArreyX is a non-custodial interface. It never asks for a seed phrase or private key. A connected wallet remains responsible for displaying and approving every signature and transaction.

## Report a vulnerability

Please report security issues privately through the repository's **Security** tab using a private vulnerability report. Include the affected page or contract integration, steps to reproduce, and the impact. Do not include seed phrases, private keys, or other wallet secrets.

Avoid opening a public issue until the report has been reviewed and a fix is available.

## Supported version

The production deployment from the latest commit on `main` is supported. Earlier deployments and forks may not include current fixes.

## Production checklist

- Configure dedicated RPC endpoints through the documented `NEXT_PUBLIC_RPC_*` variables.
- Configure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for WalletConnect sessions.
- Keep dependency lockfiles committed and review automated dependency alerts.
- Verify the displayed network, token addresses, spender, amounts, fees, slippage, and recipient before signing.
- Test swap, bridge, order, approval, and liquidity flows with small amounts before broader release.
- Arrange an independent smart contract and integration review before representing the interface as audited.

## Scope

ArreyX integrates third-party protocols and data providers. Their contracts, APIs, route availability, and wallet software have their own security policies. Reports about ArreyX's interface, transaction construction, allowance handling, or data presentation are in scope; upstream protocol vulnerabilities should also be reported to the affected provider.
