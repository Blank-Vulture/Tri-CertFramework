import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import * as crypto from 'crypto-js';

async function testHashConsistency() {
  console.log('🧪 Testing PDF Hash Consistency\n');

  const testPdfPath = path.join(__dirname, '..', 'test-sample.pdf');
  
  if (!fs.existsSync(testPdfPath)) {
    console.log('❌ Test PDF not found');
    return;
  }

  // Read original PDF
  const originalPdfData = fs.readFileSync(testPdfPath);
  
  // Test 1: Calculate hash as Prover would (normalized PDF)
  const proverHash = await calculateProverHash(originalPdfData);
  console.log('🔵 Prover Hash:', proverHash.substring(0, 20) + '...');
  
  // Test 2: Simulate PDF with attachments (like Prover output)
  const pdfWithAttachments = await simulateAttachedPdf(originalPdfData);
  
  // Test 3: Calculate hash as Verifier would (remove attachments)
  const verifierHash = await calculateVerifierHash(pdfWithAttachments);
  console.log('🟢 Verifier Hash:', verifierHash.substring(0, 20) + '...');
  
  // Test 4: Compare hashes
  const hashesMatch = proverHash === verifierHash;
  console.log(`\n${hashesMatch ? '✅' : '❌'} Hash Consistency:`, hashesMatch ? 'PASS' : 'FAIL');
  
  if (!hashesMatch) {
    console.log('   Prover Hash:  ', proverHash);
    console.log('   Verifier Hash:', verifierHash);
  }
}

async function calculateProverHash(pdfData: Uint8Array): Promise<string> {
  const pdfDoc = await PDFDocument.load(pdfData);
  
  // Normalize PDF (same as Prover logic)
  pdfDoc.setSubject('');
  pdfDoc.setTitle('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  
  const epochDate = new Date('1970-01-01T00:00:00Z');
  pdfDoc.setCreationDate(epochDate);
  pdfDoc.setModificationDate(epochDate);
  
  const normalizedPdfBytes = await pdfDoc.save();
  
  const wordArray = crypto.lib.WordArray.create(normalizedPdfBytes);
  const hash = crypto.SHA3(wordArray, { outputLength: 512 });
  return hash.toString();
}

async function simulateAttachedPdf(originalPdfData: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfData);
  
  // Simulate attachment metadata (like Prover does)
  const metadata = {
    attachments: [
      { name: 'proof.json', size: 100, data: 'mock-data' },
      { name: 'sig.jws', size: 50, data: 'mock-sig' }
    ]
  };
  
  pdfDoc.setSubject(JSON.stringify(metadata));
  // Note: We don't set title, creator, producer, dates (as per fix)
  
  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}

async function calculateVerifierHash(pdfData: Uint8Array): Promise<string> {
  const pdfDoc = await PDFDocument.load(pdfData);
  
  // Clear attachments (same as Verifier logic)
  pdfDoc.setSubject('');
  pdfDoc.setTitle('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  
  const epochDate = new Date('1970-01-01T00:00:00Z');
  pdfDoc.setCreationDate(epochDate);
  pdfDoc.setModificationDate(epochDate);
  
  const normalizedPdfBytes = await pdfDoc.save();
  
  const wordArray = crypto.lib.WordArray.create(normalizedPdfBytes);
  const hash = crypto.SHA3(wordArray, { outputLength: 512 });
  return hash.toString();
}

// Run test
if (require.main === module) {
  testHashConsistency().catch(console.error);
}
