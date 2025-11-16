
import 'dotenv/config'
import { google } from 'googleapis';
import { getGoogleAuth } from '@/ai/google-services';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  const { fileId } = params;

  if (!fileId) {
    return new NextResponse('File ID is required', { status: 400 });
  }

  try {
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/drive.readonly']);
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'arraybuffer' }
    );
    
    // Determine content type from metadata if possible
    const metadataRes = await drive.files.get({
        fileId: fileId,
        fields: 'mimeType',
        supportsAllDrives: true,
    });

    const mimeType = metadataRes.data.mimeType || 'image/jpeg';
    const imageBuffer = Buffer.from(fileRes.data as any);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error(`Error fetching file ${fileId} from Google Drive:`, error);
    let errorMessage = "Gagal mengambil file dari Google Drive.";
    if (error.code === 404) {
        errorMessage = "File tidak ditemukan.";
    } else if (error.code === 403) {
        errorMessage = "Tidak ada izin untuk mengakses file ini.";
    }
    
    // Return a placeholder or error image
    return new NextResponse(errorMessage, { status: error.code || 500 });
  }
}
