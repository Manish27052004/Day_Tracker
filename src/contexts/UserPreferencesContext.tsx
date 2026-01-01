import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserPreferencesContextType {
    dayStartHour: number; // 0-23
    setDayStartHour: (hour: number) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dayStartHour, setDayStartHourState] = useState<number>(() => {
        const stored = localStorage.getItem('dayStartHour');
        return stored ? parseInt(stored, 10) : 0;
    });

    const setDayStartHour = (hour: number) => {
        setDayStartHourState(hour);
        localStorage.setItem('dayStartHour', hour.toString());
    };

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
