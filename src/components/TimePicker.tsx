import { useState, useEffect, useRef, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, useSpring, useMotionValue, useTransform, animate } from 'framer-motion';

interface TimePickerProps {
  value: string; // HH:mm format
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
}

// --- CONSTANTS & HELPERS ---
const CLOCK_SIZE = 256;
const CENTER = CLOCK_SIZE / 2;
const RADIUS = CLOCK_SIZE / 2 - 32;

const formatTime = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) hour24 += 12;
  if (period === 'AM' && hour === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string) => {
  if (!timeStr) {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: hour12, minute: m, period: period as 'AM' | 'PM' };
  }
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour: hour12, minute: m, period: period as 'AM' | 'PM' };
};

const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const { hour, minute, period } = parseTime(time);
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
};

// --- COMPONENT ---
const TimePicker = ({ value, onChange, className, placeholder = 'Select time' }: TimePickerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');

  // Internal form state - Initialize from value prop or current time
  const [tempHour, setTempHour] = useState(() => {
    if (value) {
      const p = parseTime(value);
      return p.hour;
    }
    // Fix: Default to current hour to prevent "9 AM default" glitch
    const h = new Date().getHours();
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });
  const [tempMinute, setTempMinute] = useState(() => {
    if (value) {
      const p = parseTime(value);
      return p.minute;
    }
    return new Date().getMinutes();
  });
  const [tempPeriod, setTempPeriod] = useState<'AM' | 'PM'>(() => {
    if (value) {
      const p = parseTime(value);
      return p.period;
    }
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  });

  // Motion Values for smooth rotation
  const rotateMv = useMotionValue(0);
  // Spring physics for snapping effect
  const smoothRotate = useSpring(rotateMv, { stiffness: 300, damping: 30 });

  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync internal state whenever value prop changes (even when closed)
  useEffect(() => {
    const p = parseTime(value);
    setTempHour(p.hour);
    setTempMinute(p.minute);
    setTempPeriod(p.period);
    // Update rotation angle to match
    const initialAngle = p.hour * 30;
    rotateMv.set(initialAngle);
  }, [value]); // Runs whenever parent passes new value

  // Additional sync when opening (for switching to hours mode)
  useEffect(() => {
    if (open) {
      setMode('hours');
      // Ensure rotation is synced when opening
      const p = parseTime(value);
      const initialAngle = p.hour * 30;
      rotateMv.set(initialAngle);
    }
  }, [open]);

  // Update rotation when mode or value changes programmatically (e.g. switching views)
  useEffect(() => {
    if (!isDragging) {
      let target = 0;
      if (mode === 'hours') target = tempHour * 30;
      else target = tempMinute * 6;

      // Handle 360/0 wrap-around visually if needed, but for clock usually absolute is fine
      // except for 12->1 transition. Simple approach:
      animate(rotateMv, target, { type: "spring", stiffness: 300, damping: 30 });
    }
  }, [mode, tempHour, tempMinute, isDragging]);


  const handleConfirm = () => {
    onChange(formatTime(tempHour, tempMinute, tempPeriod));
    setOpen(false);
  };

  // Calculate angle from center
  const calculateAngle = (clientX: number, clientY: number) => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const x = clientX - rect.left - CENTER;
    const y = clientY - rect.top - CENTER;
    let angleRad = Math.atan2(y, x);
    let angleDeg = (angleRad * 180 / Math.PI) + 90;
    if (angleDeg < 0) angleDeg += 360;
    return angleDeg;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);

    const angle = calculateAngle(e.clientX, e.clientY);
    rotateMv.set(angle); // Instant follow on touch start
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const angle = calculateAngle(e.clientX, e.clientY);
    rotateMv.set(angle); // Free flow dragging
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const rawAngle = calculateAngle(e.clientX, e.clientY);

    // Haptics
    if (navigator.vibrate) navigator.vibrate(10);

    // Snap Logic
    if (mode === 'hours') {
      let h = Math.round(rawAngle / 30);
      if (h === 0) h = 12;
      if (h > 12) h -= 12;
      setTempHour(h);
      // Auto-switch to minutes
      setTimeout(() => setMode('minutes'), 400);
    } else {
      let m = Math.round(rawAngle / 6);
      if (m === 60) m = 0;
      setTempMinute(m);
    }
  };

  // Render Dial Numbers
  const renderFace = () => {
    const numbers = mode === 'hours'
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    // Minute dots logic can be added here if desired for 1,2,3,4 etc.
    // For standard Material 3, just the main numbers are usually sufficient unless zooming.

    return numbers.map((num, i) => {
      // Logic to position
      // Hours: 12 is at -90deg (if starting from 3oclock) -> standard logic x=cos(a), y=sin(a)
      // num * 30deg. 12*30 = 360 = 0.
      const val = mode === 'hours' ? num : num / 5; // 0-11 index effectively
      const angleDeg = mode === 'hours' ? num * 30 : num * 6;
      const angleRad = (angleDeg - 90) * (Math.PI / 180);

      const x = CENTER + RADIUS * Math.cos(angleRad);
      const y = CENTER + RADIUS * Math.sin(angleRad);

      const isSelected = mode === 'hours' ? tempHour === num : tempMinute === num;

      return (
        <motion.div
          key={num}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.02 }} // Staggered entry
          className={cn(
            "absolute flex items-center justify-center w-8 h-8 -ml-4 -mt-4 rounded-full text-sm font-medium select-none pointer-events-none transition-colors duration-200",
            isSelected ? "text-primary-foreground font-bold" : "text-foreground"
          )}
          style={{ left: x, top: y }}
        >
          {mode === 'hours' ? num : num.toString().padStart(2, '0')}
        </motion.div>
      );
    });
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
      <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-[1.5rem] overflow-hidden" align="start">
        <div className="flex flex-col bg-card w-[320px]">

          {/* HEADER: Material 3 Style */}
          <div className="bg-muted/30 p-6 flex flex-col items-center justify-center gap-4 pb-6 border-b border-border/10">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Select Time</div>

            <div className="flex items-center gap-4">
              {/* Time Display */}
              <div className="flex items-baseline bg-muted/50 rounded-xl p-2 px-4 border border-border/20">
                <button
                  onClick={() => setMode('hours')}
                  className={cn(
                    "text-5xl font-light tabular-nums transition-all outline-none rounded px-2",
                    mode === 'hours' ? "text-primary scale-110 font-normal" : "text-muted-foreground hover:text-foreground opacity-50"
                  )}
                >
                  {tempHour.toString().padStart(2, '0')}
                </button>
                <span className="text-5xl font-light text-muted-foreground pb-2 opacity-30">:</span>
                <button
                  onClick={() => setMode('minutes')}
                  className={cn(
                    "text-5xl font-light tabular-nums transition-all outline-none rounded px-2",
                    mode === 'minutes' ? "text-primary scale-110 font-normal" : "text-muted-foreground hover:text-foreground opacity-50"
                  )}
                >
                  {tempMinute.toString().padStart(2, '0')}
                </button>
              </div>

              {/* AM/PM Vertical Toggle */}
              <div className="flex flex-col border border-border/20 rounded-lg overflow-hidden bg-muted/50">
                <button
                  onClick={() => setTempPeriod('AM')}
                  className={cn(
                    "px-3 py-2 text-xs font-bold transition-colors",
                    tempPeriod === 'AM' ? "bg-primary/20 text-primary" : "hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  AM
                </button>
                <div className="h-px w-full bg-border/20"></div>
                <button
                  onClick={() => setTempPeriod('PM')}
                  className={cn(
                    "px-3 py-2 text-xs font-bold transition-colors",
                    tempPeriod === 'PM' ? "bg-primary/20 text-primary" : "hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* BODY: Interactive Dial */}
          <div className="p-6 flex justify-center items-center bg-card relative">
            <div
              ref={dialRef}
              className="relative bg-muted/10 rounded-full touch-none cursor-pointer select-none border border-border/20 shadow-inner"
              style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Static Minute Ticks (Subtle) */}
              {mode === 'minutes' && Array.from({ length: 60 }).map((_, i) => i % 5 !== 0 && (
                <div key={i} className="absolute w-1 h-1 bg-muted-foreground/20 rounded-full"
                  style={{
                    left: CENTER + (RADIUS) * Math.cos((i * 6 - 90) * Math.PI / 180) - 2,
                    top: CENTER + (RADIUS) * Math.sin((i * 6 - 90) * Math.PI / 180) - 2
                  }}
                />
              ))}

              {/* Numbers */}
              {renderFace()}

              {/* Center Dot */}
              <div className="absolute left-1/2 top-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-primary pointer-events-none z-20 shadow-sm" />

              {/* The Revolving Hand */}
              <motion.div
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{ rotate: smoothRotate }}
              >
                <div className="absolute top-0 left-1/2 -ml-[1px] w-[2px] h-[50%] origin-bottom bg-primary"
                  style={{ height: RADIUS, top: CENTER - RADIUS }}
                ></div>
                <div className="absolute left-1/2 -ml-4 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shadow-sm backdrop-blur-[1px]"
                  style={{ top: CENTER - RADIUS - 16 }}
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center px-6 py-4 mt-auto border-t border-border/10 bg-muted/10">
            <Clock className="w-4 h-4 text-muted-foreground/50" />
            <div className="flex gap-3">
              <Button variant="ghost" className="h-9 px-4 text-primary hover:text-primary hover:bg-primary/10" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="h-9 px-6 rounded-full" onClick={handleConfirm}>OK</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;
