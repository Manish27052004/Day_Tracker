import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AuthFlow = 'login' | 'register';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithGoogle: (flow: AuthFlow) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSession = async (session: Session | null) => {
        if (!session?.user) {
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
        }

        // Logic to validate "Strict Auth"
        // 1. Check if we have a pending auth flow in local storage
        const pendingFlow = localStorage.getItem('auth_flow') as AuthFlow | null;

        // If no pending flow (e.g. strict refresh), we just respect the session unless logic demands otherwise.

        if (pendingFlow) {
            const user = session.user;
            const createdAt = new Date(user.created_at);
            const now = new Date();
            // User is "new" if created within the last 2 minutes
            const isNewUser = (now.getTime() - createdAt.getTime()) < 2 * 60 * 1000;

            if (pendingFlow === 'login') {
                if (isNewUser) {
                    // ERROR: User tried to LOGIN but didn't exist (until now)
                    console.warn("Strict Auth: New user attempted Login.");
                    await supabase.auth.signOut();
                    toast.error("Account does not exist. Please Sign Up first.");
                    localStorage.removeItem('auth_flow');
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                    return; // Stop processing
                }
                // Success: Old user logged in
            } else if (pendingFlow === 'register') {
                if (!isNewUser) {
                    // INFO: User tried to REGISTER but already exists
                    console.info("Strict Auth: Existing user attempted Register.");
                    toast.info("Account already exists. Logging you in...");
                }
                // Success: New user registered OR Old user let in
            }

            // Clean up
            localStorage.removeItem('auth_flow');
        }

        setSession(session);
        setUser(session.user);
        setLoading(false);
    };

    const signInWithGoogle = async (flow: AuthFlow) => {
        try {
            // Store the flow type to check after redirect
            localStorage.setItem('auth_flow', flow);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) {
                console.error('Error signing in with Google:', error.message);
                throw error;
            }
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Error signing out:', error.message);
                throw error;
            }
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
