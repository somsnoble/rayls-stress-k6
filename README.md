# Rayls Devnet RPC Stress Test with k6

This project contains a k6 load test script to stress-test the public Rayls Devnet RPC endpoint (`https://devnet-rpc.rayls.com`).

**Important – Current limitation (January 2026)**  
The RPC is protected by **Cloudflare**, and repeated requests (even from 1 VU) are currently failing with **HTTP 522** ("Connection timed out").  
This is almost certainly a **temporary IP block** triggered by earlier aggressive test runs.

Until your IP is unblocked (wait 2–24 hours or change network), the test will not produce successful responses.

## Features
- Supports multiple wallets (one per VU) to avoid nonce collisions on write transactions
- Mixed read operations: `eth_chainId`, `eth_blockNumber`, `eth_getBalance`
- Environment variable support for wallet private keys & addresses
- Conservative defaults (1 VU + long sleep) to minimize rate-limiting risk
- Basic error handling and logging for Cloudflare / RPC issues

**Writes (`eth_sendRawTransaction`) are currently disabled** because:
- Plain k6 lacks proper RLP encoding → invalid signed transactions
- Writes increase load → higher chance of Cloudflare blocks

## Requirements
- Windows (PowerShell recommended)
- k6 binary  
  → Download from https://k6.io/docs/get-started/installation/ (MSI installer preferred)  
  → After install, verify with `k6 version`

## Project Structure
rayls-stress-k6/
├── scripts/
│   └── stress-test.js     ← main test script (configured for 1 VU)
└── README.md

## Setup

1. **Navigate to the scripts folder**
   ```powershell
   cd C:\Users\user\Documents\rayls-stress-k6\scripts

   (Recommended) Create a run script
Create a file named run-1vu.ps1 with the following content:

# run-1vu.ps1
k6 run `
  --env VU_1_PK=0x32dad97ae0dcdecf3269a303ca4803d9c3fb542fcfa5a2dfd16e7573ef28461b `
  --env VU_1_ADDR=0x85F3De3e118c195423dc3DD17134D5068Bae6B81 `
  stress-test.js

  Then execute it with:
  .\run-1vu.ps1

  Scaling Up (only after 1 VU works reliably)

Reduce SLEEP_PER_ITERATION gradually: 5 → 3 → 2 → 1
Increase vus slowly: 1 → 2 → 3 (do not jump to 10)
Add more wallets via environment variable

--env VU_2_PK=... --env VU_2_ADDR=...