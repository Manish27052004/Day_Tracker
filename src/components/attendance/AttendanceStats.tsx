
import React from 'react';
import { SubjectStats } from '@/services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AttendanceStatsProps {
    stats: SubjectStats[];
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ stats }) => {
    const totalClasses = stats.reduce((acc, curr) => acc + curr.totalClasses, 0);
    const totalAttended = stats.reduce((acc, curr) => acc + curr.attended, 0);
    const aggregatePercentage = totalClasses === 0 ? 100 : Math.round((totalAttended / totalClasses) * 100);

    const safeSubjects = stats.filter(s => s.status === 'safe').length;
    const dangerSubjects = stats.filter(s => s.status === 'danger').length;
    const warningSubjects = stats.filter(s => s.status === 'warning').length;

    const data = [
        { name: 'Safe', value: safeSubjects, color: '#22c55e' }, // green-500
        { name: 'Warning', value: warningSubjects, color: '#eab308' }, // yellow-500
        { name: 'Danger', value: dangerSubjects, color: '#ef4444' }, // red-500
    ].filter(d => d.value > 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{aggregatePercentage}%</div>
                    <p className="text-xs text-muted-foreground">
                        {totalAttended} of {totalClasses} classes attended
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={25}
                                outerRadius={35}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Safe Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">{safeSubjects}</div>
                    <p className="text-xs text-muted-foreground">Doing great!</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-500">{dangerSubjects}</div>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                </CardContent>
            </Card>
        </div>
    );
};
