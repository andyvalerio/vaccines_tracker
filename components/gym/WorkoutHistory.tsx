import React, { useState, useEffect } from 'react';
import { WorkoutSession } from '../../types';
import { getWorkoutSessions, deleteWorkoutSession } from '../../services/gymService';

export default function WorkoutHistory({ onBack }: { onBack: () => void }) {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const s = await getWorkoutSessions();
            // Sort descending (newest first)
            s.sort((a, b) => b.startedAt - a.startedAt);
            setSessions(s);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this session?")) {
            await deleteWorkoutSession(id);
            loadSessions();
        }
    };

    // Group sessions by month/year for a simple calendar-list view
    const groupedSessions = sessions.reduce((acc, session) => {
        const date = new Date(session.startedAt);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(session);
        return acc;
    }, {} as Record<string, WorkoutSession[]>);

    if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading history...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <button onClick={onBack} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                <h2 className="text-lg font-bold text-slate-800">Workout History</h2>
                <div className="w-12"></div> {/* Spacer for centering */}
            </div>

            <div className="p-6">
                {Object.keys(groupedSessions).length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 font-medium">
                        No workouts completed yet.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedSessions).map(([month, monthSessions]) => (
                            <div key={month} className="space-y-4">
                                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 text-lg">{month}</h3>

                                <div className="space-y-3">
                                    {monthSessions.map(s => {
                                        const date = new Date(s.startedAt);
                                        const durationStr = s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) + ' min' : 'Ongoing';

                                        return (
                                            <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 text-blue-700 font-bold w-12 h-12 rounded-xl flex flex-col items-center justify-center border border-blue-100">
                                                            <span className="text-sm leading-none">{date.getDate()}</span>
                                                            <span className="text-[10px] uppercase">{date.toLocaleString('default', { weekday: 'short' })}</span>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-base">{s.dayName}</div>
                                                            <div className="text-xs text-slate-500 font-medium">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {durationStr}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete Session">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {s.exercisesCompleted && s.exercisesCompleted.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                                        {s.exercisesCompleted.map((ec, idx) => (
                                                            <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase">
                                                                {ec.exerciseName} <span className="opacity-50">x{ec.reps}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
