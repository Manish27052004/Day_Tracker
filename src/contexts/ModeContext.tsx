import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AppMode = 'tracker' | 'attendance';

interface ModeContextType {
    mode: AppMode;
    toggleMode: () => void;
    setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
    const context = useContext(ModeContext);
    if (!context) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
};

interface ModeProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = 'app_mode_preference';

export function ModeProvider({ children }: ModeProviderProps) {
    // Initialize from localStorage or default to 'tracker'
    const [mode, setModeState] = useState<AppMode>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved === 'attendance' || saved === 'tracker') ? saved : 'tracker';
    });

    // Persist to localStorage whenever mode changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, mode);
    }, [mode]);

    const setMode = (newMode: AppMode) => {
        setModeState(newMode);
    };

    const toggleMode = () => {
        setModeState(prev => prev === 'tracker' ? 'attendance' : 'tracker');
    };

    const value = {
        mode,
        toggleMode,
        setMode
    };

    return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
