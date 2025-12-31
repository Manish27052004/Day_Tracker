
import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { CardDescription } from "@/components/ui/card";

interface AnalyticsChartProps {
    profileId: number | null;
    range: { from: Date; to: Date };
    data?: { date: string; percentage: number }[]; // Optional for now until wired up
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ profileId, range, data = [] }) => {

    // Generate empty data if none provided (for visual scaffolding)
    const chartData = useMemo(() => {
        if (data.length > 0) return data;

        // Mock data generator based on range
        const mock = [];
        const current = new Date(range.from);
        while (current <= range.to) {
            mock.push({
                date: format(current, "yyyy-MM-dd"),
                label: format(current, "MMM dd"),
                percentage: Math.floor(Math.random() * 100)
            });
            current.setDate(current.getDate() + 1);
        }
        return mock;
    }, [range, data]);

    if (!profileId) {
        return (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-md bg-muted/20">
                Select a profile to view analytics
            </div>
        );
    }

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(v) => format(new Date(v), "MMM dd")}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            fontSize: "12px"
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#8884d8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPv)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AnalyticsChart;
