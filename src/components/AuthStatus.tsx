import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const AuthStatus = () => {
    const { user, signInWithGoogle, signOut, loading } = useAuth();

    if (loading) {
        return <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />;
    }

    if (user) {
        return (
            <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {user.user_metadata?.full_name || 'User'}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="flex items-center gap-2"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                </Button>
            </div>
        );
    }

    return (
        <Button
            variant="default"
            size="sm"
            onClick={signInWithGoogle}
            className="flex items-center gap-2"
        >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
        </Button>
    );
};

export default AuthStatus;
