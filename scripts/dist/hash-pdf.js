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
exports.hashPdfWithoutAttachments = hashPdfWithoutAttachments;
exports.hashPdfBuffer = hashPdfBuffer;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const pdf_lib_1 = require("pdf-lib");
/**
 * Calculate SHA3-512 hash of PDF content (excluding attachments)
 * @param pdfPath Path to the PDF file
 * @returns Hex string of the hash
 */
async function hashPdfWithoutAttachments(pdfPath) {
    // Read the PDF file
    const pdfBytes = fs.readFileSync(pdfPath);
    // Load the PDF document
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBytes);
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
async function hashPdfBuffer(pdfBuffer) {
    // Load the PDF document
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
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
