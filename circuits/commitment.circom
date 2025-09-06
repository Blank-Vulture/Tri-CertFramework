pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

// Tri-CertFramework commitment circuit with graduation year support
template Commitment() {
    // Private inputs
    signal private input owner_secret;
    
    // Public inputs
    signal input pdf_sha3_512;
    signal input graduation_year;  // Added graduation year as public input
    
    // Output
    signal output commit;
    
    // Create commitment using Poseidon hash
    // commit = Poseidon(owner_secret, pdf_sha3_512, graduation_year)
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== owner_secret;
    poseidon.inputs[1] <== pdf_sha3_512;
    poseidon.inputs[2] <== graduation_year;
    
    commit <== poseidon.out;
}

component main = Commitment();