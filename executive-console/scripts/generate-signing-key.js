#!/usr/bin/env node

/**
 * Generate a valid ECDSA P-256 key pair for software signing
 * 
 * Run: node scripts/generate-signing-key.js
 */

import { webcrypto as crypto } from 'crypto';

async function generateSigningKey() {
  console.log('🔑 Generating ECDSA P-256 key pair...\n');

  // Generate key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export keys to JWK format
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  console.log('✅ Key pair generated successfully!\n');
  console.log('📋 Copy the following to executive-console/src/config/signing.ts:\n');
  console.log('─'.repeat(80));
  console.log('\nexport const SIGNING_CONFIG: SigningConfig = {');
  console.log('  mode: \'software\',  // Changed from \'hardware\' to \'software\'');
  console.log('  label: \'Executive Console Software Signer\',');
  console.log('  privateKey: ' + JSON.stringify(privateKeyJwk, null, 4).split('\n').join('\n  ') + ',');
  console.log('  publicKey: ' + JSON.stringify(publicKeyJwk, null, 4).split('\n').join('\n  '));
  console.log('}\n');
  console.log('─'.repeat(80));
  console.log('\n💡 Note: Keep the privateKey secret and do NOT commit to git!');
  console.log('💡 For production, store the private key in environment variables.');
}

generateSigningKey().catch(console.error);

