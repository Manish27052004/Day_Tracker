import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, eachDayOfInterval, parseISO, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { db, calculateDuration, getDateString } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

const categoryLabels: Record<string, string> = {
  'deep-focus': 'Deep Focus',
  'focus': 'Focus',
  'distracted': 'Distracted',
  'sleep': 'Sleep',
  'routine': 'Routine',
  'habits': 'Habits',
  'wasted-time': 'Wasted Time',
};

const AnalyticsChart = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['deep-focus', 'focus']);
  const [goalHours, setGoalHours] = useState(5);

  const allSessions = useLiveQuery(() => db.sessions.toArray());

  const chartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to || !allSessions) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map((day) => {
      const dateString = getDateString(day);
      const daySessions = allSessions.filter(
        (s) => s.date === dateString && selectedCategories.includes(s.category)
      );

      const totalMinutes = daySessions.reduce((acc, session) => {
        return acc + calculateDuration(session.startTime, session.endTime);
      }, 0);

      const hours = totalMinutes / 60;

      return {
        date: format(day, 'MMM dd'),
        hours: Math.round(hours * 100) / 100,
        exceedsGoal: hours >= goalHours,
      };
    });
  }, [allSessions, dateRange, selectedCategories, goalHours]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const allCategories = Object.keys(categoryLabels);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Controls */}
      <div className="notion-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
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
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Goal */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Goal:</span>
            <Input
              type="number"
              value={goalHours}
              onChange={(e) => setGoalHours(Number(e.target.value))}
              className="w-20 h-9"
              min={0}
              step={0.5}
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mt-4">
          <span className="text-sm font-medium text-muted-foreground mb-2 block">Categories:</span>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleCategory(category)}
                className="text-xs"
              >
                {categoryLabels[category]}
              </Button>
            ))}
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
        <h3 className="text-lg font-semibold mb-4">Daily Progress</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                label={{
                  value: 'Hours',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'hsl(var(--muted-foreground))',
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-notion-hover">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-muted-foreground text-sm">
                          {payload[0].value} hours
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={goalHours}
                stroke="hsl(var(--danger))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Goal: ${goalHours}h`,
                  position: 'right',
                  fill: 'hsl(var(--danger))',
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="hours"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.exceedsGoal ? 'hsl(var(--success))' : 'hsl(var(--info))'}
                    className={entry.exceedsGoal ? 'glow-success' : ''}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsChart;
