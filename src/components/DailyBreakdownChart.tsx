import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { db, calculateDuration, formatDuration, getDateString } from '@/lib/db';

interface DailyBreakdownChartProps {
  selectedDate: Date;
}

const categoryColors: Record<string, string> = {
  'deep-focus': 'hsl(142, 70%, 45%)',
  'focus': 'hsl(215, 85%, 55%)',
  'distracted': 'hsl(38, 95%, 55%)',
  'sleep': 'hsl(250, 60%, 65%)',
  'routine': 'hsl(30, 8%, 55%)',
  'habits': 'hsl(160, 60%, 45%)',
  'wasted-time': 'hsl(0, 72%, 55%)',
};

const categoryLabels: Record<string, string> = {
  'deep-focus': 'Deep Focus',
  'focus': 'Focus',
  'distracted': 'Distracted',
  'sleep': 'Sleep',
  'routine': 'Routine',
  'habits': 'Habits',
  'wasted-time': 'Wasted Time',
};

const DailyBreakdownChart = ({ selectedDate }: DailyBreakdownChartProps) => {
  const dateString = getDateString(selectedDate);

  const sessions = useLiveQuery(
    () => db.sessions.where('date').equals(dateString).toArray(),
    [dateString]
  );

  const chartData = useMemo(() => {
    if (!sessions?.length) return [];

    const categoryTotals: Record<string, number> = {};

    sessions.forEach((session) => {
      const duration = calculateDuration(session.startTime, session.endTime);
      if (duration > 0) {
        categoryTotals[session.category] = (categoryTotals[session.category] || 0) + duration;
      }
    });

    return Object.entries(categoryTotals).map(([category, value]) => ({
      name: categoryLabels[category] || category,
      value,
      color: categoryColors[category] || 'hsl(var(--muted))',
    }));
  }, [sessions]);

  const totalMinutes = chartData.reduce((acc, item) => acc + item.value, 0);

  if (!chartData.length) {
    return (
      <motion.div
        className="notion-card p-8 flex flex-col items-center justify-center min-h-[400px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="text-muted-foreground text-center">
          <p className="text-lg font-medium mb-2">No sessions recorded</p>
          <p className="text-sm">Add sessions in the Execution phase to see your daily breakdown</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="notion-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Daily Breakdown</h3>
        <p className="text-sm text-muted-foreground">
          Total tracked: {formatDuration(totalMinutes)}
        </p>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-notion-hover">
                      <p className="font-medium text-sm">{data.name}</p>
                      <p className="text-muted-foreground text-sm">{formatDuration(data.value)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
        {chartData.map((item, index) => (
          <motion.div
            key={item.name}
            className="p-3 rounded-lg bg-muted/30 border border-border/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.4 + index * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
            </div>
            <p className="text-lg font-semibold">{formatDuration(item.value)}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default DailyBreakdownChart;
