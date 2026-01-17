import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

declare global {
    interface Window {
        google: any;
    }
}

interface StorageContextType {
    isStorageConnected: boolean;
    storageEmail: string | null;
    connectStorage: () => void;
    disconnectStorage: () => void;
    getStorageToken: () => Promise<string | null>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [storageToken, setStorageToken] = useState<string | null>(null);
    const [storageEmail, setStorageEmail] = useState<string | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);

    // Load persisted state on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('storage_access_token');
        const storedEmail = localStorage.getItem('storage_email');
        const storedExpiry = localStorage.getItem('storage_token_expiry');

        if (storedToken && storedExpiry) {
            const now = Date.now();
            if (now < Number(storedExpiry)) {
                setStorageToken(storedToken);
                setStorageEmail(storedEmail);
            } else {
                // Token expired
                localStorage.removeItem('storage_access_token');
                localStorage.removeItem('storage_token_expiry');
                localStorage.removeItem('storage_email');
            }
        }
    }, []);

    // Initialize Google Identity Services Client
    useEffect(() => {
        const initializeGoogle = () => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE', // Fallback or env needed
                    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send',
                    callback: (response: any) => {
                        if (response.access_token) {
                            setStorageToken(response.access_token);
                            const expiresIn = response.expires_in || 3599;
                            const expiryTime = Date.now() + (expiresIn * 1000);

                            localStorage.setItem('storage_access_token', response.access_token);
                            localStorage.setItem('storage_token_expiry', String(expiryTime));

                            // Fetch user email for display
                            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${response.access_token}` }
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.email) {
                                        setStorageEmail(data.email);
                                        localStorage.setItem('storage_email', data.email);
                                        toast.success(`Storage connected: ${data.email}`);
                                    }
                                })
                                .catch(err => console.error("Failed to fetch storage user info", err));

                        } else {
                            toast.error("Failed to connect storage.");
                        }
                    },
                });
                setTokenClient(client);
            } else {
                // Retry if script not loaded yet
                setTimeout(initializeGoogle, 500);
            }
        };

        // Wait for script to load
        if (typeof window !== 'undefined') {
            initializeGoogle();
        }
    }, []);

    const connectStorage = () => {
        if (tokenClient) {
            // Request robust offline access if possible, but for GIS implicit flow we get access token directly
            // For long-term offline we might need 'access_type: offline' (code flow) but client-side JS flow is usually implicit.
            // But we can try asking for permission.
            // GIS initTokenClient uses implicit flow (token).
            tokenClient.requestAccessToken();
        } else {
            toast.error("Google Identity Services not initialized.");
        }
    };

    const disconnectStorage = () => {
        if (storageToken) {
            window.google?.accounts?.oauth2?.revoke(storageToken, () => {
                console.log('Token revoked');
            });
        }
        setStorageToken(null);
        setStorageEmail(null);
        localStorage.removeItem('storage_access_token');
        localStorage.removeItem('storage_token_expiry');
        localStorage.removeItem('storage_email');
        toast.info("Storage disconnected.");
    };

    const getStorageToken = async () => {
        // Simple check for expiry
        const storedExpiry = localStorage.getItem('storage_token_expiry');
        if (storedExpiry && Date.now() > Number(storedExpiry)) {
            // Token expired. We might need partial re-auth or use silent if possible? 
            // GIS doesn't do silent refresh easily without user interaction unless we use 'prompt: none' but that's for iframe.
            // For now, return null if expired, forcing UI to ask user to reconnect or we try prompts.
            // Let's return null to trigger re-connect prompt.
            disconnectStorage();
            return null;
        }
        return storageToken;
    };

    return (
        <StorageContext.Provider value={{
            isStorageConnected: !!storageToken,
            storageEmail,
            connectStorage,
            disconnectStorage,
            getStorageToken
        }}>
            {children}
        </StorageContext.Provider>
    );
};

export const useStorage = () => {
    const context = useContext(StorageContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
};
