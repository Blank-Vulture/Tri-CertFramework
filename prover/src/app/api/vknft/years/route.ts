import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

/**
 * API Route: GET /api/vknft/years
 * 
 * Returns list of available graduation years from VKNFT directory
 */
export async function GET() {
  try {
    // VKNFTディレクトリはプロジェクトルートの2階層上
    // prover/ -> Tri-CertFramework/ -> VKNFT/
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    
    console.log('[VKNFT API] Checking VKNFT directory:', vknftPath);
    
    // Check if VKNFT directory exists
    try {
      await fs.access(vknftPath);
    } catch {
      console.warn('[VKNFT API] VKNFT directory not found:', vknftPath);
      return NextResponse.json({ 
        success: false, 
        error: 'VKNFT directory not found',
        years: [] 
      }, { status: 404 });
    }
    
    // Read all subdirectories (year folders)
    const entries = await fs.readdir(vknftPath, { withFileTypes: true });
    const years: number[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const yearStr = entry.name;
        const year = parseInt(yearStr, 10);
        
        // Validate it's a 4-digit year
        if (!isNaN(year) && year >= 2000 && year <= 2050) {
          // Check if manifest.json exists
          const manifestPath = path.join(vknftPath, yearStr, 'manifest.json');
          try {
            await fs.access(manifestPath);
            years.push(year);
            console.log(`[VKNFT API] Found valid year: ${year}`);
          } catch {
            console.log(`[VKNFT API] Skipping ${year}: no manifest.json`);
          }
        }
      }
    }
    
    // Sort years
    years.sort((a, b) => a - b);
    
    console.log('[VKNFT API] Available years:', years);
    
    return NextResponse.json({ 
      success: true, 
      years 
    });
  } catch (error) {
    console.error('[VKNFT API] Error reading VKNFT directory:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      years: [] 
    }, { status: 500 });
  }
}
