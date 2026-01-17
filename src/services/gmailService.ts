import { supabase } from '@/lib/supabase';
import { getDateString } from '@/lib/db';

const SCOPES = 'https://www.googleapis.com/auth/gmail.send';

export const gmailService = {

    async getAccessToken(): Promise<string | null> {
        // PRIORITY: Secondary Storage Token (Includes Gmail Scope)
        const storageToken = localStorage.getItem('storage_access_token');
        const expiry = localStorage.getItem('storage_token_expiry');
        if (storageToken && expiry && Date.now() < Number(expiry)) {
            return storageToken;
        }

        // FALLBACK: Main Supabase Provider Token
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
            return session.provider_token;
        }

        console.warn("No Google access token found for Gmail.");
        return null;
    },

    async sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
        const accessToken = await this.getAccessToken();
        if (!accessToken) throw new Error("Authentication required for Gmail access.");

        // Construct raw MIME message
        const utf8Subject = `=?utf-8?B?${btoa(subject)}?=`;
        const messageParts = [
            `From: "Daily Tracker" <${to}>`,
            `To: ${to}`,
            `Subject: ${utf8Subject}`,
            "MIME-Version: 1.0",
            "Content-Type: text/html; charset=utf-8",
            "Content-Transfer-Encoding: 7bit",
            "",
            htmlBody
        ];
        const message = messageParts.join("\n");

        // Encode the message to base64url
        const encodedMessage = btoa(message)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: encodedMessage
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gmail API Error: ${error}`);
            }

            return true;
        } catch (error) {
            console.error("Failed to send email:", error);
            return false;
        }
    },

    async generateAndSendDailyReport(date: Date, userEmail: string): Promise<boolean> {
        const dateStr = getDateString(date);

        // Fetch sessions for the day
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select(`
                *,
                tasks (name)
            `)
            .eq('date', dateStr)
            .order('start_time');

        if (error || !sessions) {
            throw new Error("Failed to fetch sessions for report.");
        }

        // Build HTML Body
        let html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Daily Tracking Report</h1>
                <p><strong>Date:</strong> ${dateStr}</p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Time</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Activity</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Category</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Media</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sessions.forEach(session => {
            const name = session.custom_name || session.tasks?.name || 'Unnamed Session';

            // Check for Drive links in rich content
            let mediaIndicator = '-';
            if (session.rich_content) {
                // Heuristic to check if Drive Link exists in JSON string
                // BlockNote often saves links in a specific structure, but simple regex works for "has link"
                if (session.rich_content.includes('drive.google.com')) {
                    mediaIndicator = '&#128206; Attachments'; // Paperclip
                } else if (session.rich_content.length > 50) {
                    mediaIndicator = '&#128221; Notes'; // Notepad
                }
            }

            html += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${session.start_time} - ${session.end_time}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${session.category || ''}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${mediaIndicator}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 30px; font-size: 12px; color: #888;">Generated by Daily Tracker App</p>
            </div>
        `;

        return this.sendEmail(userEmail, `Daily Report: ${dateStr}`, html);
    }
};
