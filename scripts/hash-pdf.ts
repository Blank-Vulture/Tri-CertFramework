import * as fs from 'fs';
import * as crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

/**
 * Calculate SHA3-512 hash of PDF content (excluding attachments)
 * @param pdfPath Path to the PDF file
 * @returns Hex string of the hash
 */
export async function hashPdfWithoutAttachments(pdfPath: string): Promise<string> {
  // Read the PDF file
  const pdfBytes = fs.readFileSync(pdfPath);
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Remove all attachments/embedded files
  // Note: In Phase 0, we assume the input PDF has no attachments
  // In production, we would remove all attachments here
  
  // Save the PDF without attachments
  const pdfBytesNoAttach = await pdfDoc.save();
  
  // Calculate SHA3-512 hash
  const hash = crypto.createHash('sha3-512');
  hash.update(pdfBytesNoAttach);
  
  return hash.digest('hex');
}

/**
 * Calculate SHA3-512 hash from PDF buffer
 * @param pdfBuffer PDF data as Uint8Array
 * @returns Hex string of the hash
 */
export async function hashPdfBuffer(pdfBuffer: Uint8Array): Promise<string> {
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Save the PDF (this normalizes the format)
  const pdfBytesNormalized = await pdfDoc.save();
  
  // Calculate SHA3-512 hash
  const hash = crypto.createHash('sha3-512');
  hash.update(pdfBytesNormalized);
  
  return hash.digest('hex');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: ts-node hash-pdf.ts <pdf-file>');
    process.exit(1);
  }
  
  const pdfPath = args[0];
  
  hashPdfWithoutAttachments(pdfPath)
    .then(hash => {
      console.log(`PDF SHA3-512 Hash: ${hash}`);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
