'use server';

import 'dotenv/config';

/**
 * @fileOverview Flow for interacting with Google Drive using a Service Account.
 * This is used for backend operations like moving folders to trash.
 *
 * - trashKegiatanFolderFlow - Finds a specific 'kegiatan' folder within a 'bagian' folder and moves it to trash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from '../google-services';

const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID_HASIL;

const trashFolderInputSchema = z.object({
  namaBagian: z.string(),
  namaKegiatan: z.string(),
});

export type TrashFolderInput = z.infer<typeof trashFolderInputSchema>;


/**
 * Finds a folder by name within a specific parent folder.
 * @param drive - Authenticated Google Drive API client.
 * @param name - The name of the folder to find.
 * @param parentId - The ID of the parent folder.
 * @returns The ID of the found folder, or null if not found.
 */
async function findFolderInParent(drive: any, name: string, parentId: string): Promise<string | null> {
    if (!name || !parentId) return null;

    const folderNameToFind = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
    const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderNameToFind.replace(/'/g, "\\'")}' and trashed=false`;
    
    try {
        const res = await drive.files.list({
            q: q,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = res.data.files;
        if (files && files.length > 0) {
            console.log(`Found folder "${files[0].name}" with ID: ${files[0].id}`);
            return files[0].id;
        }
        console.log(`Folder "${name}" not found in parent ${parentId}.`);
        return null;
    } catch (error: any) {
        console.error(`Error finding folder "${name}" in parent ${parentId}:`, error.message);
        return null;
    }
}


export const trashKegiatanFolderFlow = ai.defineFlow(
  {
    name: 'trashKegiatanFolderFlow',
    inputSchema: trashFolderInputSchema,
    outputSchema: z.object({
      status: z.string(),
      message: z.string(),
    }),
  },
  async ({ namaBagian, namaKegiatan }) => {
    if (!ROOT_FOLDER_ID) {
      throw new Error("ID Folder Induk Google Drive (NEXT_PUBLIC_DRIVE_FOLDER_ID_HASIL) belum diatur.");
    }
    if (!namaBagian || !namaKegiatan) {
        return { status: 'skipped', message: 'Nama bagian atau kegiatan tidak disediakan.'};
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/drive']);
    const drive = google.drive({ version: 'v3', auth });

    try {
      // 1. Find 'Bagian' folder
      const bagianFolderId = await findFolderInParent(drive, namaBagian.toUpperCase(), ROOT_FOLDER_ID);
      if (!bagianFolderId) {
        return { status: 'not_found', message: `Folder Bagian '${namaBagian.toUpperCase()}' tidak ditemukan.` };
      }

      // 2. Find 'Kegiatan' folder inside 'Bagian' folder
      const kegiatanFolderId = await findFolderInParent(drive, namaKegiatan, bagianFolderId);
      if (!kegiatanFolderId) {
        return { status: 'not_found', message: `Folder Kegiatan '${namaKegiatan}' tidak ditemukan di dalam '${namaBagian.toUpperCase()}'.` };
      }

      // 3. Move the folder to trash
      await drive.files.update({
        fileId: kegiatanFolderId,
        requestBody: {
          trashed: true,
        },
        supportsAllDrives: true,
      });

      console.log(`Successfully moved folder ${kegiatanFolderId} ('${namaKegiatan}') to trash.`);
      return { status: 'success', message: `Folder '${namaKegiatan}' telah dipindahkan ke Sampah.` };

    } catch (error: any) {
        console.error("Failed to trash Google Drive folder:", error);
        let message = `Gagal memindahkan folder ke Sampah: ${error.message}`;
        if (error.code === 403) {
            message = "Gagal memindahkan folder: Service Account tidak memiliki izin yang cukup. Pastikan Service Account memiliki peran 'Manager' (Pengelola Konten) di folder induk atau Drive Bersama.";
        } else if (error.code === 404) {
            message = "Gagal memindahkan folder: Folder tidak ditemukan. Mungkin sudah dihapus atau dipindahkan.";
        }
       throw new Error(message);
    }
  }
);

export async function trashKegiatanFolder(input: TrashFolderInput): Promise<{ status: string, message: string }> {
    return trashKegiatanFolderFlow(input);
}
