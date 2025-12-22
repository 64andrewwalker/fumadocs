import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Serve images from content/docs/images at /docs/images/
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const imagePath = path.join('/');

    // Look for image in content/docs/images
    const fullPath = join(process.cwd(), 'content/docs/images', imagePath);

    if (!existsSync(fullPath)) {
        console.log(`Image not found: ${fullPath}`);
        return new NextResponse('Image not found', { status: 404 });
    }

    try {
        const imageBuffer = readFileSync(fullPath);

        // Determine content type from extension
        const ext = imagePath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
        };

        const contentType = contentTypes[ext || ''] || 'application/octet-stream';

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error reading image:', error);
        return new NextResponse('Error reading image', { status: 500 });
    }
}
