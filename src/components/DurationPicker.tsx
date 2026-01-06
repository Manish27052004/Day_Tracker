import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDuration } from '@/lib/db';
import { cn } from '@/lib/utils';

interface DurationPickerProps {
  value: number; // in minutes
  onChange: (minutes: number) => void;
  className?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59 minutes

const DurationPicker = ({ value, onChange, className }: DurationPickerProps) => {
  const [selectedHours, setSelectedHours] = useState(Math.floor(value / 60));
  const [selectedMinutes, setSelectedMinutes] = useState(value % 60);
  const [open, setOpen] = useState(false);

  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedHours(Math.floor(value / 60));
    setSelectedMinutes(value % 60);
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
    onChange(selectedHours * 60 + selectedMinutes);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-8 px-2 justify-start text-sm font-medium hover:bg-muted/50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {value > 0 ? formatDuration(value) : 'Set duration'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-3 pb-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Select Duration
          </div>

          {/* Scrollable Duration Picker */}
          <div className="flex items-center gap-2 mb-3">
            {/* Hours Column */}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
              <div
                ref={hourScrollRef}
                className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent border border-border rounded-md bg-muted/30"
              >
                <div className="py-12">
                  {hours.map((h) => (
                    <button
                      key={h}
                      data-selected={selectedHours === h}
                      onClick={() => setSelectedHours(h)}
                      className={cn(
                        "w-full py-1.5 text-center text-sm transition-colors",
                        selectedHours === h
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
              <div
                ref={minuteScrollRef}
                className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent border border-border rounded-md bg-muted/30"
              >
                <div className="py-12">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      data-selected={selectedMinutes === m}
                      onClick={() => setSelectedMinutes(m)}
                      className={cn(
                        "w-full py-1.5 text-center text-sm transition-colors",
                        selectedMinutes === m
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview & Confirm */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm font-medium">
              {formatDuration(selectedHours * 60 + selectedMinutes)}
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

export default DurationPicker;
