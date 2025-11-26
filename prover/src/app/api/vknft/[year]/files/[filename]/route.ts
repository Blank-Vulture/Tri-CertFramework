import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  try {
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const yearEntries = await fs.readdir(vknftPath, { withFileTypes: true });
    const params = [];
    
    for (const yearEntry of yearEntries) {
      if (yearEntry.isDirectory() && !isNaN(parseInt(yearEntry.name, 10))) {
        const year = yearEntry.name;
        const filesPath = path.join(vknftPath, year, 'files');
        try {
          const files = await fs.readdir(filesPath);
          for (const file of files) {
            const ext = path.extname(file);
            if (['.wasm', '.zkey', '.json'].includes(ext)) {
              params.push({ year, filename: file });
            }
          }
        } catch {
          // ignore if files directory doesn't exist or other error
        }
      }
    }
    return params;
  } catch (error) {
    console.warn('Error generating static params for VKNFT files:', error);
    return [];
  }
}

/**
 * API Route: GET /api/vknft/[year]/files/[filename]
 * 
 * Returns a specific file (wasm, zkey, or vkey.json) for a year
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ year: string; filename: string }> }
) {
  try {
    const params = await context.params;
    const year = parseInt(params.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2050) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid year' 
      }, { status: 400 });
    }
    
    // Strict filename validation to prevent path traversal attacks
    const filename = params.filename;
    
    // Use path.basename to extract only the filename part
    const sanitizedFilename = path.basename(filename);
    
    // Reject if basename differs from original (indicates traversal attempt)
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid filename' 
      }, { status: 400 });
    }
    
    // Strict pattern: only alphanumeric, underscore, hyphen, and dot allowed
    // Must match patterns like: commitment_2024.wasm, vkey_2024.json, commitment_final_2024.zkey
    const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.(wasm|zkey|json)$/;
    if (!SAFE_FILENAME_PATTERN.test(sanitizedFilename)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid filename format' 
      }, { status: 400 });
    }
    
    // Additional check: prevent directory traversal characters
    if (sanitizedFilename.includes('..') || sanitizedFilename.includes('/') || sanitizedFilename.includes('\\')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid filename' 
      }, { status: 400 });
    }
    
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const filePath = path.join(vknftPath, params.year, 'files', sanitizedFilename);
    
    // Verify the resolved path is within the expected directory
    const resolvedPath = path.resolve(filePath);
    const expectedBasePath = path.resolve(path.join(vknftPath, params.year, 'files'));
    if (!resolvedPath.startsWith(expectedBasePath)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file path' 
      }, { status: 400 });
    }
    
    try {
      const fileContent = await fs.readFile(resolvedPath);
      
      // Set appropriate content type based on extension
      const ext = path.extname(sanitizedFilename);
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
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'File not found' 
      }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
