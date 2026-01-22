# Rayls Testnet RPC Stress Test with k6

Simple, configurable load/stress testing for the Rayls Testnet public RPC (`https://devnet-rpc.rayls.com` – Chain ID 123123).

**Warning**: Public RPCs have rate limits + bot protection (likely Cloudflare). High concurrency from one IP will trigger blocks/challenges (HTML responses, 429s). Use responsibly – do not attempt to DDoS or overload testnets.

## Requirements

- Install [k6](https://k6.io/docs/getting-started/installation/) (e.g. `sudo snap install k6` on Linux/WSL, brew on macOS, etc.)

## How to Use (One Script – Modify to Change Behavior)

All configuration is at the top of `scripts/stress-test.js`. Edit these lines and rerun.

1. **Safe / Basic Test** (low load, sustained, 100% success likely)
   ```javascript
   vus: 5,
   duration: '60s',
   stages: [],  // comment out or remove stages
   const USE_MIXED_METHODS = false;
   const SLEEP_PER_ITERATION = 1;  // or higher

   Moderate Test (balanced, some stress)JavaScriptvus: 20,
duration: '90s',
stages: [],  // constant load
const USE_MIXED_METHODS = true;
const SLEEP_PER_ITERATION = 0.3;
Aggressive Ramp-Up Stress (push limits – expect failures)JavaScriptstages: [
  { duration: '30s', target: 20 },
  { duration: '60s', target: 100 },
  { duration: '30s', target: 0 },
],
// Remove or comment out vus/duration if using stages
const USE_MIXED_METHODS = true;
const SLEEP_PER_ITERATION = 0;  // max speed – high chance of blocks

Run the test:
# From project root
k6 run scripts/stress-test.js

# Save output for analysis
k6 run scripts/stress-test.js > results/my-run-$(date +%Y-%m-%d).txt

## Running & Saving Results

k6 prints results to the terminal by default. To save them to a file, use redirection (`>`):

You add > filename.txt yourself every time:Bash# Saves today's run with date in filename
k6 run scripts/stress-test.js > results/aggressive-$(date +%Y-%m-%d-%H%M).txt

# Or fixed name (overwrites each time)
k6 run scripts/stress-test.js > results/example-aggressive-run.txt