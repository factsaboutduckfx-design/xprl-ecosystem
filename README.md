# XRPL Ecosystem

A responsive XRPL Testnet starter dashboard with a live public-ledger connection, public account lookup, transaction lookup, token planning worksheet, validator checklist, consensus overview and official developer links.

## Run locally
Open `index.html` in a modern browser, or serve this directory with any static web server.

## Deploy
GitHub Actions deploys the static site to GitHub Pages on pushes to `main`. In the repository settings, ensure Pages is configured to use **GitHub Actions** as its deployment source. The workflow is in `.github/workflows/pages.yml`.

## Safety and scope
- Connects to the public XRPL Testnet endpoint: `wss://s.altnet.rippletest.net:51233`.
- Read-only network lookups; token worksheet is a local draft only.
- Does not ask for, store or transmit wallet seeds, private keys or passwords.
- Does not sign or submit payments, issue tokens, operate a validator or create a new blockchain.
- Testnet balances and assets have no mainnet value.
- This is an independent community starter, not an official Ripple product.

Before adding signing or mainnet features, conduct a security review and use a wallet's approved signing flow. Never collect seed phrases in this website.

## Official resources
- https://xrpl.org/docs
- https://xrpl.org/docs/concepts/tokens
- https://js.xrpl.org/
