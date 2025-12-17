<<<<<<< HEAD
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, eachDayOfInterval, subDays } from 'date-fns';
import {
  AreaChart,
  Area,
=======
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  ComposedChart,
  Line,
  LabelList,
  Bar,
>>>>>>> new
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
<<<<<<< HEAD
=======
  Legend
>>>>>>> new
} from 'recharts';
import {
  calculateDuration,
  formatDuration
} from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';
<<<<<<< HEAD
import { cn } from '@/lib/utils';
=======
import { fetchAnalyticsData, fetchAllCategories, fetchAllCategoryTypes, AnalyticsSession, AnalyticsCategory, AnalyticsCategoryType } from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Helper to map DB colors to CSS variables for Recharts
const getColorVar = (dbColorClass: string | undefined): string => {
  if (!dbColorClass) return 'hsl(var(--primary))';
  if (dbColorClass.includes('danger')) return 'hsl(var(--danger))';
  if (dbColorClass.includes('success')) return 'hsl(var(--success))';
  if (dbColorClass.includes('info')) return 'hsl(var(--info))';
  if (dbColorClass.includes('warning')) return 'hsl(var(--warning))';
  if (dbColorClass.includes('purple')) return '#9333ea'; // No standard var for purple usually, hardcode or Custom
  if (dbColorClass.includes('indigo')) return '#6366f1'; // Indigo-500
  if (dbColorClass.includes('muted')) return 'hsl(var(--muted-foreground))';
  return 'hsl(var(--primary))';
};
>>>>>>> new

const AnalyticsChart = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    to: new Date(),
  });
<<<<<<< HEAD
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
=======

  const [viewMode, setViewMode] = useState<'type' | 'category'>('category');
  const [availableCategories, setAvailableCategories] = useState<AnalyticsCategory[]>([]);
  const [availableTypes, setAvailableTypes] = useState<AnalyticsCategoryType[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // IDs of selected categories/types
>>>>>>> new

  // Data State
  const [sessions, setSessions] = useState<AnalyticsSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Initial Load of Categories (Active & Inactive)
  useEffect(() => {
    if (!user) return;
    const loadMetadata = async () => {
      try {
        const [cats, types] = await Promise.all([
          fetchAllCategories(user.id),
          fetchAllCategoryTypes(user.id)
        ]);

        // Ensure "Sleep" category exists (it might be virtual)
        const hasSleep = cats.some(c => c.name === 'Sleep');
        let finalCats = cats;
        if (!hasSleep) {
          finalCats = [...cats, {
            id: -1, // Virtual ID
            name: 'Sleep',
            type: 'life', // Default to life
            color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', // Custom indigo color for sleep
            is_active: true
          }];
        }

        setAvailableCategories(finalCats);
        setAvailableTypes(types);

        // Select all by default
        if (viewMode === 'category') {
          setSelectedIds(finalCats.map(c => c.name));
        } else {
          setSelectedIds(types.map(t => t.name));
        }
      } catch (error) {
        console.error("Failed to load metadata", error);
      }
    };
    loadMetadata();
  }, [user, viewMode]);

  // Fetch Sessions when Date Range changes
  useEffect(() => {
    if (!user || !dateRange?.from || !dateRange?.to) return;

    const loadSessions = async () => {
      setLoading(true);
      try {
        const data = await fetchAnalyticsData(user.id, dateRange.from!, dateRange.to!);
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [user, dateRange]);


  // TRANSFORM DATA
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

<<<<<<< HEAD
    return days.map((day) => {
      const dateString = getDateString(day);

      const daySessions = allSessions.filter((s) => {
        if (!s.category) return false;
        // Check date match
        if (s.date !== dateString) return false;
        // Check category match
        return selectedCategories.includes(s.category);
      });
=======
    return days.map(day => {
      const dateStr = format(day, 'MMM dd');
      const daySessions = sessions.filter(s => isSameDay(new Date(s.date), day));
>>>>>>> new

      // Base object
      const dataPoint: any = { date: dateStr };

      // Aggregate
      let totalDuration = 0;
      daySessions.forEach(session => {
        const duration = calculateDuration(session.start_time, session.end_time) / 60; // Hours

<<<<<<< HEAD
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
=======
        let key = '';
        if (viewMode === 'category') {
          key = session.category;
        } else {
          key = session.category_type || 'Uncategorized';
        }

        // If this key is currently selected by user filter
        if (selectedIds.includes(key)) {
          dataPoint[key] = (dataPoint[key] || 0) + duration;
          totalDuration += duration;
        }
      });

      // Add Total for Summary Line
      dataPoint._totalDuration = totalDuration;

      // Round values
      Object.keys(dataPoint).forEach(k => {
        if (k !== 'date') dataPoint[k] = Math.round(dataPoint[k] * 100) / 100;
      });

      return dataPoint;
    });
  }, [sessions, dateRange, viewMode, selectedIds]);

  // Get Active Keys for the Chart (to render <Bar /> components)
  const activeKeys = useMemo(() => {
    // We only want to render Bars for items that appear in the data OR are selected.
    // Safer to iterate available metadata that is selected.
    if (viewMode === 'category') {
      return availableCategories.filter(c => selectedIds.includes(c.name));
    } else {
      return availableTypes.filter(t => selectedIds.includes(t.name));
    }
  }, [availableCategories, availableTypes, selectedIds, viewMode]);


  const toggleSelection = (name: string) => {
    setSelectedIds(prev =>
      prev.includes(name) ? prev.filter(id => id !== name) : [...prev, name]
    );
  };

  const toggleAll = () => {
    const allNames = viewMode === 'category'
      ? availableCategories.map(c => c.name)
      : availableTypes.map(t => t.name);

    if (selectedIds.length === allNames.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allNames);
    }
  };

  // Calculate dynamic width for horizontal scroll
  const minWidth = Math.max(100, (dateRange?.to && dateRange?.from ?
    (eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).length * 100) : 800)
  );

  const formatYAxis = (hours: number) => {
    if (hours === 0) return '0';
    return formatDuration(Math.round(hours * 60));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Height Logic
  const PIXELS_PER_HOUR = 50;

  // Find the maximum value in the current dataset
  const maxSessionDuration = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => (d._totalDuration || 0)));
  }, [chartData]);

  // If ANY day exceeds 16h, switch to 24h mode. Otherwise cap at 16h.
  const isOverflow = maxSessionDuration > 16;
  const domainMax = isOverflow ? 24 : 16;

  const TOTAL_HEIGHT = domainMax * PIXELS_PER_HOUR;
  const VIEW_HEIGHT = 16 * PIXELS_PER_HOUR; // Always show 16h worth of space (~800px)

  // Generate ticks based on dynamic domain
  const yTicks = Array.from({ length: domainMax + 1 }, (_, i) => i);

  // Auto-scroll to bottom on mount to show 0-16h range initially
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chartData]); // Run whenever data/height changes
>>>>>>> new

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
<<<<<<< HEAD
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
=======
      {/* CONTROLS HEADER */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-xl border shadow-sm">

        {/* 1. Date Picker */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 2. View Mode Toggle */}
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            onClick={() => { setViewMode('category'); }}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === 'category' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            By Subcategory
          </button>
          <button
            onClick={() => { setViewMode('type'); }}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === 'type' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            By Category
          </button>
        </div>
      </div>

      {/* FILTERS SECTION */}
      <div className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filter Data
          </div>
          <Button variant="ghost" size="sm" onClick={toggleAll} className="h-8 text-xs">
            {selectedIds.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
          {(viewMode === 'category' ? availableCategories : availableTypes).map((item) => (
            <Button
              key={item.id}
              variant={selectedIds.includes(item.name) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSelection(item.name)}
              className={cn(
                "text-xs h-7 transition-all",
                selectedIds.includes(item.name)
                  ? "ring-1 ring-offset-1 ring-primary/20"
                  : "opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
              )}
              style={selectedIds.includes(item.name) ? {
                backgroundColor: getColorVar(item.color),
                borderColor: getColorVar(item.color),
                color: 'white' // Assuming dark/colored bg
              } : {}}
            >
              {item.name}
              {!item.is_active && <span className="ml-1.5 text-[10px] opacity-60">(Archived)</span>}
            </Button>
          ))}
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="bg-card p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          Productivity Trends
          {loading && <span className="text-xs font-normal text-muted-foreground animate-pulse ml-2">Loading data...</span>}
        </h3>

        {/* Scrollable Container Wrapper */}
        <div
          ref={scrollContainerRef}
          className="w-full relative overflow-y-auto custom-scrollbar border-b border-border/50"
          style={{ maxHeight: `${VIEW_HEIGHT}px` }} // Show approx 16h vertical
        >
          <div className="w-full overflow-x-auto pb-4">
            <div style={{ minWidth: `${minWidth}px`, height: `${TOTAL_HEIGHT}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => Math.floor(val).toString()}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14 }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                    allowDecimals={false}
                    domain={[0, domainMax]}
                    ticks={yTicks}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    formatter={(value: number, name: string) => {
                      if (name === '_totalDuration') return [null, null];
                      return [formatYAxis(value), name];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                    itemStyle={{ padding: 0 }}
                    filterNull={true}
                  />

                  {/* Legend removed from here to place outside scroll area */}

                  {/* Dynamic Bars based on selection - Stacked */}
                  {activeKeys.map((item) => (
                    <Bar
                      key={item.id}
                      dataKey={item.name}
                      stackId="a"
                      fill={getColorVar(item.color)}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={80}
                      name={item.name}
                    />
                  ))}

                  {/* Invisible Line for Total Labels */}
                  <Line
                    type="monotone"
                    dataKey="_totalDuration"
                    stroke="none"
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  >
                    <LabelList
                      dataKey="_totalDuration"
                      position="top"
                      content={(props: any) => {
                        const { x, y, value } = props;
                        if (!value || value === 0) return null;
                        const pct = Math.round((value / 24) * 100);
                        return (
                          <text x={x} y={y - 10} fill="hsl(var(--foreground))" textAnchor="middle" fontSize={13} fontWeight={500}>
                            {formatYAxis(value)} ({pct}%)
                          </text>
                        );
                      }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Custom Legend - Fixed at Bottom */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
          {activeKeys.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getColorVar(item.color) }}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
>>>>>>> new
    </motion.div>
  );
};

export default AnalyticsChart;
