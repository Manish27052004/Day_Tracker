
import { db, Subject, AttendanceRecord } from '@/lib/db';
import { getTodayIST } from '@/utils/dateUtils';

export interface SubjectStats {
    subject: Subject;
    totalClasses: number;
    attended: number;
    percentage: number;
    canBunk: number; // How many classes you can miss and stay above criteria
    mustAttend: number; // How many classes you MUST attend to reach criteria
    status: 'safe' | 'danger' | 'warning';
}

/**
 * Subject Management
 */
export const addSubject = async (
    name: string,
    criteria: number,
    color: string,
    professor?: string
) => {
    return await db.subjects.add({
        name,
        criteria,
        color,
        professor,
        syncStatus: 'pending',
        userId: 'local'
    });
};

export const updateSubject = async (
    id: number,
    updates: Partial<Subject>
) => {
    return await db.subjects.update(id, {
        ...updates,
        syncStatus: 'pending'
    });
};

export const deleteSubject = async (id: number) => {
    await db.attendanceRecords.where({ subjectId: id }).delete();
    return await db.subjects.delete(id);
};

export const getAllSubjects = async () => {
    return await db.subjects.toArray();
};

/**
 * Attendance Marking
 */
export const markAttendance = async (
    subjectId: number,
    status: 'present' | 'absent' | 'cancelled',
    date: string = getTodayIST()
) => {
    // Check if record exists for this date
    const existing = await db.attendanceRecords
        .where({ subjectId, date })
        .first();

    if (existing) {
        if (existing.status === status) return; // No change
        await db.attendanceRecords.update(existing.id!, {
            status,
            syncStatus: 'pending'
        });
    } else {
        await db.attendanceRecords.add({
            subjectId,
            date,
            status,
            syncStatus: 'pending',
            userId: 'local'
        });
    }
};

export const getAttendanceForDate = async (date: string) => {
    return await db.attendanceRecords.where({ date }).toArray();
};

/**
 * Stats & calculations
 */
export const getSubjectStats = async (subject: Subject): Promise<SubjectStats> => {
    const records = await db.attendanceRecords
        .where({ subjectId: subject.id! })
        .toArray();

    const validRecords = records.filter(r => r.status !== 'cancelled');
    const totalClasses = validRecords.length;
    const attended = validRecords.filter(r => r.status === 'present').length;

    const percentage = totalClasses === 0 ? 100 : (attended / totalClasses) * 100;

    // Bunk Calculation (simplified)
    // Formula: (Attended) / (Total + X) >= Criteria
    // Solve for X (max bunks)
    const currentCriteria = subject.criteria / 100;

    // How many more classes can I miss? 
    // (A) / (T + x) >= C  =>  A >= C(T + x)  => A/C >= T + x => x <= A/C - T
    let canBunk = 0;
    if (percentage >= subject.criteria) {
        canBunk = Math.floor((attended / currentCriteria) - totalClasses);
    }

    // How many must I attend?
    // (A + x) / (T + x) >= C  => A + x >= CT + Cx => x(1 - C) >= CT - A => x >= (CT - A) / (1 - C)
    let mustAttend = 0;
    if (percentage < subject.criteria) {
        const numerator = (currentCriteria * totalClasses) - attended;
        const denominator = 1 - currentCriteria;
        mustAttend = Math.ceil(numerator / denominator);
    }

    let status: SubjectStats['status'] = 'safe';
    if (percentage < subject.criteria) status = 'danger';
    else if (percentage < subject.criteria + 5) status = 'warning'; // Close to edge

    return {
        subject,
        totalClasses,
        attended,
        percentage,
        canBunk,
        mustAttend,
        status
    };
};

export const getDashboardStats = async () => {
    const subjects = await getAllSubjects();
    const stats = await Promise.all(subjects.map(s => getSubjectStats(s)));
    return stats;
};
