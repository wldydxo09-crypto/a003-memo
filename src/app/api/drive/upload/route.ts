import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/googleAuth';
import { Readable } from 'stream';

// POST: Upload image to Google Drive
export async function POST(request: NextRequest) {
    try {
        // Get tokens from cookies
        const accessToken = request.cookies.get('google_access_token')?.value;
        const refreshToken = request.cookies.get('google_refresh_token')?.value;

        if (!accessToken) {
            return NextResponse.json({
                success: false,
                error: 'Google 인증이 필요합니다.',
                needAuth: true
            }, { status: 401 });
        }

        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            return NextResponse.json({
                success: false,
                error: 'OAuth 클라이언트 설정 오류'
            }, { status: 500 });
        }

        oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        // Parse FormData
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({
                success: false,
                error: '파일이 없습니다.'
            }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Initialize Google Drive API
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // Check/Create app folder
        let folderId = await getOrCreateFolder(drive, 'SmartWorkMemo');

        // Upload file to Drive
        const response = await drive.files.create({
            requestBody: {
                name: `${Date.now()}_${file.name}`,
                parents: [folderId],
            },
            media: {
                mimeType: file.type,
                body: Readable.from(buffer),
            },
            fields: 'id, webViewLink, webContentLink',
        });

        // Make file publicly accessible (for display)
        await drive.permissions.create({
            fileId: response.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get direct image URL
        const imageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;

        return NextResponse.json({
            success: true,
            fileId: response.data.id,
            url: imageUrl,
            webViewLink: response.data.webViewLink
        });

    } catch (error: any) {
        console.error('Drive upload error:', error);

        // Handle token expiry
        if (error.code === 401 || error.message?.includes('invalid_grant')) {
            return NextResponse.json({
                success: false,
                error: 'Google 인증이 만료되었습니다. 다시 로그인해주세요.',
                needAuth: true
            }, { status: 401 });
        }

        return NextResponse.json({
            success: false,
            error: error.message || '업로드 실패'
        }, { status: 500 });
    }
}

// Helper: Get or create a folder in Drive
async function getOrCreateFolder(drive: any, folderName: string): Promise<string> {
    // Check if folder exists
    const response = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
    });

    return folder.data.id;
}
