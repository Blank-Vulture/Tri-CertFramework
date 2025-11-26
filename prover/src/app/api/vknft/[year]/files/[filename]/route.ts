import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * API Route: GET /api/vknft/[year]/files/[filename]
 * 
 * Returns a specific file (wasm, zkey, or vkey.json) for a year
 */
export async function GET(
  request: Request,
  { params }: { params: { year: string; filename: string } }
) {
  try {
    const year = parseInt(params.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2050) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid year' 
      }, { status: 400 });
    }
    
    // Only allow specific file types for security
    const filename = params.filename;
    const allowedExtensions = ['.wasm', '.zkey', '.json'];
    const ext = path.extname(filename);
    
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type' 
      }, { status: 400 });
    }
    
    // Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid filename' 
      }, { status: 400 });
    }
    
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const filePath = path.join(vknftPath, params.year, 'files', filename);
    
    console.log(`[VKNFT API] Reading file for year ${year}:`, filePath);
    
    try {
      const fileContent = await fs.readFile(filePath);
      
      // Set appropriate content type
      let contentType = 'application/octet-stream';
      if (ext === '.wasm') {
        contentType = 'application/wasm';
      } else if (ext === '.json') {
        contentType = 'application/json';
      } else if (ext === '.zkey') {
        contentType = 'application/octet-stream';
      }
      
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error(`[VKNFT API] Failed to read file ${filename} for year ${year}:`, error);
      return NextResponse.json({ 
        success: false, 
        error: 'File not found' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('[VKNFT API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

