
import React, { useEffect, useState } from 'react';
import { TimetableImporter } from '@/components/attendance/TimetableImporter';
import { SubjectStats, getDashboardStats, deleteSubject, markAttendance } from '@/services/attendanceService';
import { Subject } from '@/lib/db';
import { SubjectCard } from '@/components/attendance/SubjectCard';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { EditSubjectDialog } from '@/components/attendance/EditSubjectDialog';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getTodayIST } from '@/utils/dateUtils';


export default function AttendancePage() {
    const [stats, setStats] = useState<SubjectStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | undefined>(undefined);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const { toast } = useToast();

    const loadData = async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load attendance", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAddClick = () => {
        setEditingSubject(undefined);
        setIsDialogOpen(true);
    };

    const handleEditClick = (subject: Subject) => {
        setEditingSubject(subject);
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (deleteId) {
            await deleteSubject(deleteId);
            setDeleteId(null);
            loadData();
            toast({ title: "Subject deleted" });
        }
    };

    // Quick Action for Dashboard
    const markAllPresent = async () => {
        // Find all subjects that haven't been marked today?
        // For now, simpler implementation: just iterate all subjects and mark present
        // But maybe check if we already marked them? 
        // Let's keep it simple: UI Button "Mark All Present"
        const date = getTodayIST();
        await Promise.all(stats.map(s => markAttendance(s.subject.id!, 'present', date)));
        loadData();
        toast({ title: "Marked all as present!" });
    };

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance Manager</h1>
                    <p className="text-muted-foreground">Track your classes and keep your attendance stats healthy.</p>
                </div>
                <div className="flex gap-2">
                    <TimetableImporter onImportComplete={loadData} />
                    <Button variant="outline" onClick={markAllPresent} disabled={stats.length === 0}>
                        Mark All Present
                    </Button>
                    <Button onClick={handleAddClick}>
                        <Plus className="mr-2 h-4 w-4" /> Add Subject
                    </Button>
                </div>
            </div>

            <AttendanceStats stats={stats} />

            {loading ? (
                <div className="text-center py-10">Loading...</div>
            ) : stats.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">No subjects found</h3>
                    <p className="text-muted-foreground mb-4">Add your subjects to start tracking attendance.</p>
                    <Button onClick={handleAddClick}>
                        <Plus className="mr-2 h-4 w-4" /> Add First Subject
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.subject.id} className="relative group">
                            <SubjectCard
                                stats={stat}
                                onUpdate={loadData}
                                onEdit={handleEditClick}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(stat.subject.id!)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <EditSubjectDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                subjectToEdit={editingSubject}
                onSave={loadData}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the subject and all its attendance history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
