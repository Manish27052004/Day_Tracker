import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface DebouncedTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
}

/**
 * Save-on-Blur Textarea Component
 * 
 * Same as DebouncedInput but for textarea fields.
 * Saves to database only on blur (clicking away).
 */
export const DebouncedTextarea = ({
    value,
    onChange,
    placeholder,
    className,
    rows = 1
}: DebouncedTextareaProps) => {
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleBlur = () => {
        if (tempValue !== value) {
            onChange(tempValue);
        }
    };

    return (
        <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={className}
            rows={rows}
        />
    );
};
