import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, eachDayOfInterval, subDays } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { db, calculateDuration, getDateString } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const AnalyticsChart = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch data
  const allSessions = useLiveQuery(() => db.sessions.toArray());
  const allCategories = useLiveQuery(() => db.categories.orderBy('order').toArray());

  // Initialize selected categories to all available once loaded
  useEffect(() => {
    if (allCategories && selectedCategories.length === 0) {
      setSelectedCategories(allCategories.map(c => c.name));
    }
  }, [allCategories]); // Only run when allCategories loads/changes

  const chartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to || !allSessions) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map((day) => {
      const dateString = getDateString(day);

      const daySessions = allSessions.filter((s) => {
        if (!s.category) return false;
        // Check date match
        if (s.date !== dateString) return false;
        // Check category match
        return selectedCategories.includes(s.category);
      });

      const totalMinutes = daySessions.reduce((acc, session) => {
        return acc + calculateDuration(session.startTime, session.endTime);
      }, 0);

      const hours = totalMinutes / 60;

      return {
        date: format(day, 'MMM dd'),
        hours: Math.round(hours * 100) / 100, // Keep 2 decimals for precision, but visual might differ
        originalDate: day // Store for tooltip if needed
      };
    });
  }, [allSessions, dateRange, selectedCategories]);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) {
        return prev.filter((c) => c !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  const isAllSelected = allCategories?.length === selectedCategories.length;

  const toggleAllCategories = () => {
    if (!allCategories) return;
    if (isAllSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCategories.map(c => c.name));
    }
  };

  const hasData = chartData.some(d => d.hours > 0);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Controls */}
      <div className="notion-card p-4">
        <div className="flex flex-col gap-4">

          {/* Top Row: Date Range */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal min-w-[240px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      <>
                        {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                      </>
                    ) : (
                      'Pick dates'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Category Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Categories:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllCategories}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {allCategories?.map((category) => {
                const isSelected = selectedCategories.includes(category.name);
                // Use category color if available, or fallback
                // We'll style the active state based on selection
                return (
                  <Button
                    key={category.id}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategory(category.name)}
                    className={cn(
                      "text-xs transition-all border-transparent",
                      isSelected
                        ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <motion.div
        className="notion-card p-6"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold mb-6">Daily Progress</h3>

        {!hasData ? (
          <div className="h-[400px] flex items-center justify-center flex-col text-muted-foreground gap-2">
            <div className="p-4 rounded-full bg-muted/30">
              <CalendarIcon className="w-8 h-8 opacity-50" />
            </div>
            <p>No activity recorded for this period</p>
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                  domain={[0, 'auto']}
                  label={{
                    value: 'Hours',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 12,
                    offset: 10
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0].value as number;
                      // Convert decimal hours back to h m
                      let h = Math.floor(value);
                      let m = Math.round((value - h) * 60);
                      if (m === 60) {
                        h += 1;
                        m = 0;
                      }

                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-notion-hover">
                          <p className="font-medium text-sm mb-1">{label}</p>
                          <p className="text-primary text-sm font-semibold">
                            {h}h {m}m
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsChart;
