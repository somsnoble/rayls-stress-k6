# Rayls Devnet RPC Stress Test with k6

This repository contains a k6 script to load-test the public Rayls Devnet RPC (`https://devnet-rpc.rayls.com`).

**Important – January 2026 status**  
The RPC is behind **Cloudflare** and currently returns **HTTP 522** ("Connection timed out") on almost every request — even with 1 VU and long sleep.  
This is most likely a **temporary IP block** from Cloudflare caused by earlier aggressive runs.

**Until resolved (wait 2–24 hours or change IP/network), you will see 522 errors.**  
The script itself is correct; the issue is external.

## Features
- One wallet per VU → no nonce collisions
- Mixed light read calls (`eth_chainId`, `eth_blockNumber`, `eth_getBalance`)
- Environment variables for wallets (no keys hardcoded)
- Conservative defaults to avoid worsening blocks

**Writes are disabled** (invalid RLP in plain k6 + high block risk).

## Requirements
- Windows + PowerShell
- k6 installed  
  → https://k6.io/docs/get-started/installation/ (MSI installer recommended)  
  → Verify: `k6 version`

## Project Structure
rayls-stress-k6/
└── scripts/
└── stress-test.js     ← the main script (1 VU safe mode)
text## Setup & Run – Step by Step

### 1. Go to the scripts folder
```powershell
cd C:\Users\user\Documents\rayls-stress-k6\scripts

Copy-paste this entire block and run it:
PowerShellk6 run `
  --env VU_1_PK=0x32dad97ae0dcdecf3269a303ca4803d9c3fb542fcfa5a2dfd16e7573ef28461b `
  --env VU_1_ADDR=0x85F3De3e118c195423dc3DD17134D5068Bae6B81 `
  stress-test.js
What to expect right now:

Most likely: Status 522 after ~20 seconds + JSON parse error
If unblocked: Status 200 + valid JSON responses

After confirming 1 VU gets 200 OK responses, you can add more VUs one by one.
Example: Run with 3 VUs
PowerShellk6 run `
  --env VU_1_PK=0x32...
  --env VU_1_ADDR=0x85F3De3e118c195423dc3DD17134D5068Bae6B81 `
  --env VU_2_PK=0xe3...
  --env VU_2_ADDR=0xa3692E05CFf8d3Cb417815A262B049DAd5BdfFe5 `
  --env VU_3_PK=0xb...
  --env VU_3_ADDR=0xa1bAC04D3A6BCEf032c3DED83db59a9C40785D82 `
  stress-test.js

  Scaling tips:

Start with 1 VU + 5–10s sleep
Only reduce sleep / add VUs after getting consistent 200 OK
Fund wallets with native tokens first (via faucet or transfer)

Troubleshooting 522 Errors

Every request = 522 after ~20s → IP blocked by Cloudflare
→ Wait 2–24 hours
→ Try mobile hotspot / VPN (ProtonVPN free, Windscribe free)
→ Test first with curl:PowerShellcurl -X POST https://devnet-rpc.rayls.com -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}"

Good response example:

JSON{"jsonrpc":"2.0","id":1,"result":"0x1e0f3"}