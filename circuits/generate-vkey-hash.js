const crypto = require('crypto');
const fs = require('fs');

// Read vkey.json
const vkey = JSON.parse(fs.readFileSync('vkey.json', 'utf8'));

// Convert to canonical JSON string (sorted keys, no spaces)
const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());

// Calculate SHA3-256 hash
const hash = crypto.createHash('sha3-256');
hash.update(canonicalJson);
const vkeyHash = hash.digest('hex');

// Write hash to file
fs.writeFileSync('vkey_hash.txt', `sha3-256:${vkeyHash}\n`);

console.log(`VKey Hash: sha3-256:${vkeyHash}`);
