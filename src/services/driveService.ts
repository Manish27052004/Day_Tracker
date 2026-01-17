import { supabase } from '@/lib/supabase';

const FOLDER_NAME = 'TimeTracker_Data';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

/**
 * Service to handle interactions with Google Drive API
 */
export const driveService = {

    /**
     * Gets the current Google Access Token from the Supabase Session.
     * Note: This relies on the provider_token being present. 
     * If 'access_type: offline' was used, we might have a provider_refresh_token too, 
     * but Supabase's client often exposes the current valid access token in the session object 
     * if properly configured, OR we might need to handle token refresh manually if Supabase doesn't auto-refresh the *provider* token.
     * 
     * For now, we assume the session contains a valid provider_token. 
     */
    async getAccessToken(): Promise<string | null> {
        // PRIORITY: Secondary Storage Token
        const storageToken = localStorage.getItem('storage_access_token');
        const expiry = localStorage.getItem('storage_token_expiry');
        if (storageToken && expiry && Date.now() < Number(expiry)) {
            return storageToken;
        }

        // FALLBACK: Main Supabase Provider Token (Legacy/Backup)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
            return session.provider_token;
        }

        return null;
    },

    /**
     * Finds or creates the app-specific folder in Drive.
     */
    async getOrCreateFolder(accessToken: string): Promise<string | null> {
        // 1. Search for folder
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false&fields=files(id, name)`;

        try {
            const response = await fetch(searchUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json();

            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }

            // 2. Create folder if not found
            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            const folderData = await createResponse.json();
            return folderData.id;

        } catch (error) {
            console.error("Error finding/creating Drive folder:", error);
            return null;
        }
    },

    /**
     * Uploads a file to Google Drive and returns the view link.
     */
    async uploadFile(file: File): Promise<{ url: string, id: string, name: string } | null> {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            throw new Error("Authentication required: Please sign out and sign in again to enable Drive access.");
        }

        const folderId = await this.getOrCreateFolder(accessToken);
        if (!folderId) {
            throw new Error("Failed to access 'TimeTracker_Data' folder in Drive.");
        }

        // Metadata
        const metadata = {
            name: file.name,
            parents: [folderId],
            // description: 'Uploaded via Time Tracker' 
        };

        // Multipart upload form data
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        try {
            const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink';

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    // Content-Type is set automatically by fetch with FormData
                },
                body: form
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Drive Upload Failed: ${errorText}`);
            }

            const data = await response.json();

            // By default, files created by drive.file scope are only visible to the app.
            // If we want the user to simply view them via link in standard browser, it works because they are the owner.
            // But if we want to embed them as images <img src="...">, standard webViewLink might generally require checks.
            // However, webContentLink (download link) works for <img> tags usually if auth isn't an issue or if we proxy.
            // A clearer way for "Embedding" images is usually `thumbnailLink` (sometimes creates large ones) or `webContentLink`.

            return {
                id: data.id,
                name: data.name,
                url: data.webContentLink || data.webViewLink // webContentLink is better for direct embedding if public, but for private owner access, webViewLink opens in new tab perfectly.
            };

        } catch (error) {
            console.error("Drive upload error:", error);
            return null;
        }
    }
};
