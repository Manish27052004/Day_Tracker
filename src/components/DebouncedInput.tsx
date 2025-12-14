import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface DebouncedInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Save-on-Blur Input Component
 * 
 * Provides instant local feedback with zero network requests while typing.
 * Only saves to database when user clicks away (onBlur).
 * 
 * Features:
 * - Local state for instant UI updates
 * - Zero lag while typing
 * - Single database save on blur (not every keystroke)
 * - Only saves if value actually changed
 */
export const DebouncedInput = ({
    value,
    onChange,
    placeholder,
    className
}: DebouncedInputProps) => {
    // Local state for instant feedback
    const [tempName, setTempName] = useState(value);

    // Sync local state when prop value changes (from external updates)
    useEffect(() => {
        setTempName(value);
    }, [value]);

    // Save to database only when clicking away
    const handleBlur = () => {
        // Only save if value actually changed
        if (tempName !== value) {
            onChange(tempName);
        }
    };

    return (
        <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={className}
        />
    );
};
