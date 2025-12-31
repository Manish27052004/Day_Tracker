
import React from 'react';
import { Subject } from '@/lib/db';
import { SubjectStats, markAttendance } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Ban, AlertTriangle, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SubjectCardProps {
    stats: SubjectStats;
    onUpdate: () => void;
    onEdit: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ stats, onUpdate, onEdit }) => {
    const { subject, percentage, totalClasses, attended, canBunk, mustAttend, status } = stats;

    const handleMark = async (status: 'present' | 'absent' | 'cancelled') => {
        await markAttendance(subject.id!, status);
        onUpdate();
    };

    const getStatusColor = () => {
        switch (status) {
            case 'safe': return 'text-green-500';
            case 'danger': return 'text-red-500';
            case 'warning': return 'text-yellow-500';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Card className="hover:shadow-lg transition-shadow border-l-4" style={{ borderLeftColor: subject.color }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        {subject.name}
                        <Badge variant="outline" className={cn("ml-2 font-mono", getStatusColor())}>
                            {percentage.toFixed(1)}%
                        </Badge>
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex gap-2">
                        <span>Target: {subject.criteria}%</span>
                        {subject.professor && <span>• Prof. {subject.professor}</span>}
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>

            <CardContent>
                <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <Progress value={percentage} className={cn("h-2", status === 'danger' ? "bg-red-100 dark:bg-red-950" : "")} indicatorClassName={status === 'danger' ? "bg-red-500" : (status === 'safe' ? "bg-green-500" : "bg-yellow-500")} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{attended} / {totalClasses} attended</span>
                        </div>
                    </div>

                    {/* Smart Insights */}
                    <div className="p-2 rounded-md bg-secondary/50 text-sm flex items-center gap-2">
                        {status === 'safe' && (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>You can safely bunk <strong>{canBunk}</strong> next classes.</span>
                            </>
                        )}
                        {status === 'danger' && (
                            <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span>You must attend <strong>{mustAttend}</strong> next classes!</span>
                            </>
                        )}
                        {status === 'warning' && (
                            <>
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <span>Careful! Only {canBunk} bunk(s) left.</span>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <Button variant="outline" size="sm" className="hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/30" onClick={() => handleMark('present')}>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Present
                        </Button>
                        <Button variant="outline" size="sm" className="hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30" onClick={() => handleMark('absent')}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Absent
                        </Button>
                        <Button variant="ghost" size="sm" className="opacity-70" onClick={() => handleMark('cancelled')}>
                            <Ban className="mr-2 h-4 w-4" /> No Class
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
