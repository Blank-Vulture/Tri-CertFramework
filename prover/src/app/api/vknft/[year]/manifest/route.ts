import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  try {
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const entries = await fs.readdir(vknftPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !isNaN(parseInt(e.name, 10)))
      .map(e => ({ year: e.name }));
  } catch (error) {
    console.warn('Error generating static params for VKNFT manifests:', error);
    return [];
  }
}

/**
 * API Route: GET /api/vknft/[year]/manifest
 * 
 * Returns manifest.json for a specific year
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ year: string }> }
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
    
    // VKNFTディレクトリはプロジェクトルートの2階層上
    const vknftPath = path.join(process.cwd(), '..', 'VKNFT');
    const manifestPath = path.join(vknftPath, params.year, 'manifest.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);
      
      return NextResponse.json({ 
        success: true, 
        manifest 
      });
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Manifest not found' 
      }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
