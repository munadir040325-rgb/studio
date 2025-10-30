'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface UseGoogleDriveAuthProps {
    folderId?: string;
}

interface UploadedFileLink {
    fileId: string;
    webViewLink: string;
    name: string;
    mimeType: string;
}

interface UploadResult {
    error?: string;
    links?: UploadedFileLink[];
    kegiatanFolderLink?: string;
}

interface SubfolderUpload {
    folderName: string;
    files: File[];
}

export const useGoogleDriveAuth = ({ folderId }: UseGoogleDriveAuthProps) => {
    const { toast } = useToast();
    const [isGisLoaded, setIsGisLoaded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tokenClient = useRef<any>(null);
    const accessTokenRef = useRef<string | null>(null);
    const scriptLoaded = useRef(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && !scriptLoaded.current) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => handleGisLoad();
            document.body.appendChild(script);
            scriptLoaded.current = true;
        }

        if (!API_KEY || !CLIENT_ID || !folderId) {
            const errorMsg = "Kredensial Google (API_KEY, CLIENT_ID, atau ID Folder) belum diatur di .env.";
            console.error(errorMsg);
            setError(errorMsg);
        }
    }, [folderId]);

    const handleGisLoad = useCallback(() => {
        if (!CLIENT_ID) return;
        try {
            const { google } = window as any;
            if (google?.accounts?.oauth2) {
                tokenClient.current = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: 'https://www.googleapis.com/auth/drive.file',
                    callback: '', // Handled in promise
                });
                setIsGisLoaded(true);
            } else {
                 throw new Error("Google Identity Services library tidak termuat.");
            }
        } catch (e: any) {
            console.error("GAPI load error:", e);
            setError(e.message);
        }
    }, []);

    const requestAccessToken = useCallback((): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (accessTokenRef.current) {
                return resolve(accessTokenRef.current);
            }

            const client = tokenClient.current;
            if (!client) {
                return reject(new Error("Google Identity client belum siap."));
            }

            client.callback = (resp: any) => {
                if (resp.error) {
                    reject(new Error(`Gagal mendapatkan izin: ${resp.error_description || resp.error}`));
                } else {
                    accessTokenRef.current = resp.access_token;
                    resolve(resp.access_token);
                }
            };
            client.requestAccessToken({ prompt: 'consent' });
        });
    }, []);
    
    const getOrCreateFolder = useCallback(async (name: string, parentId: string, token: string, isBagianFolder: boolean = false): Promise<string> => {
        // For 'bagian' folders, force UPPERCASE to ensure consistency.
        const folderNameToFind = isBagianFolder ? name.toUpperCase() : name;

        // Search for the folder. The Drive API's 'name' query is case-insensitive.
        const q = `'${parentId}' in parents and name='${folderNameToFind}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const body = await res.json();
        if (body.files && body.files.length > 0) {
            return body.files[0].id;
        }

        // If not found, create it with the consistent name.
        const metadata = { name: folderNameToFind, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] };
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata)
        });
        const createBody = await createRes.json();
        if (!createRes.ok) throw new Error(`Gagal membuat folder '${folderNameToFind}': ${createBody.error?.message}`);
        return createBody.id;
    }, []);


    const uploadFile = useCallback(async (file: File, targetFolderId: string, token: string): Promise<UploadedFileLink> => {
        const metadata = { name: file.name, parents: [targetFolderId] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name,mimeType', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: form,
        });

        const body = await res.json();
        if (!res.ok) {
            throw new Error(`Gagal mengunggah ${file.name}: ${body.error?.message}`);
        }
        
        // Make file public
        await fetch(`https://www.googleapis.com/drive/v3/files/${body.id}/permissions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        });

        return body;
    }, []);

    // Deprecated - no longer used
    const authorizeAndUpload = async (file: File, bagian: string, kegiatan: string): Promise<UploadResult> => {
        return { error: 'This function is deprecated.' };
    };
    
    // Advanced version for post-event subfolder structure
    const uploadToSubfolders = async (bagian: string, kegiatan: string, subfolders: SubfolderUpload[]): Promise<UploadResult> => {
        setIsUploading(true);
        let allUploadedLinks: UploadedFileLink[] = [];

        try {
            if (!folderId) throw new Error("Root folder ID is not configured.");
            const token = await requestAccessToken();
            
            // Pass true for 'isBagianFolder' to trigger the UPPERCASE logic
            const bagianFolderId = await getOrCreateFolder(bagian, folderId, token, true);
            const kegiatanFolderId = await getOrCreateFolder(kegiatan, bagianFolderId, token);

            for (const sub of subfolders) {
                const subFolderId = await getOrCreateFolder(sub.folderName, kegiatanFolderId, token);
                const uploadPromises = sub.files.map(file => uploadFile(file, subFolderId, token));
                const uploadedLinks = await Promise.all(uploadPromises);
                allUploadedLinks.push(...uploadedLinks);
            }

            const kegiatanFolderLinkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${kegiatanFolderId}?fields=webViewLink`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const linkBody = await kegiatanFolderLinkRes.json();
            if (!linkBody.webViewLink) throw new Error("Gagal mendapatkan link folder kegiatan.");

            return { 
                kegiatanFolderLink: linkBody.webViewLink,
                links: allUploadedLinks
            };

        } catch (e: any) {
            return { error: e.message };
        } finally {
            setIsUploading(false);
        }
    };


    return {
        isReady: isGisLoaded && !error,
        isUploading,
        error,
        requestAccessToken,
        authorizeAndUpload, // Kept for compatibility, but deprecated
        uploadToSubfolders,
    };
};
