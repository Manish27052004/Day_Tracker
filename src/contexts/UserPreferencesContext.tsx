import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface UserPreferencesContextType {
    dayStartHour: number;
    setDayStartHour: (hour: number) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [dayStartHour, setDayStartHourState] = useState<number>(() => {
        const saved = localStorage.getItem('dayStartHour');
        return saved ? parseInt(saved, 10) : 0;
    });

    // 1. Fetch from DB on mount/user change
    useEffect(() => {
        const fetchPreferences = async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('day_start_hour')
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid 406 if multiple profiles (should handle better but okay for now)

            if (data && data.day_start_hour !== undefined && data.day_start_hour !== null) {
                // Only update if different to avoid potential loops or flickers
                setDayStartHourState((current) => {
                    if (current !== data.day_start_hour) {
                        localStorage.setItem('dayStartHour', data.day_start_hour.toString());
                        return data.day_start_hour;
                    }
                    return current;
                });
            }
        };

        fetchPreferences();
    }, [user]);

    // 2. Custom Setter to Sync to DB
    const setDayStartHour = async (hour: number) => {
        // Update Local
        setDayStartHourState(hour);
        localStorage.setItem('dayStartHour', hour.toString());

        // Update DB
        if (user) {
            // Upsert or Update Profile
            // We assume a profile exists, but if not we might need to create it?
            // User likely has a profile if they are logged in via app logic
            const { error } = await supabase
                .from('profiles')
                .update({ day_start_hour: hour })
                .eq('user_id', user.id);

            if (error) console.error("Failed to sync start hour:", error);
        }
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
