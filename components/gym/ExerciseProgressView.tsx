import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { StorageService } from '../../services/storageService';
import { TrainingCycle, WorkoutSession } from '../../types';
import { getCycleState } from '../../services/cycleService';

interface ExerciseProgressViewProps {
    accountId: string;
    exerciseName: string;
    onBack: () => void;
}

// Colours each volume point by where its session fell in the cycle: amber during a deload week,
// blue during a building week — so deload dips read as intentional recovery, not lost progress.
function CycleDot(props: any) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const fill = payload?.isPreCycle ? '#94a3b8' : payload?.isDeload ? '#f59e0b' : '#2563eb';
    return (
        <circle
            cx={cx}
            cy={cy}
            r={4}
            fill={fill}
            stroke="#fff"
            strokeWidth={1.5}
        />
    );
}

export default function ExerciseProgressView({ accountId, exerciseName, onBack }: ExerciseProgressViewProps) {
    const [sessions, setSessions] = useState<WorkoutSession[]>([]);
    const [cycle, setCycle] = useState<TrainingCycle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = StorageService.subscribeWorkoutSessions(accountId, (loadedSessions) => {
            setSessions([...loadedSessions].sort((a, b) => a.startedAt - b.startedAt));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [accountId]);

    useEffect(() => {
        const unsubscribe = StorageService.subscribeTrainingCycle(accountId, setCycle);
        return () => unsubscribe();
    }, [accountId]);

    // Local midnight of the cycle's anchor date, so a session is judged "before the cycle" by
    // calendar day rather than by clock time.
    const cycleStartMs = useMemo(() => {
        if (!cycle) return null;
        const [y, m, d] = cycle.startDate.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d).getTime();
    }, [cycle]);

    const chartData = useMemo(() => {
        const points = sessions
            .map(session => {
                const exercise = session.exercisesCompleted?.find(item => item.exerciseName === exerciseName);
                if (!exercise) return null;
                // Where this session fell in the training cycle, so the trend can be read
                // per-cycle and deload weeks stand out. Sessions that predate the cycle's start are
                // "before cycle" — not folded into cycle 1 — so the first cycle's start is a real
                // boundary you can see, even when it was set retroactively.
                const sessionDate = new Date(session.startedAt);
                const sessionDayMs = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()).getTime();
                const isPreCycle = cycleStartMs != null && sessionDayMs < cycleStartMs;
                const state = cycle && !isPreCycle ? getCycleState(cycle, sessionDate) : null;
                return {
                    date: sessionDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                    totalVolume: exercise.totalVolume,
                    totalReps: exercise.totalReps,
                    unit: exercise.unit,
                    metric: exercise.metric,
                    sets: exercise.completedSets,
                    targetReps: exercise.targetReps,
                    dayName: session.dayName,
                    cycleNumber: state ? state.cycleNumber : null,
                    isDeload: state ? state.isDeloadWeek : false,
                    isPreCycle,
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
                cycleNumber: number | null;
                isDeload: boolean;
                isPreCycle: boolean;
            }>;
        return points;
    }, [sessions, exerciseName, cycle, cycleStartMs]);

    const hasPreCycle = useMemo(() => chartData.some(p => p.isPreCycle), [chartData]);

    // The date labels where a new cycle begins — a point whose cycle number differs from the one
    // before it, including the very first cycle's start emerging from pre-cycle history. Drawn as
    // vertical guides so cycle boundaries are visible in the trend.
    const cycleBoundaries = useMemo(() => {
        if (!cycle) return [] as Array<{ date: string; cycleNumber: number }>;
        const boundaries: Array<{ date: string; cycleNumber: number }> = [];
        for (let i = 1; i < chartData.length; i++) {
            const prev = chartData[i - 1].cycleNumber;
            const curr = chartData[i].cycleNumber;
            if (curr != null && curr !== prev) {
                boundaries.push({ date: chartData[i].date, cycleNumber: curr });
            }
        }
        return boundaries;
    }, [chartData, cycle]);

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
                        {/* Height set inline too — see MarkerGraph: a zero-height parent renders no chart. */}
                        <div className="h-80" style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip />
                                    {cycleBoundaries.map(boundary => (
                                        <ReferenceLine
                                            key={`cycle-${boundary.cycleNumber}-${boundary.date}`}
                                            x={boundary.date}
                                            stroke="#94a3b8"
                                            strokeDasharray="4 4"
                                            label={{ value: `Cycle ${boundary.cycleNumber}`, position: 'top', fontSize: 10, fill: '#64748b' }}
                                        />
                                    ))}
                                    <Line
                                        type="monotone"
                                        dataKey="totalVolume"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        dot={cycle ? <CycleDot /> : { r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {cycle && (
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 -mt-2">
                                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />Building week</span>
                                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Deload week</span>
                                {hasPreCycle && (
                                    <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />Before cycle</span>
                                )}
                                <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-slate-400" />New cycle</span>
                            </div>
                        )}

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
