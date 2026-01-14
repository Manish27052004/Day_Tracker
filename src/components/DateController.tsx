import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DateControllerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DateController = ({ selectedDate, onDateChange }: DateControllerProps) => {
  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));

  return (
    <motion.div
      className="flex items-center justify-center gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevDay}
        className="h-9 w-9 rounded-full hover:bg-accent transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent transition-all font-medium"
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-base whitespace-nowrap">
              {format(selectedDate, 'EEE, dd MMM')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-border shadow-notion-hover" align="center">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextDay}
        className="h-9 w-9 rounded-full hover:bg-accent transition-colors"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};

export default DateController;
