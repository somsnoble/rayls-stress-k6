// generate-wallets.js
const { Wallet } = require('ethers');

const NUM_WALLETS = 50; // match your max VUs

const wallets = [];
for (let i = 0; i < NUM_WALLETS; i++) {
  const w = Wallet.createRandom();
  wallets.push({
    address: w.address,
    privateKey: w.privateKey,
  });
}

console.log('Copy-paste this into your k6 script or .env:');
wallets.forEach((w, idx) => {
  console.log(`VU_${idx + 1}_PK=${w.privateKey}`);
  console.log(`VU_${idx + 1}_ADDR=${w.address}`);
});