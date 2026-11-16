# XRPL Ecosystem — Mainnet Read-Only Build

A responsive dashboard connected to the **real XRP Ledger Mainnet** using the public WebSocket endpoint `wss://xrplcluster.com`.

## Included
- Live validated-ledger subscription and connection status.
- Public account lookup against Mainnet.
- Transaction lookup, showing the transaction result and validation information when returned by the server.
- Link to the transaction on XRPSCAN.
- Local-only issued-token planning worksheet.
- Validator operations checklist and consensus explainer.
- GitHub Pages deployment workflow.

## Mainnet safety boundary
This release is **read-only**. It reads real Mainnet data but does not sign, submit, or pay for transactions. The token worksheet is a local draft and does not create an asset. No seed phrase, secret key, password, or private key is requested or stored.

A real Mainnet payment or token issuance must be prepared with correct transaction fields, signed by the account owner through a trusted wallet such as Xaman, submitted to the network, and checked for a validated ledger result. A transaction is not successful merely because it was submitted; inspect the validated result code and transaction hash. Never paste a wallet secret into this site.

## Network
- Mainnet WebSocket: `wss://xrplcluster.com`
- Official public server documentation: https://xrpl.org/docs/tutorials/public-servers
- XRPL documentation: https://xrpl.org/docs
- XRPSCAN: https://xrpscan.com

Public servers are community infrastructure and may impose rate limits or have outages. For production business use, operate a properly maintained XRPL node or use a provider with an appropriate service commitment.

## Deploy
The GitHub Actions workflow at `.github/workflows/pages.yml` deploys the static site on pushes to `main`. In repository Settings → Pages, choose **GitHub Actions** as the deployment source. Check the Actions tab for a successful deployment before treating the public site as live.

This is an independent community project, not an official Ripple product.
