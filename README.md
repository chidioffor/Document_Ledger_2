# Desktop Document Ledger

A Vite + React + TypeScript desktop web conversion of the Sayari Document Ledger mobile app.

## What is included

- Desktop sidebar + main-area layout inspired by the supplied `index.html`.
- Reused assets from `src/assets`.
- WalletConnect-only wallet flow.
- On-chain document certification, verification, registry listing and revocation logic.
- Local SHA-256 file hashing in the browser.
- PDF receipt generation with `jspdf`.
- Friendly verification failure handling instead of raw ethers.js `CALL_EXCEPTION` messages.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://localhost:5173`.

## Build for deployment

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Configuration

Edit `src/constants.ts` to update:

- `CONTRACT_ADDRESS`
- `USDT_ADDRESS`
- `MASTER_WALLET`
- `WALLETCONNECT_PROJECT_ID`
- RPC URLs and default network

## Notes

This project is browser-first. It does not depend on React Native, React Navigation, or native mobile modules.
