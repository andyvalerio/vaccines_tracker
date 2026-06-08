import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '../../services/storageService';
import { WorkoutSession } from '../../types';

interface WorkoutHistoryProps {
    accountId: string;
    onBack: () => void;
    onOpenExerciseProgress: (exerciseName: string) => void;
}

const localDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const startOfMonth = (date: Date) => {
    const next = new Date(date.getFullYear(), date.getMonth(), 1);
    next.setHours(0, 0, 0, 0);
    return next;
};

const endOfMonth = (date: Date) => {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    next.setHours(23, 59, 59, 999);
    return next;
};

const startOfCalendarWeek = (date: Date) => {
    const next = new Date(date);
    const day = next.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    next.setDate(next.getDate() + diff);
    next.setHours(0, 0, 0, 0);
    return next;
};

const addDays = (date: Date, amount: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
};

export default function WorkoutHistory({ accountId, onBack, onOpenExerciseProgress }: WorkoutHistoryProps) {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = StorageService.subscribeWorkoutSessions(accountId, (loadedSessions) => {
            setSessions([...loadedSessions].sort((a, b) => b.startedAt - a.startedAt));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [accountId]);

    const currentMonth = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    }, [monthOffset]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthSessions = useMemo(() => {
        return sessions.filter(session => {
            const date = new Date(session.startedAt);
            return date >= monthStart && date <= monthEnd;
        });
    }, [sessions, monthStart, monthEnd]);

    const sessionsByDate = useMemo(() => {
        const map = new Map<string, WorkoutSession[]>();
        monthSessions.forEach(session => {
            const key = localDateKey(new Date(session.startedAt));
            const existing = map.get(key) || [];
            existing.push(session);
            map.set(key, existing);
        });
        return map;
    }, [monthSessions]);

    const weeks = useMemo(() => {
        const firstGridDay = startOfCalendarWeek(monthStart);
        const rows: Array<Array<{ date: Date; inMonth: boolean; sessions: WorkoutSession[] }>> = [];
        let cursor = new Date(firstGridDay);

        while (cursor <= monthEnd || cursor.getDay() !== 1 || rows.length === 0) {
            const row = Array.from({ length: 7 }).map((_, index) => {
                const date = addDays(cursor, index);
                const key = localDateKey(date);
                return {
                    date,
                    inMonth: date.getMonth() === currentMonth.getMonth(),
                    sessions: sessionsByDate.get(key) || []
                };
            });
            rows.push(row);
            cursor = addDays(cursor, 7);
            if (cursor > monthEnd && cursor.getMonth() !== currentMonth.getMonth() && cursor.getDay() === 1) {
                break;
            }
        }

        return rows;
    }, [currentMonth, monthEnd, monthStart, sessionsByDate]);

    const selectedDateSessions = useMemo(() => {
        if (!selectedDateKey) return [];
        return sessions.filter(session => localDateKey(new Date(session.startedAt)) === selectedDateKey);
    }, [sessions, selectedDateKey]);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this session?')) {
            await StorageService.deleteWorkoutSession(accountId, id);
        }
    };

    if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading history...</div>;

    if (selectedDateKey) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <button onClick={() => setSelectedDateKey(null)} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                    <h2 className="text-lg font-bold text-slate-800">{selectedDateKey}</h2>
                    <div className="w-12"></div>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Workout Details</h3>
                        <p className="text-slate-500 text-sm">Pick any exercise below to open its progress page.</p>
                    </div>

                    {selectedDateSessions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            No saved sessions for this day.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {selectedDateSessions.map(session => {
                                const durationStr = session.endedAt ? `${Math.round((session.endedAt - session.startedAt) / 60000)} min` : 'Ongoing';
                                return (
                                    <div key={session.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div>
                                                <div className="font-bold text-slate-900 text-lg">{session.dayName}</div>
                                                <div className="text-sm text-slate-500">{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {durationStr}</div>
                                            </div>
                                            <button onClick={() => handleDelete(session.id)} className="px-3 py-1.5 text-red-600 font-medium bg-red-50 rounded-lg hover:bg-red-100">Delete</button>
                                        </div>

                                        <div className="grid gap-3">
                                            {session.exercisesCompleted?.map((exercise, index) => (
                                                <button
                                                    key={`${session.id}-${exercise.exerciseId}-${index}`}
                                                    onClick={() => onOpenExerciseProgress(exercise.exerciseName)}
                                                    className="text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <div className="font-semibold text-slate-900">{exercise.exerciseName}</div>
                                                            <div className="text-xs text-slate-500 mt-1">{exercise.completedSets} sets • {exercise.totalReps} reps</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-slate-800">{exercise.totalVolume} {exercise.unit}</div>
                                                            <div className="text-[10px] uppercase tracking-widest text-slate-400">Progress</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <button onClick={onBack} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                <h2 className="text-lg font-bold text-slate-800">Workout History</h2>
                <div className="w-12"></div>
            </div>

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Monthly Calendar</h3>
                        <p className="text-slate-500 text-sm">Month by month, with the weeks stacked vertically and a simple trained or not-trained signal.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setMonthOffset(monthOffset - 1)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold">Prev Month</button>
                        <button onClick={() => setMonthOffset(0)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold">This Month</button>
                        <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold disabled:opacity-40">Next Month</button>
                    </div>
                </div>

                <div className="text-2xl font-extrabold text-slate-900">{currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>

                <div className="space-y-3">
                    <div className="grid grid-cols-7 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                    </div>

                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-2">
                            {week.map(day => {
                                const trained = day.sessions.length > 0;
                                const dateKey = localDateKey(day.date);
                                const totalMins = trained
                                    ? Math.round(day.sessions.reduce((sum, s) => sum + (s.endedAt - s.startedAt), 0) / 60000)
                                    : 0;
                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => setSelectedDateKey(dateKey)}
                                        className={`rounded-2xl border p-3 min-h-[96px] text-left transition-colors ${day.inMonth ? 'bg-white' : 'bg-slate-50'} ${trained ? 'border-emerald-200 hover:bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className={`text-xs font-bold ${day.inMonth ? 'text-slate-900' : 'text-slate-400'}`}>{day.date.getDate()}</div>
                                        {trained && (
                                            <div className="mt-2 flex flex-col items-start gap-0.5">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">✓</span>
                                                {totalMins > 0 && <span className="text-[10px] font-semibold text-emerald-600 leading-tight">{totalMins}m</span>}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
