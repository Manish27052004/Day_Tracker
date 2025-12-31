
import React from 'react';
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DateFilterProps {
    range: { from: Date; to: Date };
    onChange: (range: { from: Date; to: Date }) => void;
    className?: string;
}

const DateFilter: React.FC<DateFilterProps> = ({ range, onChange, className }) => {
    // Internal state for the calendar to allow selecting start then end
    // However, since the parent holds the state, we can just defer to parent.
    // But react-day-picker's `mode="range"` expects `DateRange` object { from, to }

    const date: DateRange = {
        from: range.from,
        to: range.to,
    };

    const handleSelect = (newDate: DateRange | undefined) => {
        if (newDate?.from) {
            onChange({
                from: newDate.from,
                to: newDate.to || newDate.from // if only start selected, end = start temporarily
            });
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleSelect}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default DateFilter;
