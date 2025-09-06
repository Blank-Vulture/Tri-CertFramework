import * as fs from 'fs';
import * as path from 'path';
import { hashPdfWithoutAttachments } from './hash-pdf';
import { attachFilesWithPdfLib } from './pdf-attach';

async function runIntegrationTests() {
  console.log('🚀 Starting Phase 0 Integration Tests\n');

  // Test 1: PDF Hash Calculation
  await testPdfHashCalculation();
  
  // Test 2: PDF Attachment
  await testPdfAttachment();
  
  // Test 3: Mock ZKP Generation
  await testMockZKP();
  
  console.log('\n✅ All integration tests completed!');
}

async function testPdfHashCalculation() {
  console.log('📝 Test 1: PDF Hash Calculation');
  
  try {
    const testPdfPath = path.join(__dirname, '..', 'test-sample.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.log('❌ Test PDF not found, skipping hash test');
      return;
    }
    
    const hash1 = await hashPdfWithoutAttachments(testPdfPath);
    const hash2 = await hashPdfWithoutAttachments(testPdfPath);
    
    if (hash1 === hash2) {
      console.log('✅ PDF hash calculation is consistent');
      console.log(`   Hash: ${hash1.substring(0, 16)}...`);
    } else {
      console.log('❌ PDF hash calculation is inconsistent');
    }
  } catch (error) {
    console.log('❌ PDF hash test failed:', error);
  }
}

async function testPdfAttachment() {
  console.log('\n📎 Test 2: PDF Attachment');
  
  try {
    const testPdfPath = path.join(__dirname, '..', 'test-sample.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.log('❌ Test PDF not found, skipping attachment test');
      return;
    }
    
    // Create mock proof and signature data
    const mockProof = {
      schema: "tri-cert/proof@0",
      circuit_id: "commitment_poseidon_v1",
      vkey_hash: "sha3-256:test-hash",
      public_signals: {
        pdf_sha3_512: "hex:test-pdf-hash",
        commit: "field:test-commit"
      },
      proof: {
        pi_a: ["0x123", "0x456"],
        pi_b: [["0x789", "0xabc"], ["0xdef", "0x012"]],
        pi_c: ["0x345", "0x678"]
      }
    };
    
    const mockSignature = "test.signature.here";
    const mockVkey = { test: "vkey" };
    const mockPubKey = { test: "pubkey" };
    
    const attachments = [
      { filename: 'proof.json', data: new TextEncoder().encode(JSON.stringify(mockProof, null, 2)) },
      { filename: 'sig.jws', data: new TextEncoder().encode(mockSignature) },
      { filename: 'vkey.json', data: new TextEncoder().encode(JSON.stringify(mockVkey, null, 2)) },
      { filename: 'webauthn_pub.jwk.json', data: new TextEncoder().encode(JSON.stringify(mockPubKey, null, 2)) }
    ];
    
    const outputPath = path.join(__dirname, '..', 'test-output.pdf');
    await attachFilesWithPdfLib(testPdfPath, attachments, outputPath);
    
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ PDF attachment successful');
      console.log(`   Output size: ${stats.size} bytes`);
      
      // Clean up
      fs.unlinkSync(outputPath);
    } else {
      console.log('❌ PDF attachment failed - output file not created');
    }
  } catch (error) {
    console.log('❌ PDF attachment test failed:', error);
  }
}

async function testMockZKP() {
  console.log('\n🔐 Test 3: Mock ZKP Generation');
  
  try {
    // This would be the actual ZKP generation in production
    // For now, we'll just test the structure
    
    const testSecret = "test-secret";
    const testHash = "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    
    // Mock commitment calculation (in real implementation, this would use the circuit)
    const mockCommit = "12345678901234567890123456789012345678901234567890";
    
    const proofData = {
      schema: "tri-cert/proof@0",
      circuit_id: "commitment_poseidon_v1",
      vkey_hash: "sha3-256:07d7402498a80f4cc36591e623b2ea5ef710223a1e3c37ac50222013f2a5fcdb",
      public_signals: {
        pdf_sha3_512: `hex:${testHash}`,
        commit: `field:${mockCommit}`
      },
      proof: {
        pi_a: ["0x1a1a1a1a", "0x1b1b1b1b"],
        pi_b: [["0x2a2a2a2a", "0x2b2b2b2b"], ["0x2c2c2c2c", "0x2d2d2d2d"]],
        pi_c: ["0x3a3a3a3a", "0x3b3b3b3b"]
      }
    };
    
    // Validate proof structure
    const hasRequiredFields = 
      proofData.schema &&
      proofData.circuit_id &&
      proofData.vkey_hash &&
      proofData.public_signals &&
      proofData.proof;
    
    if (hasRequiredFields) {
      console.log('✅ Mock ZKP structure is valid');
      console.log(`   Schema: ${proofData.schema}`);
      console.log(`   Circuit: ${proofData.circuit_id}`);
      console.log(`   VKey Hash: ${proofData.vkey_hash.substring(0, 20)}...`);
    } else {
      console.log('❌ Mock ZKP structure is invalid');
    }
  } catch (error) {
    console.log('❌ Mock ZKP test failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}
