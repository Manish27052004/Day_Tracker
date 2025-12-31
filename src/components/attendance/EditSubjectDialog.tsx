
import React, { useEffect, useState } from 'react';
import { Subject } from '@/lib/db';
import { addSubject, updateSubject } from '@/services/attendanceService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditSubjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subjectToEdit?: Subject;
    onSave: () => void;
}

const COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
];

export const EditSubjectDialog: React.FC<EditSubjectDialogProps> = ({ open, onOpenChange, subjectToEdit, onSave }) => {
    const [name, setName] = useState('');
    const [criteria, setCriteria] = useState(75);
    const [professor, setProfessor] = useState('');
    const [color, setColor] = useState({ name: 'Blue', value: '#3b82f6' });

    useEffect(() => {
        if (subjectToEdit) {
            setName(subjectToEdit.name);
            setCriteria(subjectToEdit.criteria);
            setProfessor(subjectToEdit.professor || '');
            const matchedColor = COLORS.find(c => c.value === subjectToEdit.color) || { name: 'Custom', value: subjectToEdit.color };
            setColor(matchedColor);
        } else {
            setName('');
            setCriteria(75);
            setProfessor('');
            setColor(COLORS[2]); // Default Blue
        }
    }, [subjectToEdit, open]);

    const handleSave = async () => {
        if (!name.trim()) return;

        if (subjectToEdit) {
            await updateSubject(subjectToEdit.id!, {
                name,
                criteria,
                professor,
                color: color.value
            });
        } else {
            await addSubject(name, criteria, color.value, professor);
        }
        onSave();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{subjectToEdit ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                    <DialogDescription>
                        Configure the subject details and attendance criteria.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. Mathematics"
                        />
                    </div>

                    {/* Criteria */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="criteria" className="text-right">
                            Criteria (%)
                        </Label>
                        <Input
                            id="criteria"
                            type="number"
                            value={criteria}
                            onChange={(e) => setCriteria(Number(e.target.value))}
                            className="col-span-3"
                            min={1}
                            max={100}
                        />
                    </div>

                    {/* Professor */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="prof" className="text-right">
                            Professor
                        </Label>
                        <Input
                            id="prof"
                            value={professor}
                            onChange={(e) => setProfessor(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional"
                        />
                    </div>

                    {/* Color */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Color</Label>
                        <div className="col-span-3 flex gap-2 flex-wrap">
                            {COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    type="button"
                                    className={cn(
                                        "w-6 h-6 rounded-full border border-gray-200 transition-all hover:scale-110",
                                        color.value === c.value ? "ring-2 ring-offset-2 ring-black dark:ring-white scale-110" : "opacity-80"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    onClick={() => setColor(c)}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Subject</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
