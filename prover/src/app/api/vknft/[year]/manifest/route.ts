import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * API Route: GET /api/vknft/[year]/manifest
 * 
 * Returns manifest.json for a specific year
 */
export async function GET(
  request: Request,
  { params }: { params: { year: string } }
) {
  try {
    const year = parseInt(params.year, 10);
    
    if (isNaN(year) || year < 2000 || year > 2050) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid year' 
      }, { status: 400 });
    }
    
    // VKNFTディレクトリはプロジェクトルートの2階層上
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const manifestPath = path.join(vknftPath, params.year, 'manifest.json');
    
    console.log(`[VKNFT API] Reading manifest for year ${year}:`, manifestPath);
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      return NextResponse.json({ 
        success: true, 
        manifest 
      });
    } catch (error) {
      console.error(`[VKNFT API] Failed to read manifest for year ${year}:`, error);
      return NextResponse.json({ 
        success: false, 
        error: 'Manifest not found' 
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

