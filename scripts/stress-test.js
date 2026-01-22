import http from 'k6/http';
import { check, sleep } from 'k6';

// --------------------- CONFIGURATION (Modify these to change test type) ---------------------
export const options = {
  // Safe/basic: low VUs + delay
  // Moderate: medium VUs + short delay
  // Aggressive: ramp-up high VUs, no/minimal delay
  stages: [  // Comment out 'stages' and use 'vus' + 'duration' for constant load
    // { duration: '20s', target: 10 },   // Ramp to 10
    // { duration: '60s', target: 50 },   // Peak at 50
    // { duration: '30s', target: 0 },    // Ramp down
  ],
  vus: 5,          // For constant load (ignore if using stages)
  duration: '60s', // For constant load (ignore if using stages)

  thresholds: {
    http_req_failed: ['rate<0.30'],     // Tolerate up to 30% fails at high load
    http_req_duration: ['p(95)<2000'],  // Alert if 95% >2s
  },
};

const USE_MIXED_METHODS = true;  // true = random heavy/light calls; false = only eth_chainId (lighter)
const SLEEP_PER_ITERATION = 0.5; // seconds delay per request (increase to avoid blocks; 0 = max speed)
// --------------------------------------------------------------------------------------------

const RPC_URL = 'https://devnet-rpc.rayls.com';
const EXPECTED_CHAIN_ID_HEX = '0x1e0f3'; // 123123 in hex

export default function () {
  let payload;
  let methodUsed = 'eth_chainId';

  if (USE_MIXED_METHODS) {
    const methods = [
      { method: 'eth_chainId', params: [] },
      { method: 'eth_blockNumber', params: [] },
      { method: 'eth_getBlockByNumber', params: ['latest', true] }, // Heavy: full block + txs
      { method: 'eth_getBalance', params: ['0x0000000000000000000000000000000000000000', 'latest'] },
    ];
    const random = methods[Math.floor(Math.random() * methods.length)];
    payload = JSON.stringify({
      jsonrpc: '2.0',
      method: random.method,
      params: random.params,
      id: 1,
    });
    methodUsed = random.method;
  } else {
    payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1,
    });
  }

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://devnet-explorer.rayls.com',
      'Referer': 'https://devnet-explorer.rayls.com/',
    },
  };

  const res = http.post(RPC_URL, payload, params);

  console.log(`[VU ${__VU}] Method: ${methodUsed} | Status: ${res.status} | Duration: ${res.timings.duration}ms`);

  if (res.status !== 200) {
    console.log(`[VU ${__VU}] Non-200 – possible rate limit / block`);
  }
  console.log(`[VU ${__VU}] Body preview: ${res.body.substring(0, 400)}...`);

  // Delay to respect potential rate limits (set to 0 for max aggression)
  sleep(SLEEP_PER_ITERATION);

  check(res, { 'status is 200': (r) => r.status === 200 });

  let validResponse = false;
  try {
    const json = JSON.parse(res.body);
    if (json && (json.result || json.error)) {
      validResponse = true;
      if (json.result && methodUsed === 'eth_chainId') {
        check(json, { 'correct chain ID': () => json.result === EXPECTED_CHAIN_ID_HEX });
      }
    }
  } catch (e) {
    console.log(`[VU ${__VU}] Parse failed: ${e.message}`);
  }

  check(res, { 'valid JSON response': () => validResponse });
}