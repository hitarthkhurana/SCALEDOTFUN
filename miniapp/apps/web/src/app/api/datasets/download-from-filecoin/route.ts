import { NextRequest, NextResponse } from 'next/server';
import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';

// Use same private key as uploads (from filecoin config)
const SYNAPSE_PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.SYNAPSE_PRIVATE_KEY;

export async function GET(request: NextRequest) {
  try {
    // Get CID from query params
    const searchParams = request.nextUrl.searchParams;
    const cid = searchParams.get('cid');
    const filename = searchParams.get('filename') || 'download';

    if (!cid) {
      return NextResponse.json(
        { error: 'Missing CID parameter' },
        { status: 400 }
      );
    }

    if (!SYNAPSE_PRIVATE_KEY) {
      console.error('❌ SYNAPSE_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log(`📥 Downloading file from Filecoin: ${cid}`);

    // Initialize Synapse with private key (backend only)
    const synapse = await Synapse.create({
      privateKey: SYNAPSE_PRIVATE_KEY,
      rpcURL: RPC_URLS.calibration.http,
    });

    // Download from Filecoin (tried and tested method!)
    const downloadStart = Date.now();
    const bytes = await synapse.storage.download(cid);
    const downloadTime = Date.now() - downloadStart;

    console.log(`✅ Downloaded ${bytes.length} bytes in ${downloadTime}ms`);

    // Detect content type from magic bytes
    let contentType = 'application/octet-stream';
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      contentType = 'image/jpeg';
    } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      contentType = 'image/png';
    } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      contentType = 'audio/wav';
    } else if (filename.endsWith('.json')) {
      contentType = 'application/json';
    }

    // Convert to Buffer for NextResponse
    const buffer = Buffer.from(bytes);

    // Return file with proper headers for download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Filecoin download error:', error);
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    );
  }
}

