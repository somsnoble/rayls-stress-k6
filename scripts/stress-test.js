import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

// --------------------- CONFIGURATION ---------------------
export const options = {
  vus: 1,               // Start with 1 VU only! Increase later if stable
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.90'],     // Allow higher failure tolerance during initial tests
    http_req_duration: ['p(95)<10000'], // Relax to 10s since timeouts are long
  },
};

const USE_MIXED_METHODS = true;
const SLEEP_PER_ITERATION = 5;  // 5 seconds – crucial to avoid Cloudflare blocks

const TRANSFER_AMOUNT_WEI = '1000000000000'; // 0.000001 native

const RPC_URL = 'https://devnet-rpc.rayls.com';
const CHAIN_ID = 123123;
const EXPECTED_CHAIN_ID_HEX = '0x1e0f3';

// Use env vars first (your long command already passes them)
function getWallet() {
  let pk = __ENV[`VU_${__VU}_PK`];
  let addr = __ENV[`VU_${__VU}_ADDR`];
  if (!pk || !addr) {
    throw new Error(`No wallet defined for VU ${__VU}. Use --env VU_${__VU}_PK=... and VU_${__VU}_ADDR=...`);
  }
  return { pk: pk.startsWith('0x') ? pk.slice(2) : pk, addr };
}

// Improved signTransaction – but RLP is still placeholder (see notes below)
function signTransaction(txParams, privateKey) {
  // Placeholder RLP – this is NOT correct RLP encoding!
  // For real signing, you need a proper RLP implementation in JS.
  // Current version will produce invalid signedTx → eth_sendRawTransaction will fail with "invalid transaction".
  // For now, disable writes (see below) or fix RLP later.
  const rlp = (items) => '0x' + items.map(item => {
    if (typeof item === 'string' && item.startsWith('0x')) return item.slice(2);
    return Number(item).toString(16).padStart(2, '0');
  }).join('');

  const txRLP = rlp([
    txParams.nonce,
    txParams.gasPrice,
    txParams.gasLimit,
    txParams.to,
    txParams.value,
    '0x',
    CHAIN_ID,
    0, 0
  ]);

  const txHash = crypto.createHash('sha3_256', txRLP);
  const sig = crypto.sign('ecdsa', txHash, { key: privateKey, curve: 'secp256k1' });

  const v = sig.recoveryParam + 35 + (CHAIN_ID * 2);

  const signedRLP = rlp([
    txParams.nonce,
    txParams.gasPrice,
    txParams.gasLimit,
    txParams.to,
    txParams.value,
    '0x',
    v,
    '0x' + sig.r.toString('hex'),
    '0x' + sig.s.toString('hex')
  ]);

  return signedRLP;
}

// --------------------- MAIN ---------------------
export default function () {
  const wallet = getWallet();
  let methodUsed = 'eth_chainId';
  let payload;

  const methods = [
    { method: 'eth_chainId', params: [] },
    { method: 'eth_blockNumber', params: [] },
    { method: 'eth_getBlockByNumber', params: ['latest', true] },
    { method: 'eth_getBalance', params: [wallet.addr, 'latest'] },
    // { method: 'eth_sendRawTransaction', params: null }, // ← DISABLED for now – RLP broken + high load risk
  ];

  let randomMethod = USE_MIXED_METHODS 
    ? methods[Math.floor(Math.random() * methods.length)]
    : methods[0];

  methodUsed = randomMethod.method;

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s', // Prevent indefinite hangs
  };

  let res = http.post(RPC_URL, JSON.stringify({
    jsonrpc: '2.0',
    method: methodUsed,
    params: randomMethod.params || [],
    id: 1,
  }), params);

  console.log(`[VU ${__VU}] ${methodUsed} | Status: ${res.status} | Duration: ${res.timings.duration}ms`);

  let bodyPreview = res.body.substring(0, 300);
  if (res.status !== 200) {
    console.log(`[VU ${__VU}] Error body preview: ${bodyPreview}`);
  }

  let validResponse = false;
  let jsonError = null;

  try {
    const json = JSON.parse(res.body);
    validResponse = !!(json.result || json.error);
    if (json.error) {
      console.log(`[VU ${__VU}] RPC error: ${JSON.stringify(json.error)}`);
      jsonError = json.error.message || 'Unknown RPC error';
    } else if (methodUsed === 'eth_chainId' && json.result !== EXPECTED_CHAIN_ID_HEX) {
      console.log(`[VU ${__VU}] Wrong chain ID: got ${json.result}`);
    }
  } catch (e) {
    console.log(`[VU ${__VU}] JSON parse failed: ${e.message} | Likely non-JSON response (Cloudflare page?)`);
  }

  sleep(SLEEP_PER_ITERATION);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'valid JSON response': () => validResponse,
  });

  if (jsonError) {
    check(res, { 'no RPC error': () => false }); // Optional: fail check on RPC errors
  }
}