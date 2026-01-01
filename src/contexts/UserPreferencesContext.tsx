import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserPreferencesContextType {
    dayStartHour: number;
    setDayStartHour: (hour: number) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const [dayStartHour, setDayStartHour] = useState<number>(() => {
        const saved = localStorage.getItem('dayStartHour');
        return saved ? parseInt(saved, 10) : 0;
    });

    useEffect(() => {
        localStorage.setItem('dayStartHour', dayStartHour.toString());
    }, [dayStartHour]);

    return (
        <UserPreferencesContext.Provider value={{ dayStartHour, setDayStartHour }}>
            {children}
        </UserPreferencesContext.Provider>
    );
};

export const useUserPreferences = () => {
    const context = useContext(UserPreferencesContext);
    if (context === undefined) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
};
