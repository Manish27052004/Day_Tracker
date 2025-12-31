
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { parseTimetableImage, TimetableResponse } from '@/services/geminiService';
import { addSubject } from '@/services/attendanceService';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

export const TimetableImporter = ({ onImportComplete }: { onImportComplete: () => void }) => {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'saving'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<TimetableResponse | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            toast({ title: "Configuration Error", description: "API Key not found in .env file. Please check VITE_GEMINI_API_KEY.", variant: "destructive" });
            return;
        }

        if (!file) {
            toast({ title: "Missing details", description: "Please upload an image.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const data = await parseTimetableImage(file, apiKey);
            setParsedData(data);
            setStep('preview');
        } catch (error) {
            toast({ title: "Analysis Failed", description: String(error), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!parsedData) return;
        setLoading(true);

        try {
            // 1. Create Subjects
            const subjectMap = new Map<string, number>(); // Name -> ID

            for (const sub of parsedData.subjects) {
                const id = await addSubject(sub.name, 75, sub.color || '#3b82f6', sub.professor);
                subjectMap.set(sub.name, id as number);
            }

            // 2. Create Schedule (Repeating Tasks)
            const dayMap: Record<string, number> = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };

            for (const item of parsedData.schedule) {
                const dayNum = dayMap[item.day];
                if (dayNum === undefined) continue;

                await db.repeatingTasks.add({
                    name: item.subject,
                    description: `${item.type} (${item.time})`,
                    repeatPattern: 'weekly',
                    repeatDays: [dayNum],
                    targetTime: 60, // Default 1 hour if calc fails
                    priority: 'Urgent & Important', // Default
                    isActive: true,
                    isDefault: false,
                    category: 'Deep Focus', // Default category
                    createdAt: new Date(),
                    minCompletionTarget: 75,
                    achieverStrike: 0,
                    fighterStrike: 0,
                    strikeCount: 0
                });
            }

            toast({ title: "Timetable Imported!", description: `Added ${parsedData.subjects.length} subjects and ${parsedData.schedule.length} classes.` });
            setOpen(false);
            onImportComplete();

        } catch (error) {
            console.error(error);
            toast({ title: "Save Failed", description: "Could not save data to database.", variant: "destructive" });
        } finally {
            setLoading(false);
            setStep('upload');
            setFile(null);
            setParsedData(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" /> Import Timetable
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Timetable with AI</DialogTitle>
                    <DialogDescription>
                        Upload an image of your timetable.
                    </DialogDescription>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="file">Timetable Image (PNG/JPG)</Label>
                            <Input id="file" type="file" accept="image/*" onChange={handleFileChange} />
                            <p className="text-xs text-muted-foreground">
                                Upload a clear image of your class schedule.
                            </p>
                        </div>
                    </div>
                )}

                {step === 'preview' && parsedData && (
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-3">
                                <h4 className="font-semibold mb-2">Subjects Found: {parsedData.subjects.length}</h4>
                                <ul className="text-sm list-disc pl-4 h-32 overflow-y-auto">
                                    {parsedData.subjects.map((s, i) => (
                                        <li key={i}>{s.name} <span className="text-muted-foreground text-xs">({s.professor || 'No Prof'})</span></li>
                                    ))}
                                </ul>
                            </Card>
                            <Card className="p-3">
                                <h4 className="font-semibold mb-2">Classes Found: {parsedData.schedule.length}</h4>
                                <ul className="text-sm list-disc pl-4 h-32 overflow-y-auto">
                                    {parsedData.schedule.map((s, i) => (
                                        <li key={i}><strong>{s.day}</strong>: {s.subject} ({s.time})</li>
                                    ))}
                                </ul>
                            </Card>
                        </div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded">
                            <AlertCircle className="inline h-4 w-4 mr-1" />
                            Double check the data above. AI can be imperfect.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === 'upload' && (
                        <Button onClick={handleAnalyze} disabled={loading || !file}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze Image"}
                        </Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Confirm Import"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
