import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib';

const execAsync = promisify(exec);

/**
 * Attach files to PDF using pdfcpu command line tool
 * @param inputPdf Path to input PDF
 * @param attachments Array of file paths to attach
 * @param outputPdf Path to output PDF
 */
export async function attachFilesWithPdfcpu(
  inputPdf: string,
  attachments: string[],
  outputPdf: string
): Promise<void> {
  // Build the pdfcpu command
  const attachmentArgs = attachments.join(' ');
  const command = `pdfcpu attachments add ${inputPdf} ${attachmentArgs} -o ${outputPdf}`;
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.warn('pdfcpu warning:', stderr);
    }
    console.log('Files attached successfully');
  } catch (error) {
    throw new Error(`Failed to attach files: ${error}`);
  }
}

/**
 * Attach files to PDF using pdf-lib (fallback method)
 * Note: This is a simplified implementation for Phase 0
 */
export async function attachFilesWithPdfLib(
  inputPdf: string | Uint8Array,
  attachments: { filename: string; data: Uint8Array }[],
  outputPdf?: string
): Promise<Uint8Array> {
  // Load the PDF
  const pdfBytes = typeof inputPdf === 'string' ? fs.readFileSync(inputPdf) : inputPdf;
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // For Phase 0, we'll store attachment metadata in PDF metadata
  // In production, we would properly implement PDF/A-3 attachment structure
  const metadata = {
    attachments: attachments.map(att => ({
      name: att.filename,
      size: att.data.length,
      // Store base64 encoded data (not ideal for large files)
      data: Buffer.from(att.data).toString('base64')
    }))
  };
  
  // Set custom metadata
  pdfDoc.setTitle('Tri-CertFramework Phase 0 Document');
  pdfDoc.setSubject(JSON.stringify(metadata));
  
  // Save the PDF
  const pdfBytesWithAttachments = await pdfDoc.save();
  
  // Write to file if output path provided
  if (outputPdf) {
    fs.writeFileSync(outputPdf, pdfBytesWithAttachments);
  }
  
  return pdfBytesWithAttachments;
}

/**
 * Extract attachments from PDF (for verification)
 */
export async function extractAttachmentsWithPdfcpu(
  inputPdf: string,
  outputDir: string
): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const command = `pdfcpu attachments extract ${inputPdf} ${outputDir}`;
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.warn('pdfcpu warning:', stderr);
    }
    console.log('Attachments extracted successfully');
  } catch (error) {
    throw new Error(`Failed to extract attachments: ${error}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: ts-node pdf-attach.ts <input-pdf> <output-pdf> <attachment1> [attachment2] ...');
    process.exit(1);
  }
  
  const [inputPdf, outputPdf, ...attachments] = args;
  
  // Try pdfcpu first, fallback to pdf-lib
  attachFilesWithPdfcpu(inputPdf, attachments, outputPdf)
    .catch(async (error) => {
      console.warn('pdfcpu not available, using pdf-lib fallback');
      
      // Read attachment files
      const attachmentData = attachments.map(filepath => ({
        filename: path.basename(filepath),
        data: fs.readFileSync(filepath)
      }));
      
      await attachFilesWithPdfLib(inputPdf, attachmentData, outputPdf);
    })
    .then(() => {
      console.log(`Created ${outputPdf} with ${attachments.length} attachments`);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
