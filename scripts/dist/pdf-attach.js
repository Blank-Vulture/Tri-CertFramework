"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachFilesWithPdfcpu = attachFilesWithPdfcpu;
exports.attachFilesWithPdfLib = attachFilesWithPdfLib;
exports.extractAttachmentsWithPdfcpu = extractAttachmentsWithPdfcpu;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const pdf_lib_1 = require("pdf-lib");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Attach files to PDF using pdfcpu command line tool
 * @param inputPdf Path to input PDF
 * @param attachments Array of file paths to attach
 * @param outputPdf Path to output PDF
 */
async function attachFilesWithPdfcpu(inputPdf, attachments, outputPdf) {
    // Build the pdfcpu command
    const attachmentArgs = attachments.join(' ');
    const command = `pdfcpu attachments add ${inputPdf} ${attachmentArgs} -o ${outputPdf}`;
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            console.warn('pdfcpu warning:', stderr);
        }
        console.log('Files attached successfully');
    }
    catch (error) {
        throw new Error(`Failed to attach files: ${error}`);
    }
}
/**
 * Attach files to PDF using pdf-lib (fallback method)
 * Note: This is a simplified implementation for Phase 0
 */
async function attachFilesWithPdfLib(inputPdf, attachments, outputPdf) {
    // Load the PDF
    const pdfBytes = typeof inputPdf === 'string' ? fs.readFileSync(inputPdf) : inputPdf;
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBytes);
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
async function extractAttachmentsWithPdfcpu(inputPdf, outputDir) {
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
    }
    catch (error) {
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
