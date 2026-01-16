import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  ComposedChart,
  Line,
  LabelList,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  calculateDuration,
  formatDuration
} from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, Archive, BarChart3, LineChart, Activity, Maximize2, Minimize2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  fetchAnalyticsData,
  fetchAllCategories,
  fetchAllCategoryTypes,
  fetchGoals,
  AnalyticsSession,
  AnalyticsCategory,
  AnalyticsCategoryType,
  AnalyticsGoal
} from '@/services/analyticsService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';
import GoalSettingsDialog from './GoalSettingsDialog';

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

const AnalyticsChart = () => {
  const { user } = useAuth();
  const { dayStartHour } = useUserPreferences();
  const [isMaximized, setIsMaximized] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    to: new Date(),
  });

  const [viewMode, setViewMode] = useState<'type' | 'category'>(() => {
    return (localStorage.getItem('analytics_view_mode') as 'type' | 'category') || 'category';
  });

  const [chartType, setChartType] = useState<'bar' | 'area' | 'line'>(() => {
    return (localStorage.getItem('analytics_chart_type') as 'bar' | 'area' | 'line') || 'bar';
  });

  const [dbCategories, setDbCategories] = useState<AnalyticsCategory[]>([]);
  const [dbTypes, setDbTypes] = useState<AnalyticsCategoryType[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]); // IDs of selected categories/types
  const [goals, setGoals] = useState<AnalyticsGoal[]>([]);

  const [showArchived, setShowArchived] = useState(() => {
    return localStorage.getItem('analytics_show_archived') === 'true';
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('analytics_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('analytics_chart_type', chartType);
  }, [chartType]);

  useEffect(() => {
    localStorage.setItem('analytics_show_archived', String(showArchived));
  }, [showArchived]);

  // Computed: Selected Names (to handle duplicates by name in Legend/Logic)
  // Placeholder - Removed as we will define selectedNames correctly after displayCategories


  // Data State
  const [sessions, setSessions] = useState<AnalyticsSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Initial Load of Categories (Active & Inactive)
  useEffect(() => {
    if (!user) return;
    const loadMetadata = async () => {
      try {
        const [cats, types, existingGoals] = await Promise.all([
          fetchAllCategories(user.id),
          fetchAllCategoryTypes(user.id),
          fetchGoals(user.id)
        ]);

        setGoals(existingGoals);

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

        setDbCategories(finalCats);
        setDbTypes(types);

        // Load persisted selection or Select all by default
        const persistedSelection = localStorage.getItem(`analytics_selected_ids_${viewMode}`);

        if (persistedSelection) {
          try {
            setSelectedIds(JSON.parse(persistedSelection));
          } catch (e) {
            // Fallback to select all if parse fails
            if (viewMode === 'category') {
              setSelectedIds(finalCats.map(c => c.id));
            } else {
              setSelectedIds(types.map(t => t.id));
            }
          }
        } else {
          // Default: Select all
          if (viewMode === 'category') {
            setSelectedIds(finalCats.map(c => c.id));
          } else {
            setSelectedIds(types.map(t => t.id));
          }
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
        const data = await fetchAnalyticsData(user.id, dateRange.from!, dateRange.to!, dayStartHour);
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [user, dateRange, dayStartHour]);


  // DYNAMIC CATEGORY RESOLUTION
  // Merge DB Categories with "Ghost" Categories found in historical data
  const { displayCategories, displayTypes } = useMemo(() => {
    // 1. Start with known DB items
    const catMap = new Map<string, AnalyticsCategory>();
    dbCategories.forEach(c => catMap.set(c.name.trim(), c));

    const typeMap = new Map<string, AnalyticsCategoryType>();
    dbTypes.forEach(t => typeMap.set(t.name.trim(), t));

    // 2. Scan sessions for unknown names AND track usage
    const usedCategoryNames = new Set<string>();
    const usedTypeNames = new Set<string>();

    sessions.forEach(s => {
      const catName = (s.category || '').trim();
      const typeName = (s.category_type || 'Uncategorized').trim();

      if (!catName) return;

      usedCategoryNames.add(catName);
      usedTypeNames.add(typeName);

      // Category Check
      if (!catMap.has(catName)) {
        // ... (Ghost creation logic remains same)
        const ghostId = -Math.abs(catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) - 1000;
        catMap.set(catName, {
          id: ghostId,
          name: catName,
          type: typeName,
          color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
          is_active: false
        });
      }

      // Type Check
      if (!typeMap.has(typeName)) {
        const ghostTypeId = -Math.abs(typeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) - 2000;
        typeMap.set(typeName, {
          id: ghostTypeId,
          name: typeName,
          is_active: false
        });
      }
    });

    // 3. Filter out Inactive categories that are NOT used
    // Active categories are always kept (so you can select them even if 0 data)
    // Archived/Ghost categories are only kept if they exist in the current session set
    const finalCategories = Array.from(catMap.values()).filter(c => c.is_active || usedCategoryNames.has(c.name));
    const finalTypes = Array.from(typeMap.values()).filter(t => t.is_active || usedTypeNames.has(t.name));

    return {
      displayCategories: finalCategories,
      displayTypes: finalTypes
    };
  }, [sessions, dbCategories, dbTypes]);

  // TRANSFORM DATA
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map(day => {
      const dateStr = format(day, 'MMM dd');
      const daySessions = sessions.filter(s => isSameDay(new Date(s.date), day));

      // Base object
      const dataPoint: any = { date: dateStr };

      // Aggregate
      let totalDuration = 0;
      let absoluteTotal = 0;
      daySessions.forEach(session => {
        const duration = calculateDuration(session.start_time, session.end_time) / 60; // Hours
        absoluteTotal += duration;

        let key = '';
        if (viewMode === 'category') {
          key = (session.category || '').trim();
        } else {
          key = (session.category_type || 'Uncategorized').trim();
        }

        if (!key) return; // Skip if no key

        if (!dataPoint[key]) dataPoint[key] = 0;
        dataPoint[key] += duration;
      });

      // Post-process: Zero out unselected keys for animation
      // We need to ensure ALL available keys are present in dataPoint with at least 0
      const allKeys = viewMode === 'category'
        ? displayCategories.map(c => c.name)
        : displayTypes.map(t => t.name);

      // Inline selectedNames logic here or define before
      const currentSelectedNames = new Set(
        (viewMode === 'category' ? displayCategories : displayTypes)
          .filter(item => selectedIds.includes(item.id))
          .map(item => item.name)
      );

      allKeys.forEach(key => {
        if (!dataPoint[key]) dataPoint[key] = 0;

        // If NOT selected (by checking if the Name is in the selected set), force to 0
        if (!currentSelectedNames.has(key)) {
          dataPoint[key] = 0;
        } else {
          // If selected, add to total
          totalDuration += dataPoint[key];
        }
      });

      // Add Total for Summary Line
      dataPoint._totalDuration = totalDuration;
      dataPoint._absoluteTotal = absoluteTotal; // Stable total for domain calculation

      // Round values
      Object.keys(dataPoint).forEach(k => {
        if (k !== 'date' && k !== '_absoluteTotal') dataPoint[k] = Math.round(dataPoint[k] * 100) / 100;
      });

      return dataPoint;
    });
  }, [sessions, dateRange, viewMode, selectedIds, displayCategories, displayTypes]);

  // Computed: Selected Names (to handle duplicates by name in Legend/Logic) - DEFINED AFTER displayCategories
  // This is used for the Legend rendering below
  const selectedNames = useMemo(() => {
    const source = viewMode === 'category' ? displayCategories : displayTypes;
    return new Set(
      source
        .filter(item => selectedIds.includes(item.id))
        .map(item => item.name)
    );
  }, [viewMode, displayCategories, displayTypes, selectedIds]);

  // Get Active Keys for the Chart (to render <Bar /> components)
  // DEDUPLICATE by Name to avoid Double-Counting/Stacking visual bugs if multiple categories have same name
  const renderedKeys = useMemo(() => {
    const source = viewMode === 'category' ? displayCategories : displayTypes;
    return source.filter(item => selectedIds.includes(item.id));
  }, [displayCategories, displayTypes, viewMode, selectedIds]);


  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Persist selected IDs
  useEffect(() => {
    if (selectedIds.length > 0) {
      localStorage.setItem(`analytics_selected_ids_${viewMode}`, JSON.stringify(selectedIds));
    }
  }, [selectedIds, viewMode]);

  const toggleAll = () => {
    const allIds = viewMode === 'category'
      ? displayCategories.filter(c => showArchived || c.is_active).map(c => c.id)
      : displayTypes.filter(t => showArchived || t.is_active).map(t => t.id);

    // Check if ALL VISIBLE are selected
    const allVisibleSelected = allIds.every(id => selectedIds.includes(id));

    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      // Select all visible (merge with existing to not lose hidden ones if that was a use case, but usually "Select All" means what I see)
      // Actually user probably wants to reset to JUST these.
      setSelectedIds(allIds);
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

  const isMobile = useIsMobile();

  // Dynamic Height Logic
  const PIXELS_PER_HOUR = 60;
  const MIN_DISPLAY_HOURS = 10;
  // Reduce viewport on mobile to prevent scroll locking the whole page
  const VIEW_PORT_HOURS = isMobile ? 8 : 12;

  // Find the maximum value in the current dataset
  const maxSessionDuration = useMemo(() => {
    if (chartData.length === 0) return 0;
    // For Line charts (non-stacked), max is max single category. For Bar/Area (stacked), max is total.
    if (chartType === 'line') {
      // Find max single key value
      return Math.max(...chartData.map(d => {
        const keys = Object.keys(d).filter(k => k !== 'date' && k !== '_totalDuration' && k !== '_absoluteTotal');
        if (keys.length === 0) return 0;
        return Math.max(...keys.map(k => (d[k] as number)));
      }));
    }
    return Math.max(...chartData.map(d => (d._absoluteTotal || 0)));
  }, [chartData, chartType]);

  // Dynamic Domain: At least MIN_DISPLAY_HOURS, scale with data up to 24
  const domainMax = Math.min(24, Math.max(MIN_DISPLAY_HOURS, Math.ceil(maxSessionDuration * 1.1))); // +10% headroom

  const TOTAL_HEIGHT = domainMax * PIXELS_PER_HOUR;
  const MAX_VIEW_HEIGHT = VIEW_PORT_HOURS * PIXELS_PER_HOUR;

  // MAXIMIZED: Use window height - padding. NORMAL: Use Viewport calculation.
  const containerHeight = isMaximized ? 'calc(100vh - 200px)' : `${MAX_VIEW_HEIGHT}px`;

  // Generate ticks based on dynamic domain
  const yTicks = Array.from({ length: domainMax + 1 }, (_, i) => i);

  // Auto-scroll logic (scroll to bottom to show 0-axis context if overflowing)
  useEffect(() => {
    if (!isMaximized && scrollContainerRef.current && TOTAL_HEIGHT > MAX_VIEW_HEIGHT) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [chartData, TOTAL_HEIGHT, MAX_VIEW_HEIGHT, isMaximized]);

  // WRAPPER CLASS for Maximize Mode
  const containerClass = isMaximized
    ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 sm:p-8 flex flex-col animate-in fade-in duration-200"
    : "bg-card p-6 rounded-xl border shadow-sm transition-all duration-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={isMaximized ? "" : "space-y-6"}
    >
      {/* CONTROLS HEADER (Hidden if Maximized) */}
      {!isMaximized && (
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">

          {/* 1. Date Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[240px] w-full md:w-auto justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
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

            {/* Goal Settings Button */}
            <div className="w-full sm:w-auto">
              <GoalSettingsDialog
                analyticsCategories={displayCategories}
                analyticsTypes={displayTypes}
                onGoalsUpdated={setGoals}
              />
            </div>
          </div>

          {/* 2. Grouped Toggles: View Mode & Chart Type */}
          <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
            {/* Chart Type Toggle */}
            <div className="flex bg-muted p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => { setChartType('bar'); }}
                title="Bar Chart (Volume)"
                className={cn("flex-1 px-3 py-1.5 rounded-md transition-all flex items-center justify-center", chartType === 'bar' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('line'); }}
                title="Line Chart (Trends)"
                className={cn("flex-1 px-3 py-1.5 rounded-md transition-all flex items-center justify-center", chartType === 'line' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LineChart className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setChartType('area'); }}
                title="Area Chart (Flow)"
                className={cn("flex-1 px-3 py-1.5 rounded-md transition-all flex items-center justify-center", chartType === 'area' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <Activity className="h-4 w-4" />
              </button>
            </div>

            <div className="flex bg-muted p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => { setViewMode('category'); }}
                className={cn("flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === 'category' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                By Subcategory
              </button>
              <button
                onClick={() => { setViewMode('type'); }}
                className={cn("flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all", viewMode === 'type' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                By Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS SECTION (Hidden if Maximized) */}
      {!isMaximized && (
        <div className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter Data
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-6 w-6 ml-2", showArchived ? "text-primary bg-primary/10" : "text-muted-foreground")}
                onClick={() => setShowArchived(!showArchived)}
                title={showArchived ? "Hide Archived" : "Show Archived"}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleAll} className="h-8 text-xs">
              {selectedIds.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
            {/* Active Items */}
            {(viewMode === 'category' ? displayCategories : displayTypes)
              .filter(item => item.is_active)
              .map((item) => (
                <Button
                  key={item.id}
                  variant={selectedIds.includes(item.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    "text-xs h-7 transition-all",
                    selectedIds.includes(item.id)
                      ? "ring-1 ring-offset-1 ring-primary/20"
                      : "opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
                  )}
                  style={selectedIds.includes(item.id) ? {
                    backgroundColor: getColorVar(item.color),
                    borderColor: getColorVar(item.color),
                    color: 'white' // Assuming dark/colored bg
                  } : {}}
                >
                  {item.name}
                </Button>
              ))}

            {/* Archived Items Separator */}
            {showArchived && (viewMode === 'category' ? displayCategories : displayTypes).some(item => !item.is_active) && (
              <div className="w-full h-px bg-border my-1" />
            )}

            {/* Archived Items */}
            {showArchived && (viewMode === 'category' ? displayCategories : displayTypes)
              .filter(item => !item.is_active)
              .map((item) => (
                <Button
                  key={item.id}
                  variant={selectedIds.includes(item.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    "text-xs h-7 transition-all opacity-60 hover:opacity-100",
                    selectedIds.includes(item.id)
                      ? "ring-1 ring-offset-1 ring-primary/20"
                      : "grayscale"
                  )}
                  style={selectedIds.includes(item.id) ? {
                    backgroundColor: getColorVar(item.color),
                    borderColor: getColorVar(item.color),
                    color: 'white'
                  } : {}}
                >
                  {item.name}
                  <span className="ml-1.5 text-[10px] opacity-60">(Archived)</span>
                </Button>
              ))}
          </div>
        </div>
      )}

      {/* CHART SECTION */}
      <div className={containerClass}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Productivity Trends
            {loading && <span className="text-xs font-normal text-muted-foreground animate-pulse ml-2">Loading data...</span>}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="hover:bg-muted"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Scrollable Container Wrapper */}
        <div
          ref={scrollContainerRef}
          className="w-full relative overflow-y-auto border-b border-border/50 flex-1"
          style={{ maxHeight: containerHeight }}
        >
          <div className="w-full overflow-x-auto pb-4 h-full">
            <div style={{ minWidth: `${minWidth}px`, height: `${TOTAL_HEIGHT}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barGap={2}
                >
                  <defs>
                    {/* Define gradients for each visible key */}
                    {renderedKeys.map((item) => {
                      const color = getColorVar(item.color);
                      const gradId = `gradient-${item.id}`;
                      return (
                        <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>

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
                      if (name === '_totalDuration' || value === 0) return [null, null];
                      return [formatYAxis(value), name];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))' }}
                    itemStyle={{ padding: 0 }}
                    filterNull={true}
                  />

                  {/* Rendering based on chartType */}
                  {chartType === 'bar' && renderedKeys.map((item) => (
                    <Bar
                      key={item.id}
                      dataKey={item.name}
                      stackId="a"
                      fill={getColorVar(item.color)}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={80}
                      name={item.name}
                      animationDuration={500}
                    />
                  ))}

                  {chartType === 'area' && renderedKeys.map((item) => (
                    <Area
                      key={item.id}
                      type="monotone"
                      dataKey={item.name}
                      stackId="a"
                      fill={`url(#gradient-${item.id})`}
                      stroke={getColorVar(item.color)}
                      fillOpacity={1}
                      name={item.name}
                      animationDuration={500}
                    />
                  ))}

                  {chartType === 'line' && renderedKeys.map((item) => (
                    <Line
                      key={item.id}
                      type="monotone"
                      dataKey={item.name}
                      stroke={getColorVar(item.color)}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                      name={item.name}
                      animationDuration={500}
                    />
                  ))}


                  {/* Invisible Line for Total labels (Only for Stacked Charts) */}
                  {(chartType === 'bar' || chartType === 'area') && (
                    <Line
                      type="monotone"
                      dataKey="_totalDuration"
                      stroke="none"
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={500}
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
                  )}

                  {/* Render Goals */}
                  {goals
                    .filter(g => {
                      // Find if the goal's category name corresponds to any SELECTED ID
                      const relatedCat = displayCategories.find(c => c.name === g.category_key);
                      return relatedCat && selectedIds.includes(relatedCat.id);
                    }) // Only show goals for visible categories
                    .map(goal => (
                      <ReferenceLine
                        key={goal.id}
                        y={goal.target_hours}
                        stroke={goal.color}
                        strokeDasharray="3 3"
                        strokeWidth={2}
                        label={{
                          value: `${goal.label} (${formatDuration(Math.round(goal.target_hours * 60))})`,
                          position: 'insideBottomLeft',
                          fill: goal.color,
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      />
                    ))
                  }
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Custom Legend - Fixed at Bottom */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
          {renderedKeys.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-full transition-colors duration-300",
                  chartType === 'line' ? "w-4 h-1 rounded-sm" : "w-3 h-3"
                )}
                style={{
                  // Check if ANY item with this name is selected (since this is the Legend from unique keys)
                  backgroundColor: selectedNames.has(item.name) ? getColorVar(item.color) : 'hsl(var(--muted))'
                }}
              />
              <span className={cn(
                "text-sm font-medium transition-colors duration-300",
                selectedNames.has(item.name) ? "text-muted-foreground" : "text-muted-foreground/50"
              )}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnalyticsChart;
