
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

import { AVAILABLE_COLORS } from '@/lib/colors';

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
            const matchedColor = AVAILABLE_COLORS.find(c => c.value === subjectToEdit.color) || { name: 'Custom', value: subjectToEdit.color };
            setColor(matchedColor);
        } else {
            setName('');
            setCriteria(75);
            setProfessor('');
            setColor(AVAILABLE_COLORS[10]); // Default Blue (index 10 in new list, check index!)
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
                            {AVAILABLE_COLORS.map((c) => (
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
