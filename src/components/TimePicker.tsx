import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
}

const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59

const formatTime = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) hour24 += 12;
  if (period === 'AM' && hour === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

const TimePicker = ({ value, onChange, className, placeholder = 'Select time' }: TimePickerProps) => {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: 9, minute: 0, period: 'AM' as 'AM' | 'PM' };
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: hour12, minute: m, period: period as 'AM' | 'PM' };
  };

  const initial = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);
  const [open, setOpen] = useState(false);

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const parsed = parseTime(value);
      setSelectedHour(parsed.hour);
      setSelectedMinute(parsed.minute);
      setSelectedPeriod(parsed.period);
    }
  }, [value]);

  useEffect(() => {
    if (open) {
      // Scroll to selected values when popover opens
      setTimeout(() => {
        if (hourScrollRef.current) {
          const selectedElement = hourScrollRef.current.querySelector('[data-selected="true"]');
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        if (minuteScrollRef.current) {
          const selectedElement = minuteScrollRef.current.querySelector('[data-selected="true"]');
          if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 50);
    }
  }, [open]);

  const handleConfirm = () => {
    onChange(formatTime(selectedHour, selectedMinute, selectedPeriod));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 px-2 justify-start text-xs font-medium hover:bg-muted/50 min-w-[85px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">{value ? formatDisplayTime(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 pb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Select Time
          </div>

          {/* Scrollable Time Picker */}
          <div className="flex items-center gap-2 mb-3">
            {/* Hours Column */}
            <div
              ref={hourScrollRef}
              className="flex-1 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent border border-border rounded-md bg-muted/30"
            >
              <div className="py-12">
                {hours12.map((h) => (
                  <button
                    key={h}
                    data-selected={selectedHour === h}
                    onClick={() => setSelectedHour(h)}
                    className={cn(
                      "w-full py-1.5 text-center text-sm transition-colors",
                      selectedHour === h
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div
              ref={minuteScrollRef}
              className="flex-1 h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent border border-border rounded-md bg-muted/30"
            >
              <div className="py-12">
                {minutes.map((m) => (
                  <button
                    key={m}
                    data-selected={selectedMinute === m}
                    onClick={() => setSelectedMinute(m)}
                    className={cn(
                      "w-full py-1.5 text-center text-sm transition-colors",
                      selectedMinute === m
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM Column */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedPeriod('AM')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  selectedPeriod === 'AM'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                AM
              </button>
              <button
                onClick={() => setSelectedPeriod('PM')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  selectedPeriod === 'PM'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                PM
              </button>
            </div>
          </div>

          {/* Preview & Confirm */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">
              {formatDisplayTime(formatTime(selectedHour, selectedMinute, selectedPeriod))}
            </span>
            <Button size="sm" onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;
