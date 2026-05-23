import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { StorageService } from '../../services/storageService';
import { WorkoutSession } from '../../types';

interface ExerciseProgressViewProps {
    accountId: string;
    exerciseName: string;
    onBack: () => void;
}

export default function ExerciseProgressView({ accountId, exerciseName, onBack }: ExerciseProgressViewProps) {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = StorageService.subscribeWorkoutSessions(accountId, (loadedSessions) => {
            setSessions([...loadedSessions].sort((a, b) => a.startedAt - b.startedAt));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [accountId]);

    const chartData = useMemo(() => {
        return sessions
            .map(session => {
                const exercise = session.exercisesCompleted?.find(item => item.exerciseName === exerciseName);
                if (!exercise) return null;
                return {
                    date: new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    totalVolume: exercise.totalVolume,
                    totalReps: exercise.totalReps,
                    unit: exercise.unit,
                    metric: exercise.metric,
                    sets: exercise.completedSets,
                    targetReps: exercise.targetReps,
                    dayName: session.dayName
                };
            })
            .filter(Boolean) as Array<{
                date: string;
                totalVolume: number;
                totalReps: number;
                unit: string;
                metric: 'weight' | 'duration';
                sets: number;
                targetReps: number;
                dayName: string;
            }>;
    }, [sessions, exerciseName]);

    if (loading) return <div className="p-4 text-slate-500 animate-pulse">Loading progress...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <button onClick={onBack} className="text-blue-600 font-medium hover:text-blue-700">&larr; Back</button>
                <h2 className="text-lg font-bold text-slate-800">{exerciseName}</h2>
                <div className="w-12"></div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">Exercise Progress</h3>
                    <p className="text-slate-500 text-sm">A separate place for this exercise only, without mixing it into the calendar.</p>
                </div>

                {chartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No saved history for this exercise yet.
                    </div>
                ) : (
                    <>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="totalVolume" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {chartData.slice().reverse().slice(0, 6).map(point => (
                                <div key={`${point.date}-${point.dayName}-${point.totalVolume}`} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{point.date}</div>
                                    <div className="font-bold text-slate-900">{point.dayName}</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        {point.metric === 'duration' ? `${point.totalVolume} ${point.unit}` : `${point.totalVolume} ${point.unit}`}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{point.sets} sets • {point.totalReps} reps</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
