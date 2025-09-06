# Yearly Circuit Assets: Build and Integration

This guide explains how to build and integrate year‑aware Groth16 assets (wasm/zkey/vkey) so Prover and Verifier use exactly the same circuit/key per graduation year.

## Goals

- Compile Circom circuit with `graduation_year` as a public input
- Produce yearly assets per Y: `commitment_Y.wasm`, `commitment_final_Y.zkey`, `vkey_Y.json`
- Place assets where Prover/Verifier can find them automatically
- Ensure `proof.vkey_hash` equals the SHA3‑256 hash of the exact `vkey_Y.json` used

## Prerequisites

- Circom 2.x and snarkjs installed locally
- Node.js v18+

## Build Steps (per year Y)

1. Compile circuit
   circom circuits/commitment.circom --r1cs --wasm --sym -o build/Y

   This produces `build/Y/commitment_js/commitment.wasm` and `build/Y/commitment.r1cs`.

2. Powers of Tau ceremony (once or reuse existing):
   snarkjs groth16 setup build/Y/commitment.r1cs potXX_final.ptau build/Y/commitment_final.zkey

3. Export verification key
   snarkjs zkey export verificationkey build/Y/commitment_final.zkey build/Y/vkey_Y.json

4. Copy assets into apps
   - Prover: copy to `prover/public/` as
     - `commitment_js/commitment_Y.wasm`
     - `commitment_final_Y.zkey`
     - `vkey_Y.json`
   - Verifier UI: copy to `verifier-ui/public/` as
     - `vkey_Y.json`

5. Verify hash consistency
   Use the same canonical JSON hashing used in the apps:

   - Compute: sort keys JSON + SHA3‑256, then prefix `sha3-256:`
   - The Prover embeds `vkey_hash` from the vkey file it used. Verifier recomputes from the vkey it verified with.

## App Integration

- Prover
  - Auto‑detects yearly wasm/zkey when available by checking
    - `/commitment_js/commitment_Y.wasm`
    - `/commitment_final_Y.zkey`
  - If both exist, they are used; otherwise defaults to non‑year assets.
  - You can now select the exact `vkey_Y.json` from Executive Console in the UI.

- Verifier UI
  - Accepts local `vkey_Y.json` upload or uses PDF‑embedded vkey.
  - Also supports `/vkey_Y.json` in `public/` if needed.

## Executive Console (optional)

- If you import real compiled `vkey_Y.json`, compute and display its hash; do not modify cryptographic fields or `nPublic`.
- Export `vkey_Y.json` along with `vkey_hash_Y.txt`.

## Notes

- Ensure both apps and the Executive Console operate on the exact same vkey JSON to avoid hash mismatches.
- When fully migrating to year‑aware circuits, remove fallback defaults to prevent accidental cross‑year verification.

